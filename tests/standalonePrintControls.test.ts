import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";

const html = buildStandaloneHtml(
	[{ html: "<p>Printable</p>", index: 1 }],
	"blank",
	"",
	"Print controls",
	816,
	1056
);

void test("standalone HTML offers a direct print control and an Android fallback", () => {
	assert.match(html, /data-brewvault-print[^>]*>Print \/ Save as PDF<\/button>/);
	assert.match(html, /tap &#8942; &rarr; Share, swipe the action row to Print/);
	assert.match(html, /\.brewvault-export-controls \{ display: none !important; \}/);
});

void test("the print helper is the only hashed script allowed by the standalone CSP", () => {
	const script = html.match(/<script>([^<]+)<\/script>/)?.[1];
	assert.ok(script);

	const hash = createHash("sha256").update(script).digest("base64");
	assert.match(html, new RegExp(`script-src 'sha256-${hash}'`));
	assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
	assert.equal((html.match(/<script>/g) ?? []).length, 1);
});
