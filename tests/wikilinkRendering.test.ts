import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewMarkdown } from "../src/renderer";
import { formatWikilinkTarget } from "../src/renderer/rules/wikilink";
import type { ResolvedImageEmbed } from "../src/renderer";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";

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

void test("resolved Obsidian image embeds render as self-contained images", () => {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>([
		["Images/imp.png", { src: "data:image/png;base64,aW1w" }],
	]);
	const html = renderBrewMarkdown("![[Images/imp.png]]", { imageEmbeds })
		.map((page) => page.html)
		.join("\n");

	assert.match(
		html,
		/<img src="data:image\/png;base64,aW1w" alt="imp">/
	);
	assert.doesNotMatch(html, /Images\/imp\.png|\[\[/);
});

void test("resolved vault images survive standalone HTML serialization", () => {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>([
		["Images/imp.png", { src: "data:image/png;base64,aW1w" }],
	]);
	const pages = renderBrewMarkdown("![[Images/imp.png]]", { imageEmbeds });
	const standalone = buildStandaloneHtml(
		pages,
		"blank",
		"",
		"Image fixture",
		816,
		1056
	);

	assert.match(standalone, /src="data:image\/png;base64,aW1w"/);
	assert.doesNotMatch(standalone, /Images\/imp\.png|app:\/\//);
});

void test("Obsidian image aliases and dimensions remain compatible", () => {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>([
		["Images/imp.png", { src: "data:image/png;base64,aW1w" }],
	]);
	const html = renderBrewMarkdown(
		"![[Images/imp.png|Infernal scout]] ![[Images/imp.png|320x180]]",
		{ imageEmbeds }
	)
		.map((page) => page.html)
		.join("\n");

	assert.match(html, /alt="Infernal scout"/);
	assert.match(html, /alt="imp" width="320" height="180"/);
});

void test("Homebrewery size attributes apply to vault images and consume source text", () => {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>([
		["IMG_imp.png", { src: "data:image/png;base64,aW1w" }],
	]);
	const html = renderBrewMarkdown(
		"![[IMG_imp.png|392]]{width:200px}",
		{ imageEmbeds }
	)
		.map((page) => page.html)
		.join("\n");

	assert.match(html, /width="392" style="width:200px"/);
	assert.doesNotMatch(html, /\{width:200px\}/);
});

void test("Homebrewery size attributes also apply to Markdown images", () => {
	const html = render(
		"![Bird](https://homebrewery.naturalcrit.com/assets/bird.webp) {width:325px;height:200px}"
	);

	assert.match(html, /style="width:325px;height:200px"/);
	assert.doesNotMatch(html, /\{width:325px/);
});

void test("unsafe or unrelated image attributes remain visible text", () => {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>([
		["IMG_imp.png", { src: "data:image/png;base64,aW1w" }],
	]);
	const html = renderBrewMarkdown(
		"![[IMG_imp.png]]{position:absolute;onclick:alert(1)}",
		{ imageEmbeds }
	)
		.map((page) => page.html)
		.join("\n");

	assert.match(html, /\{position:absolute;onclick:alert\(1\)\}/);
	assert.doesNotMatch(html, /style=/);
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
