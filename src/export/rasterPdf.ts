import { copyValidatedPdf } from "./pdfBytes";
import { cssPxToPt, writeJpegPdf, type JpegPdfPage } from "./jpegPdf";

/**
 * Plugin-only styled PDF export for runtimes without a print API (Obsidian
 * mobile). Each paginated page is drawn by the host WebView's own CSS engine
 * through an SVG `<foreignObject>` image, copied to a canvas, encoded as JPEG,
 * and embedded in a minimal PDF.
 *
 * An SVG used as an image cannot run scripts or fetch anything: only the
 * data: URIs already inlined in the standalone export can load. That gives the
 * same isolation as the desktop print renderer without a separate window.
 */

export interface RasterPdfOptions {
	readonly pageWidthPx: number;
	readonly pageHeightPx: number;
	readonly title?: string;
	/** Device pixels per CSS pixel. 2 is about 192 dpi on a Letter page. */
	readonly scale?: number;
	/** JPEG quality between 0 and 1. */
	readonly quality?: number;
	readonly onProgress?: (renderedPages: number, totalPages: number) => void;
	readonly isCancelled?: () => boolean;
}

export const DEFAULT_RASTER_SCALE = 2;
export const DEFAULT_RASTER_QUALITY = 0.9;
const PAGE_RENDER_TIMEOUT_MS = 30_000;
/** Stay well under mobile WebView canvas limits (about 16.7 megapixels on iOS). */
const MAX_CANVAS_PIXELS = 16_000_000;
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/** Pieces of a BrewVault standalone export needed to draw its pages. */
export interface StandalonePages {
	readonly css: string;
	readonly themeClassNames: string;
	readonly pages: readonly Element[];
	readonly document: Document;
}

/** Parse a standalone `.brew.html` export without executing its script. */
export function parseStandalonePages(html: string): StandalonePages {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	const css = Array.from(parsed.head.querySelectorAll("style"))
		.map((style) => style.textContent ?? "")
		.join("\n");
	const container = parsed.body.querySelector(".brewvault-pages");
	const pages = container
		? Array.from(container.children).filter((child) =>
				child.classList.contains("brewPage")
			)
		: [];
	if (pages.length === 0) {
		throw new Error("BrewVault found no rendered pages to export.");
	}

	return {
		css,
		themeClassNames: parsed.body.className,
		pages,
		document: parsed,
	};
}

/**
 * Wrap one page in a self-contained SVG document. The page is serialized as
 * XHTML because SVG is XML; the stylesheet travels inside the same document.
 */
export function buildPageSvg(
	source: StandalonePages,
	page: Element,
	pageWidthPx: number,
	pageHeightPx: number
): string {
	const doc = source.document;
	const root = doc.createElementNS(XHTML_NAMESPACE, "div");
	root.setAttribute(
		"class",
		`brewvault-pages brewvault-raster-root ${source.themeClassNames}`.trim()
	);
	root.setAttribute(
		"style",
		`--brew-page-width:${pageWidthPx}px;--brew-page-height:${pageHeightPx}px;` +
			`display:block;margin:0;padding:0;width:${pageWidthPx}px;` +
			`height:${pageHeightPx}px;overflow:hidden;`
	);

	const style = doc.createElementNS(XHTML_NAMESPACE, "style");
	style.textContent = `${source.css}
.brewvault-raster-root > .brewPage { margin: 0 !important; box-shadow: none !important; }`;
	root.appendChild(style);
	root.appendChild(page.cloneNode(true));

	const xhtml = new XMLSerializer().serializeToString(root);
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidthPx}" height="${pageHeightPx}" ` +
		`viewBox="0 0 ${pageWidthPx} ${pageHeightPx}">` +
		`<foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`
	);
}

/** Render every page of a standalone export into a styled raster PDF. */
export async function renderStandaloneHtmlToRasterPdf(
	html: string,
	options: RasterPdfOptions
): Promise<ArrayBuffer> {
	const { pageWidthPx, pageHeightPx } = options;
	if (!(pageWidthPx > 0 && pageHeightPx > 0)) {
		throw new Error("BrewVault page size must be positive.");
	}

	const source = parseStandalonePages(html);
	const scale = clampScale(
		options.scale ?? DEFAULT_RASTER_SCALE,
		pageWidthPx,
		pageHeightPx
	);
	const quality = options.quality ?? DEFAULT_RASTER_QUALITY;
	const canvas = createEl("canvas");
	canvas.width = Math.round(pageWidthPx * scale);
	canvas.height = Math.round(pageHeightPx * scale);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("This device cannot create a canvas for PDF rendering.");
	}

	const jpegs: Uint8Array[] = [];
	try {
		for (const page of source.pages) {
			if (options.isCancelled?.()) {
				throw new Error("BrewVault PDF export was cancelled.");
			}

			const svg = buildPageSvg(source, page, pageWidthPx, pageHeightPx);
			const image = await loadSvgImage(svg);
			// JPEG has no alpha channel; paint paper white under transparent areas.
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, canvas.width, canvas.height);

			jpegs.push(canvasToJpeg(canvas, quality));
			options.onProgress?.(jpegs.length, source.pages.length);
		}
	} finally {
		// Release the backing store immediately; mobile WebViews reclaim it lazily.
		canvas.width = 0;
		canvas.height = 0;
	}

	const rendered: JpegPdfPage[] = jpegs.map((jpeg) => ({
		jpeg,
		widthPt: cssPxToPt(pageWidthPx),
		heightPt: cssPxToPt(pageHeightPx),
	}));
	return copyValidatedPdf(writeJpegPdf(rendered, { title: options.title }));
}

function clampScale(scale: number, widthPx: number, heightPx: number): number {
	const requested = Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_RASTER_SCALE;
	const maxScale = Math.sqrt(MAX_CANVAS_PIXELS / (widthPx * heightPx));
	return Math.min(requested, maxScale);
}

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const timeout = window.setTimeout(() => {
			cleanup();
			reject(new Error("BrewVault timed out while rendering a PDF page."));
		}, PAGE_RENDER_TIMEOUT_MS);
		const cleanup = () => {
			window.clearTimeout(timeout);
			image.onload = null;
			image.onerror = null;
		};

		image.onload = () => {
			cleanup();
			// decode() waits for embedded fonts/images where the engine supports it.
			const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
			decoded.then(
				() => resolve(image),
				() => resolve(image)
			);
		};
		image.onerror = () => {
			cleanup();
			reject(new Error("BrewVault could not render a PDF page image."));
		};
		image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	});
}

/**
 * Encode synchronously. Android WebView defers toBlob and convertToBlob to an
 * idle task that waited about 4 s per page on a Galaxy S22 Ultra, while the
 * same encode through toDataURL finished in about 60 ms.
 */
function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Uint8Array {
	// A tainted canvas throws SecurityError here.
	return jpegDataUrlToBytes(canvas.toDataURL("image/jpeg", quality));
}

/** Decode a base64 `data:image/jpeg` URL; engines fall back to PNG silently. */
export function jpegDataUrlToBytes(dataUrl: string): Uint8Array {
	const prefix = "data:image/jpeg;base64,";
	if (!dataUrl.startsWith(prefix)) {
		throw new Error("This device cannot encode JPEG images for PDF pages.");
	}
	const binary = atob(dataUrl.slice(prefix.length));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}
