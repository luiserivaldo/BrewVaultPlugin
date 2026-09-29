import { readdir, rm, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import esbuild from "esbuild";

const testDir = join(process.cwd(), "tests");
const testFiles = (await readdir(testDir))
	.filter((file) => file.endsWith(".test.ts"))
	.map((file) => join(testDir, file));

if (testFiles.length === 0) {
	throw new Error("No BrewVault test files were found.");
}

const outputDir = await mkdtemp(join(tmpdir(), "brewvault-tests-"));

const nativePdfAssetsModulePlugin = {
	name: "brewvault-native-pdf-assets-test-module",
	setup(build) {
		build.onResolve({ filter: /^virtual:brewvault-native-pdf-assets$/ }, () => ({
			path: "native-pdf-assets",
			namespace: "brewvault-native-pdf-assets",
		}));
		build.onLoad(
			{ filter: /.*/, namespace: "brewvault-native-pdf-assets" },
			async () => {
				const asDataUrl = async (path) =>
					`data:image/jpeg;base64,${(await readFile(path)).toString("base64")}`;
				const asBase64 = async (path) => (await readFile(path)).toString("base64");
				return {
					contents: [
						`export const PHB_PARCHMENT_BACKGROUND = ${JSON.stringify(
							await asDataUrl("vendor/homebrewery/assets/parchmentBackground.jpg")
						)};`,
						`export const DMG_BACKGROUND = ${JSON.stringify(
							await asDataUrl("vendor/homebrewery/assets/DMG_background.jpg")
						)};`,
						`export const NATIVE_PDF_FONT_FILES = ${JSON.stringify({
							"BookInsanity.woff2": await asBase64("vendor/homebrewery/fonts/5e/Bookinsanity.woff2"),
							"BookInsanity Bold.woff2": await asBase64("vendor/homebrewery/fonts/5e/Bookinsanity Bold.woff2"),
							"BookInsanity Italic.woff2": await asBase64("vendor/homebrewery/fonts/5e/Bookinsanity Italic.woff2"),
							"BookInsanity Bold Italic.woff2": await asBase64("vendor/homebrewery/fonts/5e/Bookinsanity Bold Italic.woff2"),
							"Mr Eaves Small Caps.woff2": await asBase64("vendor/homebrewery/fonts/5e/Mr Eaves Small Caps.woff2"),
						})};`,
					].join("\n"),
					loader: "js",
				};
			}
		);
	},
};

try {
	await esbuild.build({
		entryPoints: testFiles,
		bundle: true,
		format: "cjs",
		outdir: outputDir,
		platform: "node",
		plugins: [nativePdfAssetsModulePlugin],
		sourcemap: "inline",
		target: "node20",
	});

	const compiledTests = (await readdir(outputDir))
		.filter((file) => file.endsWith(".test.js"))
		.map((file) => join(outputDir, file));
	const result = spawnSync(process.execPath, ["--test", ...compiledTests], {
		stdio: "inherit",
	});

	if (result.error) throw result.error;
	if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
	await rm(outputDir, { recursive: true, force: true });
}
