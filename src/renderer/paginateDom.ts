import type { BrewPage } from "./types";
import type { BrewTheme } from "../settings/types";
import { getThemeClassNames } from "../themes/registry";
import { appendRenderedHtml } from "./renderedHtml";

export interface PaginationOptions {
	theme: BrewTheme;
	pageWidthPx: number;
	pageHeightPx: number;
}

export interface OverflowDimensions {
	readonly scrollWidth: number;
	readonly clientWidth: number;
	readonly scrollHeight: number;
	readonly clientHeight: number;
}

export interface ImageReadinessTarget {
	readonly complete: boolean;
	decode?: () => Promise<void>;
	addEventListener?: (type: "load" | "error", listener: () => void) => void;
	removeEventListener?: (type: "load" | "error", listener: () => void) => void;
}

export interface TimerHost {
	setTimeout(callback: () => void, timeoutMs: number): unknown;
	clearTimeout(handle: unknown): void;
}

const IMAGE_READY_TIMEOUT_MS = 3_000;
const BROWSER_TIMER_HOST: TimerHost = {
	setTimeout: (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
	clearTimeout: (handle) => window.clearTimeout(handle as number),
};

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
				await waitForImages(clone);

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
	return dimensionsOverflow(page) || dimensionsOverflow(getColumnWrapper(page));
}

export function dimensionsOverflow(dimensions: OverflowDimensions): boolean {
	return (
		dimensions.scrollWidth > dimensions.clientWidth + 1 ||
		dimensions.scrollHeight > dimensions.clientHeight + 1
	);
}

async function waitForImages(root: Node): Promise<void> {
	if (root.nodeType !== Node.ELEMENT_NODE) return;

	const element = root as Element;
	const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
	if (element.tagName === "IMG") images.unshift(element as HTMLImageElement);
	await Promise.all(images.map((image) => waitForImageReadiness(image)));
}

export async function waitForImageReadiness(
	image: ImageReadinessTarget,
	timeoutMs = IMAGE_READY_TIMEOUT_MS,
	timerHost: TimerHost = BROWSER_TIMER_HOST
): Promise<void> {
	if (image.decode) {
		const decoded = await settlesWithin(image.decode(), timeoutMs, timerHost);
		if (decoded || image.complete) return;
	} else if (image.complete) {
		return;
	}

	if (!image.addEventListener || !image.removeEventListener) return;

	await new Promise<void>((resolve) => {
		let timeoutId: unknown;
		const finish = (): void => {
			timerHost.clearTimeout(timeoutId);
			image.removeEventListener?.("load", finish);
			image.removeEventListener?.("error", finish);
			resolve();
		};

		image.addEventListener?.("load", finish);
		image.addEventListener?.("error", finish);
		timeoutId = timerHost.setTimeout(finish, timeoutMs);
	});
}

async function settlesWithin(
	promise: Promise<void>,
	timeoutMs: number,
	timerHost: TimerHost
): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (result: boolean): void => {
			if (settled) return;
			settled = true;
			timerHost.clearTimeout(timeoutId);
			resolve(result);
		};
		const timeoutId = timerHost.setTimeout(() => finish(false), timeoutMs);
		void promise.then(() => finish(true), () => finish(false));
	});
}

function pushMeasuredPage(output: BrewPage[], page: HTMLElement): void {
	output.push({ html: page.innerHTML.trim(), index: output.length + 1 });
}
