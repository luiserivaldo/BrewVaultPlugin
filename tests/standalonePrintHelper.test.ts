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
	assert.match(html, /body \{ background: none; padding: 0; gap: 0;/);
	assert.match(html, /\.brewvault-pages \{ display: block; \}/);
	// No forced break-after: page on non-last pages — pages already laid out by paginator
	assert.match(html, /\.brewPage \{[^}]*break-inside: avoid;/);
	assert.match(html, /\.brewPage:last-child \{[^}]*break-after: auto;/);
	// PHB columnWrapper no longer uses calc(100% - .3cm) offset
	assert.match(html, /\.brewvault-theme-phb \.page \.columnWrapper \{[^}]*height: 100%;[^}]*max-height: 100%;/);
	// @page margins match page padding (1.4cm 1.9cm 1.7cm)
	assert.match(html, /@page \{[^}]*margin: 1\.4cm 1\.9cm 1\.7cm;/);
	// CSP allows the inline print script via hash
	assert.match(html, /script-src 'sha256-vvRiW0cCBu7DM39Mp9A2V0XV9yDXvVHLnlmvhmPzKEk=';/);
	// Script is present and calls window.print()
	assert.match(html, /<script>document\.querySelector\("\[data-brewvault-print]"\)\.addEventListener\("click",\(\)=>window\.print\(\)\);<\/script>/);
});

void test("standalone HTML help text is generic and concise", () => {
	assert.match(html, /Open in your browser, then use Print → Save as PDF\./);
});
