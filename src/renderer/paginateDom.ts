import type { BrewPage } from "./types";
import type { BrewTheme } from "../settings/types";
import { getThemeClassNames } from "../themes/registry";
import { appendRenderedHtml } from "./renderedHtml";

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

	if (document.fonts) {
		try {
			await document.fonts.ready;
		} catch {
			// Font readiness is an optimization; pagination still works with fallbacks.
		}
	}

	const host = createDiv({
		cls: [
			"brewvault-pages",
			...getThemeClassNames(options.theme),
			"brewvault-measure-pages",
		],
	});
	host.setCssProps({
		"--brew-page-width": `${options.pageWidthPx}px`,
		"--brew-page-height": `${options.pageHeightPx}px`,
	});
	document.body.appendChild(host);

	const output: BrewPage[] = [];

	try {
		for (const explicitPage of pages) {
			const source = createDiv();
			appendRenderedHtml(source, explicitPage.html);
			const nodes = Array.from(source.childNodes).filter(
				(node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim().length > 0
			);

			let measurementPage = createMeasurementPage(host);
			let columnWrapper = getColumnWrapper(measurementPage);
			let hasContent = false;

			for (const node of nodes) {
				const clone = node.cloneNode(true);
				columnWrapper.appendChild(clone);

				if (pageOverflows(measurementPage) && hasContent) {
					columnWrapper.removeChild(clone);
					pushMeasuredPage(output, measurementPage);
					measurementPage.remove();

					measurementPage = createMeasurementPage(host);
					columnWrapper = getColumnWrapper(measurementPage);
					columnWrapper.appendChild(clone);
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
	const page = createDiv({ cls: "page brewPage brewPageMeasurement" });
	page.createDiv({ cls: "columnWrapper" });
	host.appendChild(page);
	return page;
}

function getColumnWrapper(page: HTMLElement): HTMLElement {
	const wrapper = page.querySelector<HTMLElement>(":scope > .columnWrapper");
	if (!wrapper) throw new Error("BrewVault measurement page is missing its column wrapper.");
	return wrapper;
}

function pageOverflows(page: HTMLElement): boolean {
	return page.scrollWidth > page.clientWidth + 1 || page.scrollHeight > page.clientHeight + 1;
}

function pushMeasuredPage(output: BrewPage[], page: HTMLElement): void {
	output.push({ html: page.innerHTML.trim(), index: output.length + 1 });
}
