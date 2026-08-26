import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

const SOURCE_ROOT = join(process.cwd(), "src");
const NODE_BUILTIN_IMPORT = /(?:from\s+|import\s*\()(["'])(?:node:)?(?:assert|buffer|child_process|cluster|crypto|dgram|dns|events|fs|http|https|module|net|os|path|perf_hooks|process|querystring|readline|stream|string_decoder|timers|tls|tty|url|util|v8|vm|worker_threads|zlib)(?:\/[^"']*)?\1/;
const ELECTRON_PACKAGE_IMPORT = /(?:from\s+|import\s*\()(["'])electron\1/;
const DESKTOP_BOUNDARY_IMPORT = /(?:from\s+|import\s*\()(["'])[^"']*(?:desktop|electron)\/[^"']*\1/;

void test("runtime source contains no Node built-in imports", async () => {
	for (const file of await collectTypeScriptFiles(SOURCE_ROOT)) {
		const source = await readFile(file, "utf8");
		assert.doesNotMatch(source, NODE_BUILTIN_IMPORT, relative(SOURCE_ROOT, file));
	}
});

void test("Electron package imports stay out of the runtime graph", async () => {
	for (const file of await collectTypeScriptFiles(SOURCE_ROOT)) {
		const source = await readFile(file, "utf8");
		assert.doesNotMatch(source, ELECTRON_PACKAGE_IMPORT, relative(SOURCE_ROOT, file));
	}
});

void test("shared startup has no static desktop or Electron adapter import", async () => {
	const mainSource = await readFile(join(SOURCE_ROOT, "main.ts"), "utf8");
	assert.doesNotMatch(mainSource, DESKTOP_BOUNDARY_IMPORT);
	assert.doesNotMatch(mainSource, /ElectronPdfExporter/);

	const providerSource = await readFile(
		join(SOURCE_ROOT, "platform", "createBackendProvider.ts"),
		"utf8"
	);
	assert.match(
		providerSource,
		/await import\(\s*["']\.\.\/desktop\/DesktopPdfBackend["']\s*\)/
	);
});

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectTypeScriptFiles(path)));
		} else if (entry.isFile() && entry.name.endsWith(".ts")) {
			files.push(path);
		}
	}
	return files;
}
