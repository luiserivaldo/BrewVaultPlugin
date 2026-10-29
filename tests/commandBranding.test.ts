import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync("src/main.ts", "utf8");
const readme = readFileSync("README.md", "utf8");

void test("user-facing preview and PDF commands use BrewVault branding", () => {
	assert.doesNotMatch(mainSource, /"(?:Open|Export)[^"]*Homebrewery[^"]*"/);
	assert.match(mainSource, /"Open preview"/);
	assert.match(mainSource, /"Export current file as BrewVault PDF"/);
	assert.doesNotMatch(mainSource, /PDF \(experimental\)/);
	assert.doesNotMatch(readme, /\*\*(?:Open|Export)[^*]*Homebrewery[^*]*\*\*/);
});

void test("the generic BrewVault PDF command resolves the selected theme", () => {
	assert.match(
		mainSource,
		/"export-current-file-as-pdf",\s*"Export current file as BrewVault PDF"\s*\)/
	);
	assert.match(
		mainSource,
		/this\.renderExportDocument\(file, \{\s*theme: themeOverride,?\s*\}\)/
	);
	assert.match(mainSource, /theme: this\.settings\.theme,/);
	assert.match(mainSource, /this\.getThemeCss\(options\.theme\)/);
});

void test("method-specific PDF commands are registered only on mobile", () => {
	const mobileBlock = /if \(platform === "mobile"\) \{([\s\S]*?)\n\t\t\}/.exec(mainSource)?.[1] ?? "";
	assert.match(mobileBlock, /"export-current-file-as-pdf-mobile-browser",\s*"Export current file as BrewVault PDF via browser",\s*undefined,\s*"browser"/);
	assert.match(mobileBlock, /"export-current-file-as-pdf-mobile-direct",\s*"Export current file as BrewVault PDF directly \(image pages\)",\s*undefined,\s*"native"/);
	assert.equal(mainSource.match(/export-current-file-as-pdf-mobile-/g)?.length, 2);
	const commandsGuide = readFileSync("docs/guide/commands.md", "utf8");
	assert.match(commandsGuide, /\*\*Export current file as BrewVault PDF via browser\*\*/);
	assert.match(commandsGuide, /\*\*Export current file as BrewVault PDF directly \(image pages\)\*\*/);
});
