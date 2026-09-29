import { createBrewMarkdownEngine } from "./markdownEngine";
import { splitIntoPages } from "./pageSplitter";
import type { BrewPage } from "./types";
import type { BrewRenderOptions, BrewRenderEnvironment } from "./imageEmbeds";

export type { BrewPage } from "./types";
export type { BrewRenderOptions, ResolvedImageEmbed } from "./imageEmbeds";

/**
 * Renders raw note source (CommonMark + Homebrewery extensions) into an
 * array of paginated HTML fragments, one per `\page`-delimited section.
 *
 * A new markdown-it engine is created per call. This is intentionally
 * simple (not the fastest possible approach) but keeps rendering fully
 * stateless and safe to call from a debounced file-watch handler without
 * worrying about stale plugin state between notes.
 */
export function renderBrewMarkdown(
	source: string,
	options: BrewRenderOptions = {}
): BrewPage[] {
	return splitIntoPages(renderBrewDocumentHtml(source, options));
}

/**
 * Renders one sanitized semantic HTML document without applying physical page
 * splitting. Exporters that do not use BrewVault's fixed-page HTML layout can
 * consume this boundary without creating a second Markdown parser.
 */
export function renderBrewDocumentHtml(
	source: string,
	options: BrewRenderOptions = {}
): string {
	const engine = createBrewMarkdownEngine();
	const environment: BrewRenderEnvironment = {
		imageEmbeds: options.imageEmbeds,
	};
	return engine.render(source, environment);
}
