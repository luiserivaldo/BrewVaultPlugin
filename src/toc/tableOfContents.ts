import { BLOCK_CLOSE, BLOCK_OPEN, FENCE } from "../book/manifest";
import type { BrewPage } from "../renderer/types";

/** A heading found on a paginated page. */
export interface TocHeading {
	readonly level: number;
	readonly text: string;
	/** 1-based position of the page in the document, as in BrewPage.index. */
	readonly pageIndex: number;
	/** Vault path of the note the heading was written in, when known. */
	readonly sourcePath?: string;
}

/** Deepest heading level listed: `#`, `##`, and `###`, as in Homebrewery. */
export const TOC_MAX_LEVEL = 3;
export const TOC_OPENER = "{{toc,wide";
export const TOC_HEADER = "# Table of Contents";

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
const VOID_TAGS = new Set(["area", "br", "col", "embed", "hr", "img", "input", "source", "track", "wbr"]);
const TOC_CLASS = /\bclass="[^"]*\btoc\b/;
const BLOCK_CLASS = /\bclass="[^"]*\bbrewBlock\b/;
const SOURCE_ATTRIBUTE = /\bdata-brewvault-source="([^"]*)"/;
/** A row's link: `](#p12)` or `](#p12 "Note#Heading")`. */
const ROW_LINK = /\]\(#p(\d+)(?:\s+"((?:[^"\\]|\\.)*)")?\)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;
/** Markdown before each row's link, by depth: Homebrewery's toc snippet layout. */
const ROW_PREFIX = ["### ", "#### ", ""];

/** What an open element is inside of, while scanning a page. */
interface OpenElement {
	readonly inToc: boolean;
	/** The outermost `{{block` around the element, shared by everything in it. */
	readonly block: { titled: boolean } | null;
}

/**
 * Finds the headings on rendered pages, in reading order. Headings inside a
 * `{{toc}}` block are skipped, so the contents never list themselves.
 *
 * A `{{block` is one item on the page, so it lists at most its first heading:
 * a monster's name, not its Traits or Actions. Headings after that, and in
 * blocks nested inside it, are skipped. The title nests under the section
 * it sits in: a `## Imp` stat block under `## Monsters` is listed one level
 * deeper, as `###`.
 *
 * The HTML comes from markdown-it with raw HTML disabled, so its tags are
 * well formed and a tag scanner is enough.
 */
export function detectHeadings(pages: readonly BrewPage[], maxLevel = TOC_MAX_LEVEL): TocHeading[] {
	const headings: TocHeading[] = [];
	/** Level of the last heading outside any block: the section blocks sit in. */
	let sectionLevel = 0;
	for (const page of pages) {
		const open: OpenElement[] = [];
		let heading: { tag: string; level: number; start: number; sourcePath?: string } | null = null;

		for (const match of page.html.matchAll(TAG)) {
			const [raw, closing, tagName, attributes] = match;
			const name = tagName.toLowerCase();
			if (closing) {
				open.pop();
				if (heading !== null && name === heading.tag) {
					const text = htmlToText(page.html.slice(heading.start, match.index));
					if (text) {
						headings.push({
							level: heading.level,
							text,
							pageIndex: page.index,
							...(heading.sourcePath ? { sourcePath: heading.sourcePath } : {}),
						});
					}
					heading = null;
				}
				continue;
			}
			if (VOID_TAGS.has(name) || raw.endsWith("/>")) continue;

			const parent = open.length > 0 ? open[open.length - 1] : null;
			const element: OpenElement = {
				inToc: (parent?.inToc ?? false) || TOC_CLASS.test(attributes),
				block: parent?.block ?? (BLOCK_CLASS.test(attributes) ? { titled: false } : null),
			};
			open.push(element);
			const level = /^h([1-6])$/.exec(name);
			if (!level || heading !== null || element.inToc) continue;
			// A block's first heading is its title, even when too deep to list.
			const isBlockTitle = element.block !== null && !element.block.titled;
			if (element.block) element.block.titled = true;
			if ((element.block === null || isBlockTitle) && Number(level[1]) <= maxLevel) {
				const source = SOURCE_ATTRIBUTE.exec(attributes)?.[1];
				if (element.block === null) sectionLevel = Number(level[1]);
				heading = {
					tag: name,
					level: isBlockTitle ? Math.max(Number(level[1]), sectionLevel + 1) : Number(level[1]),
					start: match.index + raw.length,
					...(source ? { sourcePath: decodeEntities(source) } : {}),
				};
			}
		}
	}
	return headings;
}

/**
 * Nests headings from included notes under the compiling note's section.
 * Each run of headings from one included note is shifted as a whole, keeping
 * its own shape, so that its shallowest heading sits one level below the
 * compiling note's last heading: a note's `## Druid Spell List` included under
 * `## Everything else` is listed as `###`. Headings are never moved up.
 */
export function nestIncludedHeadings(headings: readonly TocHeading[], hostPath: string): TocHeading[] {
	const nested: TocHeading[] = [];
	let sectionLevel = 0;
	for (let start = 0; start < headings.length; ) {
		const source = headings[start].sourcePath;
		if (source === undefined || source === hostPath) {
			sectionLevel = headings[start].level;
			nested.push(headings[start]);
			start++;
			continue;
		}
		let end = start;
		while (end < headings.length && headings[end].sourcePath === source) end++;
		const run = headings.slice(start, end);
		const shift = Math.max(0, sectionLevel + 1 - Math.min(...run.map((heading) => heading.level)));
		for (const heading of run) nested.push({ ...heading, level: heading.level + shift });
		start = end;
	}
	return nested;
}

/**
 * One list row per heading, as Homebrewery writes them:
 * `- ### [{{ Title}}{{ 12}}](#p12)`. The shallowest level found becomes the
 * top of the list, and a row is never indented more than one step past the
 * row above it, so skipped levels still nest cleanly.
 *
 * `targetFor` names where a row jumps to in the vault, such as `Imp#Imp`. It
 * is written as the link's title, which Homebrewery shows as a tooltip, so
 * the row still works there.
 */
export function formatTocRows(
	headings: readonly TocHeading[],
	firstPageNumber: number,
	targetFor: (heading: TocHeading) => string | null = () => null
): string[] {
	if (headings.length === 0) return [];
	const top = Math.min(...headings.map((heading) => heading.level));
	const rows: string[] = [];
	let previousDepth = -1;
	for (const heading of headings) {
		const depth = Math.min(heading.level - top, previousDepth + 1, ROW_PREFIX.length - 1);
		previousDepth = depth;
		const pageNumber = firstPageNumber + heading.pageIndex - 1;
		const target = targetFor(heading);
		const title = target ? ` "${target.replace(/(["\\])/g, "\\$1")}"` : "";
		rows.push(
			`${"  ".repeat(depth)}- ${ROW_PREFIX[depth]}[{{ ${escapeRowText(heading.text)}}}{{ ${pageNumber}}}](#p${heading.pageIndex}${title})`
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

/** The page and vault target of a contents row's link, or null if the line has none. */
export function parseTocRowLink(line: string): { pageIndex: number; target: string | null } | null {
	const link = ROW_LINK.exec(line);
	if (!link) return null;
	return {
		pageIndex: Number(link[1]),
		target: link[2] === undefined ? null : link[2].replace(/\\(.)/g, "$1"),
	};
}

/** Splits a row target such as `SRD/Imp#Lair actions` into note and heading. */
export function splitTocTarget(target: string): { linkpath: string; heading: string } {
	const hash = target.indexOf("#");
	return hash === -1
		? { linkpath: target, heading: "" }
		: { linkpath: target.slice(0, hash), heading: target.slice(hash + 1) };
}

/**
 * Finds the line of the heading a row names. Rows hold the heading as shown
 * on the page, so Markdown marks are ignored when comparing: `Spells &
 * *Charms*` in the note matches `Spells & Charms` in the row.
 */
export function findHeadingLine(
	headings: readonly { readonly heading: string; readonly line: number }[],
	text: string
): number | null {
	const wanted = comparableHeading(text);
	return headings.find((heading) => comparableHeading(heading.heading) === wanted)?.line ?? null;
}

function comparableHeading(text: string): string {
	return text
		.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_match, target: string, alias?: string) => alias ?? target)
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*_`~=]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function htmlToText(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, ""))
		.replace(/\s+/g, " ")
		.trim();
}

function decodeEntities(html: string): string {
	return html
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
}

/** Keeps heading text from closing the row's link or span early. */
function escapeRowText(text: string): string {
	return text.replace(/([[\]\\{}])/g, "\\$1");
}
