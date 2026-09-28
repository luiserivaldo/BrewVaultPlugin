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

void test("standalone HTML provides one-click Print button with fallback guidance", () => {
	assert.match(html, /BrewVault PDF export<\/strong>/);
	assert.match(html, /Print \/ Save as PDF/);
	assert.match(html, /data-brewvault-print/);
	assert.match(html, /\.brewvault-export-controls \{ display: none !important; \}/);
	assert.match(html, /body \{ display: block; background: none; padding: 0; gap: 0;/);
	assert.match(html, /\.brewvault-pages \{ display: block; \}/);
	assert.match(html, /\.brewPage \{[^}]*column-count: initial;[^}]*break-inside: avoid;/);
	assert.match(html, /\.brewPage \.columnWrapper \{[^}]*column-count: 2;[^}]*column-fill: auto;/);
	assert.match(html, /\.brewvault-pages > \.brewPage:not\(:last-child\) \{[^}]*break-after: page;/);
	assert.match(html, /\.brewPage:last-child \{[^}]*break-after: auto;/);
	assert.match(html, /\.brewvault-theme-phb \.page \.columnWrapper \{[^}]*height: calc\(100% - \.3cm\);[^}]*max-height: calc\(100% - \.3cm\);/);
	assert.match(html, /@page \{[^}]*margin: 0;/);
	// CSP allows the inline print script via hash
	assert.match(html, /script-src 'sha256-vvRiW0cCBu7DM39Mp9A2V0XV9yDXvVHLnlmvhmPzKEk=';/);
	// Script is present and calls window.print()
	assert.match(html, /<script>document\.querySelector\("\[data-brewvault-print]"\)\.addEventListener\("click",\(\)=>window\.print\(\)\);<\/script>/);
});

void test("standalone HTML help text is generic and concise", () => {
	assert.match(html, /Use this button to open the print dialog\./);
	assert.doesNotMatch(html, /Chrome|Brave/);
});
