import type { Content, Style, TDocumentDefinitions } from "pdfmake/interfaces";
import type { HtmlToPdfMakeOptions } from "html-to-pdfmake";
import type { ExportRequest } from "../../platform/types";
import { copyValidatedPdf } from "../pdfBytes";
import { buildSrdPdfDefinition } from "./srdProfile";
import type {
	BasicPdfExporterContract,
	BasicPdfProfile,
	BasicPdfResult,
} from "./types";

const LETTER_PAGE_MARGINS: [number, number, number, number] = [54, 54, 54, 54];
const MAX_CONTENT_WIDTH_PT = 504;
const MAX_CONTENT_HEIGHT_PT = 684;

export const BASIC_PDF_DEFAULT_STYLES: Readonly<Record<string, Style>> = {
	h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
	h2: { fontSize: 20, bold: true, margin: [0, 8, 0, 8] },
	h3: { fontSize: 16, bold: true, margin: [0, 7, 0, 6] },
	h4: { fontSize: 14, bold: true, margin: [0, 6, 0, 5] },
	h5: { fontSize: 12, bold: true, margin: [0, 5, 0, 4] },
	h6: { fontSize: 11, bold: true, margin: [0, 4, 0, 4] },
	p: { margin: [0, 0, 0, 8] },
	blockquote: { margin: [18, 4, 0, 8], italics: true, color: "#333333" },
	ul: { margin: [12, 0, 0, 6] },
	ol: { margin: [12, 0, 0, 6] },
	table: { margin: [0, 4, 0, 10] },
	th: { bold: true, fillColor: "#EEEEEE" },
	a: { color: "#2457A7", decoration: "underline" },
};

interface PdfDocumentHandle {
	getBuffer(callback: (buffer: Uint8Array) => void): void;
}

interface PdfMakeRuntime {
	vfs: Record<string, string>;
	createPdf(definition: TDocumentDefinitions): PdfDocumentHandle;
}

type HtmlConverter = (html: string, options: HtmlToPdfMakeOptions) => Content;

interface BasicPdfRuntime {
	readonly pdfMake: PdfMakeRuntime;
	readonly convertHtml: HtmlConverter;
}

let runtimePromise: Promise<BasicPdfRuntime> | null = null;

export class BasicPdfExporter implements BasicPdfExporterContract {
	private disposed = false;

	async export(
		request: ExportRequest,
		profile: BasicPdfProfile = "basic"
	): Promise<BasicPdfResult> {
		this.ensureAvailable();
		const runtime = await loadBasicPdfRuntime();
		this.ensureAvailable();

		const converted = runtime.convertHtml(request.html, {
			window,
			defaultStyles: BASIC_PDF_DEFAULT_STYLES,
			tableAutoSize: false,
			imagesByReference: false,
			removeExtraBlanks: true,
			removeTagClasses: true,
			ignoreStyles: [
				"background",
				"background-color",
				"border",
				"color",
				"font-family",
				"font-size",
				"font-style",
				"font-weight",
				"height",
				"line-height",
				"margin",
				"text-align",
				"text-decoration",
				"text-indent",
				"white-space",
				"width",
			],
		});
		const content = sanitizeBasicPdfContent(converted);
		const definition =
			profile === "srd"
				? buildSrdPdfDefinition(content, request.basename)
				: buildBasicPdfDefinition(content, request.basename);
		const bytes = await createPdfBytes(runtime.pdfMake, definition);
		this.ensureAvailable();

		return { kind: "pdf", bytes: copyValidatedPdf(bytes) };
	}

	dispose(): void {
		this.disposed = true;
	}

	private ensureAvailable(): void {
		if (this.disposed) {
			throw new Error("The basic PDF exporter is unavailable after plugin unload.");
		}
	}
}

export function createBasicPdfExporter(): BasicPdfExporterContract {
	return new BasicPdfExporter();
}

export function buildBasicPdfDefinition(
	content: Content,
	title: string
): TDocumentDefinitions {
	return {
		content,
		pageSize: "LETTER",
		pageMargins: LETTER_PAGE_MARGINS,
		defaultStyle: {
			font: "Roboto",
			fontSize: 11,
			lineHeight: 1.25,
		},
		info: {
			title,
			creator: "BrewVault",
			producer: "BrewVault basic PDF exporter (experimental)",
		},
	};
}

export function isSupportedBasicPdfImageSource(source: string): boolean {
	return /^data:image\/(?:png|jpe?g);base64,/i.test(source);
}

/** Rejects remote/unsupported images and bounds embedded images before pdfmake. */
export function sanitizeBasicPdfContent(content: Content): Content {
	return sanitizeContentValue(content) as Content;
}

function sanitizeContentValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((entry) => sanitizeContentValue(entry));
	if (!isRecord(value)) return value;

	if (typeof value.image === "string") {
		if (!isSupportedBasicPdfImageSource(value.image)) {
			console.warn("BrewVault basic PDF omitted an unresolved or unsupported image.");
			return { text: "" };
		}
		if (
			value.width === undefined &&
			value.height === undefined &&
			value.fit === undefined &&
			value.cover === undefined
		) {
			return { ...value, fit: [MAX_CONTENT_WIDTH_PT, MAX_CONTENT_HEIGHT_PT] };
		}
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, sanitizeContentValue(entry)])
	);
}

async function loadBasicPdfRuntime(): Promise<BasicPdfRuntime> {
	runtimePromise ??= Promise.all([
		import("pdfmake/build/pdfmake"),
		import("pdfmake/build/vfs_fonts"),
		import("html-to-pdfmake"),
	]).then(([pdfMakeModule, vfsModule, converterModule]) => {
		const pdfMakeValue = unwrapDefault(pdfMakeModule);
		const vfsValue = unwrapDefault(vfsModule);
		const converterValue = unwrapDefault(converterModule);

		if (!isPdfMakeRuntime(pdfMakeValue)) {
			throw new TypeError("BrewVault could not initialize pdfmake.");
		}
		if (!isStringRecord(vfsValue)) {
			throw new TypeError("BrewVault could not initialize the bundled PDF font data.");
		}
		if (typeof converterValue !== "function") {
			throw new TypeError("BrewVault could not initialize the HTML-to-PDF converter.");
		}

		pdfMakeValue.vfs = vfsValue;
		return {
			pdfMake: pdfMakeValue,
			convertHtml: converterValue as HtmlConverter,
		};
	});
	return runtimePromise;
}

function createPdfBytes(
	pdfMake: PdfMakeRuntime,
	definition: TDocumentDefinitions
): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		try {
			pdfMake.createPdf(definition).getBuffer((buffer) => {
				try {
					resolve(new Uint8Array(buffer));
				} catch (error) {
					reject(toError(error));
				}
			});
		} catch (error) {
			reject(toError(error));
		}
	});
}

function unwrapDefault(value: unknown): unknown {
	if (isRecord(value) && "default" in value) return value.default;
	return value;
}

function isPdfMakeRuntime(value: unknown): value is PdfMakeRuntime {
	return isRecord(value) && typeof value.createPdf === "function";
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isRecord(value) &&
		Object.values(value).every((entry) => typeof entry === "string")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toError(value: unknown): Error {
	return value instanceof Error ? value : new Error(String(value));
}
