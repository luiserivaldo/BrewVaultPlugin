import assert from "node:assert/strict";
import test from "node:test";
import {
	formatInvalidPropertiesMessage,
	parseNoteExportOptions,
} from "../src/exportOptions/noteProperties";
import { resolveExportOptions } from "../src/exportOptions/resolve";
import { pageDimensions, type ExportOptions } from "../src/exportOptions/options";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";

const context = { customStyles: [] };
const defaults: ExportOptions = {
	theme: "phb",
	footer: "",
	showPageNumbers: true,
	firstPageNumber: 1,
	pageSize: "settings",
};

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
	assert.deepEqual(resolved.values, {
		theme: "blank",
		footer: "Everfrost",
		showPageNumbers: true,
		firstPageNumber: 1,
		pageSize: "settings",
	});
	assert.deepEqual(resolved.sources, {
		theme: "command",
		footer: "note",
		showPageNumbers: "settings",
		firstPageNumber: "settings",
		pageSize: "settings",
	});

	const fallback = resolveExportOptions({ command: { theme: undefined }, note: {}, defaults });
	assert.deepEqual(fallback.values, defaults);
	assert.deepEqual(fallback.sources, {
		theme: "settings",
		footer: "settings",
		showPageNumbers: "settings",
		firstPageNumber: "settings",
		pageSize: "settings",
	});
});

void test("standalone export adds an escaped footer to every page", () => {
	const pages = [
		{ html: "<p>One</p>", index: 1 },
		{ html: "<p>Two</p>", index: 2 },
	];
	const withFooter = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056, {
		footer: "Monsters <of> Llynwych",
		showPageNumbers: true,
		firstPageNumber: 1,
	});
	assert.equal(
		withFooter.match(/<div class="footnote">Monsters &lt;of&gt; Llynwych<\/div>/g)?.length,
		2
	);
	const withoutFooter = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056);
	assert.doesNotMatch(withoutFooter, /class="footnote"/);
});

void test("bv_page_numbers accepts booleans and yes/no words", () => {
	for (const [value, expected] of [
		[false, false],
		[true, true],
		["No", false],
		["hide", false],
		["yes", true],
	] as const) {
		assert.equal(
			parseNoteExportOptions({ bv_page_numbers: value }, context).options.showPageNumbers,
			expected
		);
	}
	assert.deepEqual(parseNoteExportOptions({ bv_page_numbers: "maybe" }, context).invalid, [
		{ property: "bv_page_numbers", value: "maybe" },
	]);
});

void test("hidden page numbers are omitted from standalone export", () => {
	const pages = [{ html: "<p>One</p>", index: 1 }];
	const html = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056, {
		footer: "",
		showPageNumbers: false,
		firstPageNumber: 1,
	});
	assert.doesNotMatch(html, /class="pageNumber/);
	assert.match(buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056), /class="pageNumber brewPageNumber">1</);
});

void test("bv_page_start accepts whole numbers from 1 to 9999", () => {
	const start = (value: unknown) => parseNoteExportOptions({ bv_page_start: value }, context);
	assert.equal(start(7).options.firstPageNumber, 7);
	assert.equal(start(" 12 ").options.firstPageNumber, 12);
	for (const value of [0, -3, 2.5, "seven", 10000, true]) {
		assert.equal(start(value).options.firstPageNumber, undefined);
		assert.equal(start(value).invalid.length, 1);
	}
});

void test("page numbers count up from the first page number", () => {
	const pages = [
		{ html: "<p>One</p>", index: 1 },
		{ html: "<p>Two</p>", index: 2 },
	];
	const html = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056, {
		...defaults,
		firstPageNumber: 7,
	});
	assert.deepEqual(
		[...html.matchAll(/class="pageNumber brewPageNumber">(\d+)</g)].map((m) => m[1]),
		["7", "8"]
	);
});

void test("bv_page_size accepts letter and a4, ignoring case", () => {
	const size = (value: unknown) => parseNoteExportOptions({ bv_page_size: value }, context);
	assert.equal(size("A4").options.pageSize, "a4");
	assert.equal(size("US Letter").options.pageSize, "letter");
	assert.deepEqual(size("legal").invalid, [{ property: "bv_page_size", value: "legal" }]);
});

void test("page size presets override the settings size", () => {
	const settings = { pageWidthPx: 900, pageHeightPx: 1200 };
	assert.deepEqual(pageDimensions("settings", settings), settings);
	assert.deepEqual(pageDimensions("letter", settings), { pageWidthPx: 816, pageHeightPx: 1056 });
	assert.deepEqual(pageDimensions("a4", settings), { pageWidthPx: 794, pageHeightPx: 1123 });
});

void test("the printed page size follows the export page size", () => {
	const html = buildStandaloneHtml([{ html: "<p>A4</p>", index: 1 }], "phb", "", "Doc", 794, 1123);
	assert.match(html, /@page \{ size: 794px 1123px; margin: 0; \}/);
	assert.match(html, /html, body \{ width: 794px;/);
	assert.match(html, /--brew-page-width: 794px;/);
});
