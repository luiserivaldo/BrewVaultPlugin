import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync("src/main.ts", "utf8");
const readme = readFileSync("README.md", "utf8");

void test("user-facing preview and PDF commands use BrewVault branding", () => {
	assert.doesNotMatch(mainSource, /"(?:Open|Export)[^"]*Homebrewery[^"]*"/);
	assert.match(mainSource, /"Open preview"/);
	assert.match(mainSource, /"Export current file as BrewVault PDF"/);
	assert.doesNotMatch(readme, /\*\*(?:Open|Export)[^*]*Homebrewery[^*]*\*\*/);
});

void test("the generic BrewVault PDF command resolves the selected theme", () => {
	assert.match(
		mainSource,
		/"export-current-file-as-pdf",\s*"Export current file as BrewVault PDF"\s*\)/
	);
	assert.match(mainSource, /const theme = themeOverride \?\? this\.settings\.theme;/);
	assert.match(mainSource, /this\.getThemeCss\(theme\)/);
});
