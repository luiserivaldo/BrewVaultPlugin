import type { BrewPage } from "./types";
import type { BrewTheme } from "../settings/types";

export interface PaginationOptions {
	theme: BrewTheme;
	pageWidthPx: number;
	pageHeightPx: number;
}

/**
 * Converts explicitly-delimited renderer pages into physical pages by measuring
 * them with the same CSS used by preview/export. The source Markdown is never
 * changed: automatic breaks exist only in the rendered page array, equivalent
 * to inserting virtual `\\page` markers at safe top-level block boundaries.
 *
 * This deliberately splits only between top-level rendered blocks. It avoids
 * tearing tables, lists, callouts, and other structured blocks in half. A
 * single block that is taller/wider than a whole page is left intact so the
 * caller can surface it as an unavoidable overflow instead of corrupting it.
 */
export async function paginateBrewPages(
	pages: BrewPage[],
	options: PaginationOptions
): Promise<BrewPage[]> {
	if (typeof document === "undefined" || !document.body) return pages;

	if (document.fonts?.ready) {
		try {
			await document.fonts.ready;
		} catch {
			// Font readiness is an optimization; pagination still works with fallbacks.
		}
	}

	const host = document.createElement("div");
	host.className = `brewvault-pages brewvault-theme-${options.theme} brewvault-measure-pages`;
	host.style.setProperty("--brew-page-width", `${options.pageWidthPx}px`);
	host.style.setProperty("--brew-page-height", `${options.pageHeightPx}px`);
	host.style.cssText +=
		";position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;z-index:-2147483648";
	document.body.appendChild(host);

	const output: BrewPage[] = [];

	try {
		for (const explicitPage of pages) {
			const source = document.createElement("div");
			source.innerHTML = explicitPage.html;
			const nodes = Array.from(source.childNodes).filter(
				(node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim().length > 0
			);

			let measurementPage = createMeasurementPage(host);
			let hasContent = false;

			for (const node of nodes) {
				const clone = node.cloneNode(true);
				measurementPage.appendChild(clone);

				if (pageOverflows(measurementPage) && hasContent) {
					measurementPage.removeChild(clone);
					pushMeasuredPage(output, measurementPage);
					measurementPage.remove();

					measurementPage = createMeasurementPage(host);
					measurementPage.appendChild(clone);
				}

				hasContent = true;
			}

			// Keep explicit blank pages as real pages.
			pushMeasuredPage(output, measurementPage);
			measurementPage.remove();
		}
	} finally {
		host.remove();
	}

	return output.map((page, index) => ({ ...page, index: index + 1 }));
}

function createMeasurementPage(host: HTMLElement): HTMLElement {
	const page = document.createElement("div");
	page.className = "brewPage brewPageMeasurement";
	host.appendChild(page);
	return page;
}

function pageOverflows(page: HTMLElement): boolean {
	return page.scrollWidth > page.clientWidth + 1 || page.scrollHeight > page.clientHeight + 1;
}

function pushMeasuredPage(output: BrewPage[], page: HTMLElement): void {
	output.push({ html: page.innerHTML.trim(), index: output.length + 1 });
}
