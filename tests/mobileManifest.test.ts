import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface PluginManifest {
	readonly isDesktopOnly?: unknown;
	readonly minAppVersion?: unknown;
}

void test("the Phase 2 package can be loaded for controlled mobile validation", () => {
	const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as PluginManifest;

	assert.equal(manifest.isDesktopOnly, false);
	assert.equal(manifest.minAppVersion, "1.7.2");
});
