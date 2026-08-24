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
	const environment = {};
	const tokens = engine.parse(source, environment);

	// Pagination moves whole top-level rendered blocks. Retain the source line
	// on those blocks so a measured virtual break can be projected back into
	// CodeMirror without modifying the Markdown or guessing from line counts.
	for (const token of tokens) {
		if (token.level === 0 && token.map && token.type !== "brew_page_break") {
			token.attrSet("data-brew-source-line", String(token.map[0]));
		}
	}

	const html = engine.renderer.render(tokens, engine.options, environment);
	return splitIntoPages(html);
}
