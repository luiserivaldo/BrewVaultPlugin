import { PAGE_BREAK_SENTINEL } from "./markdownEngine";
import type { BrewPage } from "./types";

/**
 * Splits a single rendered HTML string on `\page` sentinels into an array
 * of BrewPage fragments. A document with no `\page` markers yields exactly
 * one page, which is what Milestone 1 relied on before this rule existed.
 */
export function splitIntoPages(renderedHtml: string): BrewPage[] {
	const fragments = renderedHtml
		.split(PAGE_BREAK_SENTINEL)
		.map((html) => html.trim())
		.filter((html) => html.length > 0);

	// An empty document should still render one (empty) page rather than
	// zero, so the preview pane never looks "broken".
	if (fragments.length === 0) fragments.push("");

	return fragments.map((html, i) => ({ html, index: i + 1 }));
}
