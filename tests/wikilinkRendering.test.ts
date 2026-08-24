import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewMarkdown } from "../src/renderer";
import { formatWikilinkTarget } from "../src/renderer/rules/wikilink";

function render(source: string): string {
	return renderBrewMarkdown(source).map((page) => page.html).join("\n");
}

void test("wikilinks render labels without Obsidian brackets", () => {
	const html = render(
		"See [[Subclasses/Wizard/Calligrapher|Calligrapher]] and [[Gambler]]."
	);

	assert.match(html, /<p>See Calligrapher and Gambler\.<\/p>/);
	assert.doesNotMatch(html, /\[\[/);
});

void test("unaliased targets use a compact note label", () => {
	assert.equal(formatWikilinkTarget("Classes/Alchemist.md#Level 1"), "Alchemist");
	assert.equal(render("Choose [[Classes/Alchemist.md#Level 1]]."), "<p>Choose Alchemist.</p>");
});

void test("Obsidian embeds are omitted instead of leaking vault paths", () => {
	const html = render("Before ![[Images/secret-cover.png]] after.");
	assert.equal(html, "<p>Before  after.</p>");
	assert.doesNotMatch(html, /secret-cover|\[\[/);
});

void test("unclosed or multiline wikilinks remain ordinary source", () => {
	assert.match(render("Keep [[unfinished"), /\[\[unfinished/);
	assert.match(render("Keep [[first\nsecond]]"), /\[\[first/);
});

void test("wikilink labels remain escaped text", () => {
	const html = render("See [[Target|<script>alert(1)</script>]].");
	assert.doesNotMatch(html, /<script>/);
	assert.match(html, /&lt;script&gt;/);
});
