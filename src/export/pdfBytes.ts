/** Copies validated PDF bytes into an exact, standalone ArrayBuffer. */
export function copyValidatedPdf(pdfBytes: Uint8Array): ArrayBuffer {
	if (
		pdfBytes.byteLength < 5 ||
		pdfBytes[0] !== 0x25 ||
		pdfBytes[1] !== 0x50 ||
		pdfBytes[2] !== 0x44 ||
		pdfBytes[3] !== 0x46 ||
		pdfBytes[4] !== 0x2d
	) {
		throw new Error("The PDF generator returned an invalid PDF document.");
	}

	const copy = new Uint8Array(pdfBytes.byteLength);
	copy.set(pdfBytes);
	return copy.buffer;
}
