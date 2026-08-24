import { createBrewMarkdownEngine } from "./markdownEngine";
import { splitIntoPages } from "./pageSplitter";
import type { BrewPage } from "./types";

export type { BrewPage } from "./types";

/**
 * Renders raw note source (CommonMark + Homebrewery extensions) into an
 * array of paginated HTML fragments, one per `\page`-delimited section.
 *
 * A new markdown-it engine is created per call. This is intentionally
 * simple (not the fastest possible approach) but keeps rendering fully
 * stateless and safe to call from a debounced file-watch handler without
 * worrying about stale plugin state between notes.
 */
export function renderBrewMarkdown(source: string): BrewPage[] {
	const engine = createBrewMarkdownEngine();
	const html = engine.render(source);
	return splitIntoPages(html);
}
