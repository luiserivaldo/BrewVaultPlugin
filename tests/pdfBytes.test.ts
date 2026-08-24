import assert from "node:assert/strict";
import test from "node:test";
import {
	copyValidatedPdf,
	encodeHtmlAsDataUrl,
} from "../src/electron/ElectronPdfExporter";

void test("valid PDF bytes are copied into an exact ArrayBuffer", () => {
	const backing = new Uint8Array(16);
	backing.set([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37], 4);
	const source = backing.subarray(4, 12);

	const copied = copyValidatedPdf(source);

	assert.deepEqual(
		Array.from(new Uint8Array(copied)),
		[0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
	);
	assert.equal(copied.byteLength, source.byteLength);
});

void test("non-PDF output is rejected before vault writes", () => {
	assert.throws(
		() => copyValidatedPdf(new TextEncoder().encode("not a pdf")),
		/invalid PDF document/
	);
});

void test("Unicode HTML survives data URL encoding", () => {
	const html = "<!doctype html><p>Alchemist — café</p>";
	const url = encodeHtmlAsDataUrl(html);
	const encoded = url.slice(url.indexOf(",") + 1);
	const decoded = new TextDecoder().decode(
		Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
	);
	assert.equal(decoded, html);
});
