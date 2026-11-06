import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { buildDocumentWriteScript } from "../src/electron/ElectronPdfExporter";
import { copyValidatedPdf } from "../src/export/pdfBytes";

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

void test("the print document is written verbatim, however large or unusual", () => {
	const awkward = "<!doctype html><p>Alchemist — café \u2028 \u2029 \\ ` ${x}</p><script>1</script>";
	// Well over the ~2 MB a data: URL may hold, which is why the document is written.
	const large = `<!doctype html><style>${"a{b:c}".repeat(500_000)}</style>`;

	for (const html of [awkward, large]) {
		let written = "";
		const calls: string[] = [];
		const fakeDocument = {
			open: () => calls.push("open"),
			write: (text: string) => {
				written = text;
				calls.push("write");
			},
			close: () => calls.push("close"),
		};
		runInNewContext(buildDocumentWriteScript(html), { document: fakeDocument });

		assert.equal(written, html);
		assert.deepEqual(calls, ["open", "write", "close"]);
	}
});
