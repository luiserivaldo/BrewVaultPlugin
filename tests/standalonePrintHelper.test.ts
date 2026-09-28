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
	assert.match(html, /body \{ display: block; background: none;/);
	assert.match(html, /\.brewvault-pages \{ display: block; \}/);
	assert.match(html, /\.brewPage \{ column-count: initial; column-width: auto; \}/);
	assert.match(html, /\.brewPage \.columnWrapper \{[^}]*height: 100%;[^}]*column-count: 2;/);
	assert.match(html, /\.brewvault-theme-phb \.page \.columnWrapper \{[^}]*height: calc\(100% - \.3cm\);/);
	assert.match(html, /\.brewPage:not\(:last-child\) \{[^}]*break-after: page;/);
	assert.match(html, /\.brewPage:last-child \{[^}]*break-after: auto;/);
	assert.doesNotMatch(html, /<script|window\.print|data-brewvault-print/);
});
