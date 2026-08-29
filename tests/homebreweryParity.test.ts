import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ELECTRON_PDF_PRINT_OPTIONS } from "../src/electron/ElectronPdfExporter";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";
import { renderBrewMarkdown } from "../src/renderer";

const fixture = readFileSync("tests/fixtures/homebrewery-parity.md", "utf8");
const phbThemeCss = readFileSync("styles/homebrewery/5e-phb.css", "utf8");
const dmgThemeCss = readFileSync("styles/homebrewery/5e-dmg.css", "utf8");

void test("parity fixture emits Homebrewery semantic component classes", () => {
	const html = renderBrewMarkdown(fixture).map((page) => page.html).join("\n");
	for (const className of ["note", "descriptive", "classTable", "monster", "wide", "columnSplit"]) {
		assert.match(html, new RegExp(`class="[^"]*\\b${className}\\b`));
	}
});

void test("standalone pages use the Homebrewery page DOM contract", () => {
	const html = buildStandaloneHtml(
		renderBrewMarkdown(fixture),
		"phb",
		"/* fixture */",
		"Parity Fixture",
		816,
		1056
	);

	assert.match(html, /class="page brewPage">\s*<div class="columnWrapper">/);
	assert.match(html, /class="pageNumber brewPageNumber">1<\/div>/);
	assert.match(html, /brewvault-theme-blank brewvault-theme-phb/);
});

void test("Electron printing preserves Homebrewery CSS page geometry", () => {
	assert.deepEqual(ELECTRON_PDF_PRINT_OPTIONS, {
		displayHeaderFooter: false,
		landscape: false,
		margins: { top: 0, bottom: 0, left: 0, right: 0 },
		pageSize: "Letter",
		preferCSSPageSize: true,
		printBackground: true,
	});
});

void test("PHB headings retain Homebrewery's inherited bold Mr Eaves weight", () => {
	assert.match(
		phbThemeCss,
		/:where\(h1, h2, h3, h4\)[^{]*\{[^}]*font-family: "MrEavesRemake";[^}]*font-weight: 700;/
	);
});

void test("DMG inherits PHB layout and overrides official theme furniture", () => {
	const html = buildStandaloneHtml(
		renderBrewMarkdown(fixture),
		"dmg",
		"/* fixture */",
		"DMG Fixture",
		816,
		1056
	);

	assert.match(
		html,
		/brewvault-theme-blank brewvault-theme-phb brewvault-theme-dmg/
	);
	assert.match(dmgThemeCss, /DMG_background\.jpg/);
	assert.match(dmgThemeCss, /DMG_footerAccent\.png/);
	assert.match(dmgThemeCss, /partCoverHeaderDMG\.svg/);
});
