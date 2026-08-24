import type { BrewPage } from "../renderer/types";

export interface AutomaticPageBreak {
	/** Zero-based source line before which the generated page begins. */
	line: number;
	/** One-based physical page number shown in preview/export. */
	pageNumber: number;
}

/** Selects only DOM-measured virtual page boundaries with source positions. */
export function collectAutomaticPageBreaks(
	pages: readonly BrewPage[]
): AutomaticPageBreak[] {
	return pages.flatMap((page) =>
		page.breakKind === "automatic" && page.sourceLine !== null
			? [{ line: page.sourceLine, pageNumber: page.index }]
			: []
	);
}
