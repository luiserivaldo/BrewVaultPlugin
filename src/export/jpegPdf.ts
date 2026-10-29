/**
 * Minimal PDF 1.4 writer for documents whose pages are full-bleed JPEG images.
 * JPEG data is embedded unchanged through the DCTDecode filter, so no
 * compression library is needed and the writer stays pure and testable.
 */

export interface JpegPdfPage {
	/** Complete baseline or progressive JPEG file bytes. */
	readonly jpeg: Uint8Array;
	/** Page width in PDF points (1/72 in). */
	readonly widthPt: number;
	/** Page height in PDF points (1/72 in). */
	readonly heightPt: number;
}

export interface JpegPdfOptions {
	readonly title?: string;
}

export interface JpegInfo {
	readonly width: number;
	readonly height: number;
	readonly colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK";
}

/** CSS pixels are defined at 96 per inch; PDF user space is 72 per inch. */
export function cssPxToPt(px: number): number {
	return (px * 72) / 96;
}

/** Read dimensions and component count from a JPEG's start-of-frame marker. */
export function readJpegInfo(jpeg: Uint8Array): JpegInfo {
	if (jpeg.byteLength < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
		throw new Error("BrewVault page image is not a JPEG file.");
	}

	let offset = 2;
	while (offset + 4 <= jpeg.byteLength) {
		if (jpeg[offset] !== 0xff) {
			throw new Error("BrewVault page image has a malformed JPEG marker.");
		}
		const marker = jpeg[offset + 1];
		// Fill bytes and standalone markers carry no length field.
		if (marker === 0xff) {
			offset += 1;
			continue;
		}
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
			offset += 2;
			continue;
		}

		const length = (jpeg[offset + 2] << 8) | jpeg[offset + 3];
		if (length < 2 || offset + 2 + length > jpeg.byteLength) break;

		// SOF0–SOF15 except DHT (C4), JPG (C8), and DAC (CC).
		const isStartOfFrame =
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc;
		if (isStartOfFrame) {
			if (length < 8) break;
			const height = (jpeg[offset + 5] << 8) | jpeg[offset + 6];
			const width = (jpeg[offset + 7] << 8) | jpeg[offset + 8];
			const components = jpeg[offset + 9];
			const colorSpace =
				components === 1
					? "DeviceGray"
					: components === 3
						? "DeviceRGB"
						: components === 4
							? "DeviceCMYK"
							: null;
			if (!colorSpace || width === 0 || height === 0) break;
			return { width, height, colorSpace };
		}

		offset += 2 + length;
	}

	throw new Error("BrewVault page image has no readable JPEG frame header.");
}

/** Assemble a complete PDF with one full-page JPEG per page. */
export function writeJpegPdf(
	pages: readonly JpegPdfPage[],
	options: JpegPdfOptions = {}
): Uint8Array {
	if (pages.length === 0) {
		throw new Error("BrewVault cannot write a PDF without pages.");
	}

	const writer = new PdfByteWriter();
	writer.text("%PDF-1.4\n");
	// A binary comment tells transfer tools the file is not plain text.
	writer.bytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

	// Objects 1–3 are fixed; each page then uses three consecutive objects.
	const catalogId = 1;
	const pagesId = 2;
	const infoId = 3;
	const pageIds = pages.map((_, index) => 4 + index * 3);

	writer.object(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
	writer.object(
		pagesId,
		`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`
	);
	const title = options.title ? ` /Title ${encodePdfTextString(options.title)}` : "";
	writer.object(
		infoId,
		`<< /Producer (BrewVault) /Creator (BrewVault)${title} >>`
	);

	pages.forEach((page, index) => {
		const pageId = pageIds[index];
		const contentId = pageId + 1;
		const imageId = pageId + 2;
		const info = readJpegInfo(page.jpeg);
		const width = formatNumber(page.widthPt);
		const height = formatNumber(page.heightPt);
		if (!(page.widthPt > 0 && page.heightPt > 0)) {
			throw new Error("BrewVault PDF pages need a positive size.");
		}

		writer.object(
			pageId,
			`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] ` +
				`/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
		);

		const content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
		writer.stream(contentId, "", asciiBytes(content));

		const decode = info.colorSpace === "DeviceCMYK" ? " /Decode [1 0 1 0 1 0 1 0]" : "";
		writer.stream(
			imageId,
			`/Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} ` +
				`/ColorSpace /${info.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode${decode}`,
			page.jpeg
		);
	});

	return writer.finish(catalogId, infoId);
}

class PdfByteWriter {
	private readonly chunks: Uint8Array[] = [];
	private length = 0;
	private readonly offsets = new Map<number, number>();

	text(value: string): void {
		this.bytes(asciiBytes(value));
	}

	bytes(value: Uint8Array): void {
		this.chunks.push(value);
		this.length += value.byteLength;
	}

	object(id: number, body: string): void {
		this.offsets.set(id, this.length);
		this.text(`${id} 0 obj\n${body}\nendobj\n`);
	}

	stream(id: number, dictionaryEntries: string, data: Uint8Array): void {
		this.offsets.set(id, this.length);
		const entries = dictionaryEntries ? `${dictionaryEntries} ` : "";
		this.text(`${id} 0 obj\n<< ${entries}/Length ${data.byteLength} >>\nstream\n`);
		this.bytes(data);
		this.text("\nendstream\nendobj\n");
	}

	finish(rootId: number, infoId: number): Uint8Array {
		const size = Math.max(...this.offsets.keys()) + 1;
		const xrefOffset = this.length;
		let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
		for (let id = 1; id < size; id++) {
			const offset = this.offsets.get(id);
			if (offset === undefined) {
				throw new Error(`BrewVault PDF object ${id} was never written.`);
			}
			xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
		}
		this.text(xref);
		this.text(
			`trailer\n<< /Size ${size} /Root ${rootId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
		);

		const output = new Uint8Array(this.length);
		let position = 0;
		for (const chunk of this.chunks) {
			output.set(chunk, position);
			position += chunk.byteLength;
		}
		return output;
	}
}

/** Encode metadata as a UTF-16BE hex string so any Unicode title survives. */
function encodePdfTextString(value: string): string {
	let hex = "FEFF";
	for (let index = 0; index < value.length; index++) {
		hex += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
	}
	return `<${hex}>`;
}

function asciiBytes(value: string): Uint8Array {
	const bytes = new Uint8Array(value.length);
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code > 0x7f) throw new Error("BrewVault PDF syntax must be ASCII.");
		bytes[index] = code;
	}
	return bytes;
}

function formatNumber(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "");
}
