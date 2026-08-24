import assert from "node:assert/strict";
import test from "node:test";
import { copyValidatedPdf } from "../src/electron/ElectronPdfExporter";

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
