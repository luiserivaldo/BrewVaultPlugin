import assert from "node:assert/strict";
import test from "node:test";
import {
	CUSTOM_THEME_CLASS_NAME,
	getThemeClassNames,
	THEME_REGISTRY,
} from "../src/themes/registry";
import { renderBrewMarkdown } from "../src/renderer";

void test("theme registry preserves upstream inheritance", () => {
	assert.equal(THEME_REGISTRY.phb.baseTheme, "blank");
	assert.equal(THEME_REGISTRY.dmg.baseTheme, "phb");
	assert.equal(THEME_REGISTRY.journal.baseTheme, "blank");
	assert.equal(THEME_REGISTRY.srd.baseTheme, "blank");
	assert.deepEqual(getThemeClassNames("phb"), [
		"brewvault-theme-blank",
		"brewvault-theme-phb",
	]);
	assert.deepEqual(getThemeClassNames("dmg"), [
		"brewvault-theme-blank",
		"brewvault-theme-phb",
		"brewvault-theme-dmg",
	]);
	assert.equal(THEME_REGISTRY.dmg.selectable, true);
	assert.deepEqual(THEME_REGISTRY.dmg.assets, [
		"dmg-background",
		"dmg-footer-accent",
		"dmg-part-cover-header",
	]);
});

void test("custom themes use the custom render class without PHB inheritance", () => {
	assert.deepEqual(getThemeClassNames("custom:3"), [CUSTOM_THEME_CLASS_NAME]);
});

void test("block containers expose Homebrewery semantic classes", () => {
	const [page] = renderBrewMarkdown("{{monster,wide\n## Drake\n}}");
	assert.match(
		page.html,
		/<div class="brewBlock monster brew-monster wide brew-wide">/
	);
});

void test("inline spans retain semantic and compatibility classes", () => {
	const [page] = renderBrewMarkdown("Deals {{damage 2d6 fire}} damage.");
	assert.match(page.html, /<span class="damage brew-damage">2d6 fire<\/span>/);
});
