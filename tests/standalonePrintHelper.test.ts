import assert from "node:assert/strict";
import test from "node:test";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";

const html = buildStandaloneHtml(
	[{ html: "<p>Printable</p>", index: 1 }],
	"blank",
	"",
	"Print helper",
	816,
	1056
);

void test("standalone HTML provides compact script-free mobile print guidance", () => {
	assert.match(html, /Save as PDF:<\/strong>/);
	assert.match(html, /Share &rarr; Print &rarr; Save as PDF/);
	assert.match(html, /\.brewvault-mobile-print-helper \{ display: none !important; \}/);
	assert.doesNotMatch(html, /<script|window\.print|data-brewvault-print/);
});
