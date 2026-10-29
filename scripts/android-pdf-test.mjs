// Development-only loop: push the current build to an adb-connected Android
// device, drive Obsidian through its WebView DevTools socket, run a BrewVault
// PDF export, and pull the result back for inspection.
//
// Usage:
//   node scripts/android-pdf-test.mjs [--device host:port] [--vault Name]
//     [--note "path/in/vault.md"] [--theme phb|dmg|srd|blank]
//     [--method native|browser] [--out dir] [--no-push] [--bring-to-front 1]
//
// Requires adb, a device already connected (`adb connect`), and Obsidian open
// on the target vault. The setting change is applied in memory only; the
// device's data.json is never written by this script.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { get } from "node:http";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

function print(text) {
	process.stdout.write(`${text}\n`);
}

function getJson(url) {
	return new Promise((done, fail) => {
		get(url, (response) => {
			let body = "";
			response.on("data", (chunk) => (body += chunk));
			response.on("end", () => done(JSON.parse(body)));
		}).on("error", fail);
	});
}

const args = parseArgs(process.argv.slice(2));
const device = args.device ?? process.env.ANDROID_SERIAL ?? firstDevice();
const vault = args.vault ?? "TheBigVaultOfDnD";
const theme = args.theme ?? "phb";
const method = args.method ?? "native";
const outDir = resolve(args.out ?? "android-test-output");
const pluginDir = `/sdcard/Documents/${vault}/.obsidian/plugins/brewvault`;
const PORT = 9333;

function parseArgs(argv) {
	const parsed = {};
	for (let index = 0; index < argv.length; index++) {
		const key = argv[index].replace(/^--/, "");
		if (key.startsWith("no-")) parsed[key.slice(3)] = false;
		else parsed[key] = argv[++index];
	}
	return parsed;
}

function adb(...command) {
	return execFileSync("adb", ["-s", device, ...command], { encoding: "utf8" }).trim();
}

function firstDevice() {
	const line = execFileSync("adb", ["devices"], { encoding: "utf8" })
		.split("\n")
		.find((row) => /\tdevice$/.test(row));
	if (!line) throw new Error("No adb device is connected. Run `adb connect host:port` first.");
	return line.split("\t")[0];
}

function step(message) {
	print(`• ${message}`);
}

// --- 1. Push the current build -------------------------------------------
if (args.push !== false) {
	step(`pushing main.js, manifest.json, styles.css to ${vault}`);
	for (const file of ["main.js", "manifest.json", "styles.css"]) {
		adb("push", file, `${pluginDir}/${file}`);
	}
}

// --- 2. Attach to Obsidian's WebView --------------------------------------
// Android pauses a backgrounded WebView, which would freeze the export mid-run.
if (args["bring-to-front"] !== undefined) {
	adb("shell", "monkey", "-p", "md.obsidian", "-c", "android.intent.category.LAUNCHER", "1");
	await sleep(2000);
}
const foreground = adb("shell", "dumpsys activity activities | grep topResumedActivity");
if (!foreground.includes("md.obsidian")) {
	throw new Error(
		"Obsidian is not the foreground app, so Android has paused it. Open Obsidian on the " +
			"device (and keep the screen on), or rerun with --bring-to-front 1."
	);
}
const pid = adb("shell", "pidof", "md.obsidian");
if (!pid) throw new Error("Obsidian is not running on the device.");
const socket = `webview_devtools_remote_${pid.split(/\s+/)[0]}`;
adb("forward", `tcp:${PORT}`, `localabstract:${socket}`);
const targets = await getJson(`http://127.0.0.1:${PORT}/json`);
const page = targets.find((target) => target.type === "page" && target.url.startsWith("http://localhost"));
if (!page) throw new Error("Obsidian's main WebView page was not found.");
step(`attached to "${page.title}"`);

