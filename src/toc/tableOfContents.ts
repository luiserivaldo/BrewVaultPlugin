import { BLOCK_CLOSE, BLOCK_OPEN, FENCE } from "../book/manifest";
import type { BrewPage } from "../renderer/types";

/** A heading found on a paginated page. */
export interface TocHeading {
	readonly level: number;
	readonly text: string;
	/** 1-based position of the page in the document, as in BrewPage.index. */
	readonly pageIndex: number;
}

/** Deepest heading level listed: `#`, `##`, and `###`, as in Homebrewery. */
export const TOC_MAX_LEVEL = 3;
export const TOC_OPENER = "{{toc,wide";
export const TOC_HEADER = "# Table of Contents";

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
const VOID_TAGS = new Set(["area", "br", "col", "embed", "hr", "img", "input", "source", "track", "wbr"]);
const TOC_CLASS = /\bclass="[^"]*\btoc\b/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;
/** Markdown before each row's link, by depth: Homebrewery's toc snippet layout. */
const ROW_PREFIX = ["### ", "#### ", ""];

/**
 * Finds the headings on rendered pages, in reading order. Headings inside a
 * `{{toc}}` block are skipped, so the contents never list themselves.
 * The HTML comes from markdown-it with raw HTML disabled, so its tags are
 * well formed and a tag scanner is enough.
 */
export function detectHeadings(pages: readonly BrewPage[], maxLevel = TOC_MAX_LEVEL): TocHeading[] {
	const headings: TocHeading[] = [];
	for (const page of pages) {
		/** For each open element: whether it is inside a `{{toc}}` block. */
		const open: boolean[] = [];
		let heading: { level: number; start: number } | null = null;

		for (const match of page.html.matchAll(TAG)) {
			const [raw, closing, tagName, attributes] = match;
			const name = tagName.toLowerCase();
			if (closing) {
				open.pop();
				if (heading !== null && name === `h${heading.level}`) {
					const text = htmlToText(page.html.slice(heading.start, match.index));
					if (text) headings.push({ level: heading.level, text, pageIndex: page.index });
					heading = null;
				}
				continue;
			}
			if (VOID_TAGS.has(name) || raw.endsWith("/>")) continue;

			const inToc = (open.length > 0 && open[open.length - 1]) || TOC_CLASS.test(attributes);
			open.push(inToc);
			const level = /^h([1-6])$/.exec(name);
			if (level && heading === null && !inToc && Number(level[1]) <= maxLevel) {
				heading = { level: Number(level[1]), start: match.index + raw.length };
			}
		}
	}
	return headings;
}

/**
 * One list row per heading, as Homebrewery writes them:
 * `- ### [{{ Title}}{{ 12}}](#p12)`. The shallowest level found becomes the
 * top of the list, and a row is never indented more than one step past the
 * row above it, so skipped levels still nest cleanly.
 */
export function formatTocRows(headings: readonly TocHeading[], firstPageNumber: number): string[] {
	if (headings.length === 0) return [];
	const top = Math.min(...headings.map((heading) => heading.level));
	const rows: string[] = [];
	let previousDepth = -1;
	for (const heading of headings) {
		const depth = Math.min(heading.level - top, previousDepth + 1, ROW_PREFIX.length - 1);
		previousDepth = depth;
		const pageNumber = firstPageNumber + heading.pageIndex - 1;
		rows.push(
			`${"  ".repeat(depth)}- ${ROW_PREFIX[depth]}[{{ ${escapeRowText(heading.text)}}}{{ ${pageNumber}}}](#p${heading.pageIndex})`
		);
	}
	return rows;
}

/** A `{{toc` block in a note: where it is, and the lines kept on refresh. */
export interface TocBlock {
	/** 0-based line of the opener. */
	readonly startLine: number;
	/** 0-based line of the closing `}}`. */
	readonly endLine: number;
	/** The opener as written, keeping classes such as `wide`. */
	readonly opener: string;
	/** Lines before the list, such as the `# Table of Contents` heading. */
	readonly header: readonly string[];
}

/** Finds the first closed `{{toc` block outside code fences. */
export function findTocBlock(source: string): TocBlock | null {
	const lines = source.split(/\r?\n/);
	let fence: string | null = null;
	for (let index = 0; index < lines.length; index++) {
		const fenceMatch = FENCE.exec(lines[index]);
		if (fence !== null) {
			if (fenceMatch && fenceMatch[1].startsWith(fence)) fence = null;
			continue;
		}
		if (fenceMatch) {
			fence = fenceMatch[1];
			continue;
		}
		const opener = BLOCK_OPEN.exec(lines[index]);
		if (opener?.[1].split(/[,\s]+/)[0]?.toLowerCase() !== "toc") continue;

		let depth = 1;
		const header: string[] = [];
		let inHeader = true;
		for (let end = index + 1; end < lines.length; end++) {
			const line = lines[end];
			if (BLOCK_OPEN.test(line)) depth++;
			else if (BLOCK_CLOSE.test(line) && --depth === 0) {
				while (header.length > 0 && header[header.length - 1].trim() === "") header.pop();
				return { startLine: index, endLine: end, opener: lines[index].trim(), header };
			}
			if (inHeader && LIST_ITEM.test(line)) inHeader = false;
			if (inHeader) header.push(line);
		}
		return null;
	}
	return null;
}

/** The whole `{{toc` block, ready to write into the note. */
export function buildTocBlock(
	rows: readonly string[],
	opener = TOC_OPENER,
	header: readonly string[] = [TOC_HEADER]
): string {
	return [opener, ...header, ...(header.length > 0 ? [""] : []), ...rows, "}}"].join("\n");
}

function htmlToText(html: string): string {
	return html
		.replace(/<[^>]*>/g, "")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
}

/** Keeps heading text from closing the row's link or span early. */
function escapeRowText(text: string): string {
	return text.replace(/([[\]\\{}])/g, "\\$1");
}
