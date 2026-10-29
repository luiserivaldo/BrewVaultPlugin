import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewMarkdown } from "../src/renderer";
import {
	EDITIONS,
	SNIPPET_CATALOG,
	SNIPPET_FAMILIES,
	SNIPPET_GROUP_LABELS,
	resolveSnippetFamily,
	snippetLabel,
	snippetsForEdition,
} from "../src/snippets/catalog";

function render(source: string): string {
	return renderBrewMarkdown(source).map((page) => page.html).join("\n");
}

void test("snippet ids are unique and every group has a label", () => {
	const ids = SNIPPET_CATALOG.map((snippet) => snippet.id);
	assert.equal(new Set(ids).size, ids.length);
	for (const snippet of SNIPPET_CATALOG) {
		assert.ok(SNIPPET_GROUP_LABELS[snippet.group], `${snippet.id} has no group label`);
	}
});

void test("snippet ids are stable kebab-case command ids", () => {
	// Each id becomes the `insert-<id>` command id that users bind hotkeys to.
	for (const snippet of SNIPPET_CATALOG) {
		assert.match(snippet.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${snippet.id} is not kebab-case`);
		assert.doesNotMatch(snippet.id, /^block(-\d{4})?$/, "insert-block* are the picker commands");
		assert.doesNotMatch(snippet.id, /^default-/, "insert-default-* are the default-edition commands");
	}
});

void test("snippet bodies start at a line boundary and end with a newline", () => {
	for (const snippet of SNIPPET_CATALOG) {
		assert.doesNotMatch(snippet.body, /^\s/, `${snippet.id} starts with whitespace`);
		assert.match(snippet.body, /\n$/, `${snippet.id} must end with a newline`);
	}
});

void test("every snippet renders without leaking Homebrewery syntax", () => {
	for (const snippet of SNIPPET_CATALOG) {
		const html = render(snippet.body);
		assert.doesNotMatch(html, /\{\{|\}\}/, `${snippet.id} left raw block braces`);
		assert.doesNotMatch(html, /\s::\s|<p>:+<\/p>/, `${snippet.id} left raw :: syntax`);
	}
});

void test("snippets stay offline and never reference remote resources", () => {
	for (const snippet of SNIPPET_CATALOG) {
		assert.doesNotMatch(snippet.body, /https?:\/\//, `${snippet.id} references a URL`);
	}
});

void test("block snippets keep Homebrewery's semantic classes", () => {
	const byId = new Map(SNIPPET_CATALOG.map((snippet) => [snippet.id, snippet]));
	const expectations: Array<[string, RegExp]> = [
		["monster", /class="brewBlock monster brew-monster frame brew-frame"/],
		["monster-wide", /class="brewBlock monster brew-monster frame brew-frame wide brew-wide"/],
		["monster-unframed", /class="brewBlock monster brew-monster"/],
		["martial-class-table", /class="brewBlock classTable brew-classTable frame brew-frame decoration/],
		["quote", /class="attribution brew-attribution"/],
		["column-break", /class="columnSplit"/],
	];
	for (const [id, pattern] of expectations) {
		const snippet = byId.get(id);
		assert.ok(snippet, `missing snippet ${id}`);
		assert.match(render(snippet.body), pattern, id);
	}
});

void test("the new-page snippet starts a second page", () => {
	const snippet = SNIPPET_CATALOG.find((entry) => entry.id === "new-page");
	assert.ok(snippet);
	assert.equal(renderBrewMarkdown(`Before\n\n${snippet.body}\nAfter`).length, 2);
});

void test("2024 templates carry their SRD 5.2.1 edition markers", () => {
	const byId = new Map(SNIPPET_CATALOG.map((snippet) => [snippet.id, snippet]));
	const expectations: Array<[string, RegExp[]]> = [
		["monster-2024", [/\*\*AC\*\*/, /\*\*Initiative\*\* \+2 \(12\)/, /\| MOD \| SAVE \|/, /\(XP 200; PB \+2\)/, /### Bonus Actions/, /\*Melee Attack Roll:\*/]],
		["spell-2024", [/\*Level 2 Abjuration \(Cleric, Wizard\)\*/, /:: Action\n/, /Using a Higher-Level Spell Slot/]],
		["class-table-2024", [/\| {3}1 {3}\|/, /Epic Boon/, /Weapon Mastery \|/]],
		["caster-class-table-2024", [/Prepared Spells/, /\| 20 \| \+6 \|/]],
		["core-class-traits-2024", [/Hit Point Die/, /Armor Training/]],
		["feat-2024", [/\*General Feat \(Prerequisite: Level 4\+\)\*/]],
		["background-2024", [/\*\*Ability Scores:\*\*/, /\*\*Feat:\*\*/]],
		["species-2024", [/\*\*Creature Type:\*\*/]],
		["magic-item-2024", [/\*Wondrous Item, Uncommon \(Requires Attunement\)\*/]],
	];
	for (const [id, patterns] of expectations) {
		const snippet = byId.get(id);
		assert.ok(snippet, `missing snippet ${id}`);
		assert.equal(snippet.edition, "2024", `${id} is not a 2024 variant`);
		for (const pattern of patterns) assert.match(snippet.body, pattern, `${id} lacks ${pattern}`);
	}
});

void test("2024 ability table renders inside the stat block", () => {
	const snippet = SNIPPET_CATALOG.find((entry) => entry.id === "monster-2024");
	assert.ok(snippet);
	const html = render(snippet.body);
	assert.match(html, /class="brewBlock monster brew-monster frame brew-frame"/);
	assert.match(html, /<th[^>]*>MOD<\/th>/);
	assert.match(html, /class="bonus brew-bonus"/);
});

void test("edition and family are set together", () => {
	for (const snippet of SNIPPET_CATALOG) {
		assert.equal(snippet.edition === undefined, snippet.family === undefined, snippet.id);
	}
});

void test("every family ships one 2014 and one 2024 variant with matching labels", () => {
	for (const family of SNIPPET_FAMILIES) {
		for (const edition of EDITIONS) {
			const variants = SNIPPET_CATALOG.filter(
				(snippet) => snippet.family === family && snippet.edition === edition
			);
			assert.equal(variants.length, 1, `${family} needs exactly one ${edition} variant`);
		}
		const older = resolveSnippetFamily(family, "2014");
		const newer = resolveSnippetFamily(family, "2024");
		assert.ok(older && newer);
		// The default-edition command name is fixed at registration, so both
		// variants must read the same without their edition.
		assert.equal(snippetLabel(older, false), snippetLabel(newer, false), family);
	}
});

void test("an edition picker hides the other edition but keeps neutral blocks", () => {
	const picker2014 = snippetsForEdition("2014");
	assert.ok(picker2014.some((snippet) => snippet.id === "note"));
	assert.ok(picker2014.some((snippet) => snippet.id === "monster"));
	assert.ok(picker2014.every((snippet) => snippet.edition !== "2024"));
	assert.equal(resolveSnippetFamily("monster", "2024")?.id, "monster-2024");
	assert.equal(snippetLabel(resolveSnippetFamily("monster", "2014")!), "PHB 2014: Monster stat block");
});