const cdp = await connect(page.webSocketDebuggerUrl);
const consoleLines = [];
cdp.on("Runtime.consoleAPICalled", ({ type, args: values }) => {
	const text = values.map((value) => value.value ?? value.description ?? "").join(" ");
	if (/brewvault/i.test(text) || type === "error") consoleLines.push(`[${type}] ${text}`);
});
cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
	consoleLines.push(`[exception] ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
});
await cdp.send("Runtime.enable");

// --- 3. Reload the plugin and export --------------------------------------
step(`reloading BrewVault and exporting (${theme}, ${method})`);
const result = await evaluate(`(async () => {
	const app = window.app;
	await app.plugins.disablePlugin("brewvault");
	await app.plugins.enablePlugin("brewvault");
	const plugin = app.plugins.plugins.brewvault;
	if (!plugin) throw new Error("BrewVault did not load after reload.");

	const note = ${JSON.stringify(args.note ?? null)};
	const file = note ? app.vault.getAbstractFileByPath(note) : app.workspace.getActiveFile();
	if (!file || file.extension !== "md") throw new Error("No Markdown note to export: " + note);

	plugin.settings.mobilePdfMethod = ${JSON.stringify(method)};
	const folder = plugin.settings.exportFolder;
	const before = new Set(app.vault.getFiles().map((f) => f.path));
	const memoryBefore = performance.memory?.usedJSHeapSize ?? null;
	// Timestamp each stage by wrapping the instance's pagination step and the
	// backend's export (including its per-page progress callback).
	const marks = [];
	const mark = (label) => marks.push([label, Math.round(performance.now() - started)]);
	const paginate = plugin.paginateWithTheme;
	plugin.paginateWithTheme = async function (...input) {
		mark("paginate start");
		try { return await paginate.apply(this, input); } finally { mark("paginate end"); }
	};
	const backend = await plugin.getExportBackendProvider().getBackend();
	const backendExport = backend.export;
	backend.export = async function (request) {
		mark("render start (" + (request.html.length / 1e6).toFixed(1) + " MB html)");
		const onProgress = request.onProgress;
		try {
			return await backendExport.call(this, {
				...request,
				onProgress: (done, total) => { mark("page " + done + "/" + total); onProgress?.(done, total); },
			});
		} finally { mark("render end"); }
	};

	const started = performance.now();
	try {
		await plugin.exportFileAsPdf(file, ${JSON.stringify(theme)});
	} finally {
		plugin.paginateWithTheme = paginate;
		backend.export = backendExport;
	}
	const ms = Math.round(performance.now() - started);
	const created = app.vault.getFiles()
		.filter((f) => !before.has(f.path) && f.path.startsWith(folder + "/"))
		.map((f) => ({ path: f.path, size: f.stat.size }));
	return {
		// Obsidian caches manifests until restart, so report the setting the
		// new build introduced rather than a possibly stale version string.
		hasMobilePdfMethod: "mobilePdfMethod" in plugin.settings,
		note: file.path,
		ms,
		marks: marks.map(([label, at]) => at + " ms  " + label),
		created,
		heapMB: memoryBefore === null ? null : Math.round((performance.memory.usedJSHeapSize - memoryBefore) / 1e6),
	};
})()`);
print(JSON.stringify(result, null, 2));
print(`device main.js sha256: ${adb("shell", "sha256sum", `${pluginDir}/main.js`).split(/\s+/)[0]}`);

// --- 4. Pull and inspect ---------------------------------------------------
mkdirSync(outDir, { recursive: true });
for (const created of result.created) {
	const local = join(outDir, created.path.split("/").pop());
	adb("pull", `/sdcard/Documents/${vault}/${created.path}`, local);
	step(`pulled ${local}`);
	if (local.endsWith(".pdf")) {
		try {
			print(execFileSync("pdfinfo", [local], { encoding: "utf8" })
				.split("\n").filter((line) => /^(Pages|Page size|Title|File size)/.test(line)).join("\n"));
			execFileSync("pdftoppm", ["-r", "50", "-png", local, local.replace(/\.pdf$/, "")]);
		} catch (error) {
			print(`pdfinfo/pdftoppm failed: ${error.message}`);
		}
	}
}

if (consoleLines.length > 0) {
	print("\nConsole output during the run:");
	for (const line of consoleLines) print(`  ${line}`);
}
cdp.close();
adb("forward", "--remove", `tcp:${PORT}`);

async function evaluate(expression) {
	const response = await cdp.send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
		timeout: 600_000,
	});
	if (response.exceptionDetails) {
		throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
	}
	return response.result.value;
}

function connect(url) {
	return new Promise((resolveSocket, reject) => {
		const ws = new WebSocket(url);
		const pending = new Map();
		const listeners = new Map();
		let nextId = 1;
		ws.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
			if (message.id && pending.has(message.id)) {
				const { resolve: done, reject: fail } = pending.get(message.id);
				pending.delete(message.id);
				if (message.error) fail(new Error(message.error.message));
				else done(message.result);
			} else if (message.method) {
				listeners.get(message.method)?.(message.params);
			}
		});
		ws.addEventListener("error", () => reject(new Error(`Could not open ${url}`)));
		ws.addEventListener("open", () =>
			resolveSocket({
				send: (method, params = {}) =>
					new Promise((done, fail) => {
						const id = nextId++;
						pending.set(id, { resolve: done, reject: fail });
						ws.send(JSON.stringify({ id, method, params }));
					}),
				on: (method, listener) => listeners.set(method, listener),
				close: () => ws.close(),
			})
		);
	});
}
