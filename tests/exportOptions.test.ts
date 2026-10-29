import assert from "node:assert/strict";
import test from "node:test";
import {
	formatInvalidPropertiesMessage,
	parseNoteExportOptions,
} from "../src/exportOptions/noteProperties";
import { resolveExportOptions } from "../src/exportOptions/resolve";
import type { ExportOptions } from "../src/exportOptions/options";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";

const context = { customStyles: [] };
const defaults: ExportOptions = { theme: "phb", footer: "" };

void test("notes without BrewVault properties set no options", () => {
	assert.deepEqual(parseNoteExportOptions(undefined, context), { options: {}, invalid: [] });
	assert.deepEqual(parseNoteExportOptions({ tags: ["llynwych"] }, context), {
		options: {},
		invalid: [],
	});
});

void test("bv_footer accepts text, numbers, and false to turn a footer off", () => {
	assert.equal(
		parseNoteExportOptions({ bv_footer: "  Llynwych | Monsters " }, context).options.footer,
		"Llynwych | Monsters"
	);
	assert.equal(parseNoteExportOptions({ bv_footer: 2024 }, context).options.footer, "2024");
	assert.equal(parseNoteExportOptions({ bv_footer: false }, context).options.footer, "");
	assert.equal(parseNoteExportOptions({ bv_footer: null }, context).options.footer, undefined);
});

void test("invalid properties are reported and leave the option unset", () => {
	const parsed = parseNoteExportOptions(
		{ bv_theme: "parchment", bv_footer: ["a", "b"] },
		context
	);
	assert.deepEqual(parsed.options, {});
	assert.deepEqual(parsed.invalid, [
		{ property: "bv_theme", value: "parchment" },
		{ property: "bv_footer", value: '["a","b"]' },
	]);
	assert.equal(
		formatInvalidPropertiesMessage("Hound", parsed.invalid),
		'BrewVault ignored invalid bv_theme "parchment", bv_footer "["a","b"]" in "Hound" and used the defaults instead.'
	);
});

void test("each option resolves separately: command, then note, then settings", () => {
	const resolved = resolveExportOptions({
		command: { theme: "blank" },
		note: { theme: "dmg", footer: "Everfrost" },
		defaults,
	});
	assert.deepEqual(resolved.values, { theme: "blank", footer: "Everfrost" });
	assert.deepEqual(resolved.sources, { theme: "command", footer: "note" });

	const fallback = resolveExportOptions({ command: { theme: undefined }, note: {}, defaults });
	assert.deepEqual(fallback.values, defaults);
	assert.deepEqual(fallback.sources, { theme: "settings", footer: "settings" });
});

void test("standalone export adds an escaped footer to every page", () => {
	const pages = [
		{ html: "<p>One</p>", index: 1 },
		{ html: "<p>Two</p>", index: 2 },
	];
	const withFooter = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056, {
		footer: "Monsters <of> Llynwych",
	});
	assert.equal(
		withFooter.match(/<div class="footnote">Monsters &lt;of&gt; Llynwych<\/div>/g)?.length,
		2
	);
	const withoutFooter = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056);
	assert.doesNotMatch(withoutFooter, /class="footnote"/);
});
