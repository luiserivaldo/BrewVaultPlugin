import { splitIntoPages } from "../renderer/pageSplitter";
import type { BrewPage } from "../renderer/types";
import type { BookPlan, BookSegment } from "./plan";

export interface CompileBookOptions {
	/** Renders one segment's Markdown to HTML (each note with its own embeds). */
	readonly renderSegment: (segment: BookSegment) => Promise<string>;
	/** Splits explicit pages into physical pages with the note's theme and size. */
	readonly paginate: (pages: BrewPage[]) => Promise<BrewPage[]>;
}

/**
 * Renders every segment on its own (so each note's image embeds resolve
 * relative to that note), joins them into one document, and paginates it
 * like a single long note. `\page` lines anywhere still break pages.
 */
export async function compileBook(plan: BookPlan, options: CompileBookOptions): Promise<BrewPage[]> {
	const parts: string[] = [];
	for (const segment of plan.segments) parts.push(await options.renderSegment(segment));
	return options.paginate(splitIntoPages(parts.join("\n")));
}
