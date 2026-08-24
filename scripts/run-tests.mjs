import { readdir, rm, mkdtemp } from "node:fs/promises";
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

try {
	await esbuild.build({
		entryPoints: testFiles,
		bundle: true,
		format: "cjs",
		outdir: outputDir,
		platform: "node",
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
