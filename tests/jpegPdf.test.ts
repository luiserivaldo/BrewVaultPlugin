import assert from "node:assert/strict";
import test from "node:test";
import { cssPxToPt, readJpegInfo, writeJpegPdf } from "../src/export/jpegPdf";

/** Smallest marker sequence the writer needs: SOI, APP0, SOF0, EOI. */
function fakeJpeg(width: number, height: number, components = 3): Uint8Array {
	return new Uint8Array([
		0xff, 0xd8,
		0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
		0xff, 0xc0, 0x00, 0x0b, 0x08,
		height >> 8, height & 0xff,
		width >> 8, width & 0xff,
		components, 0x01, 0x11, 0x00,
		0xff, 0xd9,
	]);
}

const latin1 = (bytes: Uint8Array): string =>
	Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

void test("Letter CSS pixels convert to Letter points", () => {
	assert.equal(cssPxToPt(816), 612);
	assert.equal(cssPxToPt(1056), 792);
});

void test("JPEG frame headers report size and colour space", () => {
	assert.deepEqual(readJpegInfo(fakeJpeg(1632, 2112)), {
		width: 1632,
		height: 2112,
		colorSpace: "DeviceRGB",
	});
	assert.equal(readJpegInfo(fakeJpeg(10, 10, 1)).colorSpace, "DeviceGray");
	assert.throws(() => readJpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), /not a JPEG/);
	assert.throws(() => readJpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])), /no readable/);
});

void test("the writer emits one Letter page per JPEG with a valid xref table", () => {
	const pages = [fakeJpeg(1632, 2112), fakeJpeg(1632, 2112)].map((jpeg) => ({
		jpeg,
		widthPt: 612,
		heightPt: 792,
	}));
	const pdf = writeJpegPdf(pages, { title: "Llynwylch — Ch. 0" });
	const text = latin1(pdf);

	assert.ok(text.startsWith("%PDF-1.4\n"));
	assert.ok(text.trimEnd().endsWith("%%EOF"));
	assert.match(text, /\/Type \/Pages \/Kids \[4 0 R 7 0 R\] \/Count 2/);
	assert.equal(text.match(/\/MediaBox \[0 0 612 792\]/g)?.length, 2);
	assert.equal(text.match(/\/Filter \/DCTDecode/g)?.length, 2);
	assert.match(text, /\/Width 1632 \/Height 2112 \/ColorSpace \/DeviceRGB/);
	// UTF-16BE title keeps the em dash (U+2014).
	assert.match(text, /\/Title <FEFF[0-9A-F]*2014[0-9A-F]*>/);

	// Every xref entry must point at the start of its "N 0 obj" header.
	const startxref = Number(/startxref\n(\d+)\n/.exec(text)?.[1]);
	const xref = text.slice(startxref);
	const entries = [...xref.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
	assert.equal(entries.length, 9);
	entries.forEach((offset, index) => {
		assert.ok(text.startsWith(`${index + 1} 0 obj\n`, offset), `object ${index + 1}`);
	});
});

void test("image bytes are embedded unchanged with an exact stream length", () => {
	const jpeg = fakeJpeg(4, 4);
	const text = latin1(writeJpegPdf([{ jpeg, widthPt: 10, heightPt: 10 }]));
	const marker = `/Length ${jpeg.byteLength} >>\nstream\n`;
	const start = text.indexOf(marker) + marker.length;
	assert.equal(text.slice(start, start + jpeg.byteLength), latin1(jpeg));
	assert.equal(text.slice(start + jpeg.byteLength, start + jpeg.byteLength + 10), "\nendstream");
});

void test("the writer rejects empty documents and non-positive pages", () => {
	assert.throws(() => writeJpegPdf([]), /without pages/);
	assert.throws(
		() => writeJpegPdf([{ jpeg: fakeJpeg(1, 1), widthPt: 0, heightPt: 10 }]),
		/positive size/
	);
});

void test("JPEG data URLs decode to their exact bytes and PNG fallbacks are rejected", async () => {
	const { jpegDataUrlToBytes } = await import("../src/export/rasterPdf");
	const jpeg = fakeJpeg(2, 3);
	const base64 = Buffer.from(jpeg).toString("base64");
	assert.deepEqual(jpegDataUrlToBytes(`data:image/jpeg;base64,${base64}`), jpeg);
	assert.throws(() => jpegDataUrlToBytes(`data:image/png;base64,${base64}`), /cannot encode JPEG/);
});
