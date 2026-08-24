import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderBrewMarkdown } from "../src/renderer";

function render(source: string): string {
	return renderBrewMarkdown(source).map((page) => page.html).join("\n");
}

void test("double-colon monster fields render as independent rows", () => {
	const html = render([
		"{{monster,frame",
		"**Armor Class** :: 14 (chain mail, shield)",
		"**Hit Points** :: 136 (1d4 + 5)",
		"**Speed** :: 18 ft.",
		"**Challenge** :: 0 (10 XP) {{bonus **Proficiency Bonus** +3}}",
		"}}",
	].join("\n"));

	assert.equal((html.match(/class="brewDefinitionLine"/g) ?? []).length, 4);
	assert.match(html, /<div class="brewDefinitionLine"><strong>Armor Class<\/strong> 14/);
	assert.match(html, /<strong>Challenge<\/strong> 0 \(10 XP\) <span class="bonus brew-bonus"><strong>Proficiency Bonus<\/strong> \+3<\/span>/);
	assert.doesNotMatch(html, /::/);
});

void test("standalone colons become invisible vertical spacers", () => {
	const html = render("First ability.\n:\nSecond ability.\n::\nThird ability.");

	assert.match(html, /<div class="blank brewBlank brewBlank-1"><\/div>/);
	assert.match(html, /<div class="blank brewBlank brewBlank-2"><\/div>/);
	assert.doesNotMatch(html, /<p>:+<\/p>/);
});

void test("inline Homebrewery tags render nested emphasis", () => {
	const html = render("{{quote\nText.\n\n{{attribution Unknown, *Darkness Rising*}}\n}}");

	assert.match(html, /<span class="attribution brew-attribution">Unknown, <em>Darkness Rising<\/em><\/span>/);
	assert.doesNotMatch(html, /\{\{attribution|\*Darkness Rising\*/);
});

void test("PHB quote styling preserves upstream indentation and attribution", () => {
	const css = readFileSync("styles/homebrewery/5e-phb.css", "utf8");
	assert.match(css, /\.quote > p \{ font-style: italic; line-height: \.54cm;/);
	assert.match(css, /\.quote \.attribution \{ display: block;[^}]*text-align: right;/);
	assert.match(css, /\.quote \.attribution::before [^{]*\{[^}]*content: "---";/);
});

void test("PHB monster styling preserves transparent stats and split challenge metadata", () => {
	const css = readFileSync("styles/homebrewery/5e-phb.css", "utf8");
	assert.match(css, /\.monster \.bonus \{ float: right; padding-right: \.5em; \}/);
	assert.match(css, /\.monster hr \+ table:first-of-type tr \{ background-color: transparent; \}/);
	assert.match(css, /\.monster hr \+ table:first-of-type :where\(td, th\)[^{]*\{[^}]*background-color: transparent;/);
	assert.match(css, /\.monster :where\(p, \.brewDefinitionLine\) \{ text-indent: 0; \}/);
});

void test("PHB spacing clears adjacent margins and reserves footer space", () => {
	const css = readFileSync("styles/homebrewery/5e-phb.css", "utf8");
	assert.match(css, /\.page \.blank \{ margin-top: 0; \}/);
	assert.match(css, /\.page \.blank \+ \* \{ margin-top: 0; \}/);
	assert.match(css, /\.page \.columnWrapper \{ max-height: calc\(100% - \.3cm\); \}/);
});
