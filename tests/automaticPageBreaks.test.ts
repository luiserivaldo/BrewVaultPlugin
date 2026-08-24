import assert from "node:assert/strict";
import test from "node:test";
import { collectAutomaticPageBreaks } from "../src/editor/automaticPageBreaks";
import { renderBrewMarkdown } from "../src/renderer";
import { findFirstSourceLine } from "../src/renderer/pageSplitter";
import type { BrewPage } from "../src/renderer/types";

void test("renderer retains source lines on top-level blocks", () => {
	const pages = renderBrewMarkdown("# Title\n\nOpening paragraph.\n\n\\page\n\n## Next page");

	assert.equal(pages.length, 2);
	assert.equal(pages[0].sourceLine, 0);
	assert.equal(pages[0].breakKind, "document-start");
	assert.match(pages[0].html, /<h1 data-brew-source-line="0">Title<\/h1>/);
	assert.equal(pages[1].sourceLine, 6);
	assert.equal(pages[1].breakKind, "explicit");
});

void test("source metadata lookup accepts generated HTML attribute quoting", () => {
	assert.equal(findFirstSourceLine("<p data-brew-source-line='14'>Text</p>"), 14);
	assert.equal(findFirstSourceLine("<p>Text</p>"), null);
});

void test("only measured automatic boundaries are projected into edit mode", () => {
	const pages: BrewPage[] = [
		{ html: "a", index: 1, sourceLine: 0, breakKind: "document-start" },
		{ html: "b", index: 2, sourceLine: 12, breakKind: "automatic" },
		{ html: "c", index: 3, sourceLine: 24, breakKind: "explicit" },
		{ html: "d", index: 4, sourceLine: null, breakKind: "automatic" },
	];

	assert.deepEqual(collectAutomaticPageBreaks(pages), [
		{ line: 12, pageNumber: 2 },
	]);
});
