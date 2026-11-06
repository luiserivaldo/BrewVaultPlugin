import { findHomebreweryTagRanges } from "./homebreweryTagSyntax";

/** A `{{monster ... }}` Homebrewery block found in note text. */
export interface MonsterBlock {
	/** Start of the opener's line. */
	readonly from: number;
	/** End of the closing `}}` line. */
	readonly to: number;
	/** First and last source line of the block, 0-based and inclusive. */
	readonly firstLine: number;
	readonly lastLine: number;
	/** Class names on the opener, such as `monster`, `frame`, `wide`. */
	readonly classes: readonly string[];
	/** The block's own Markdown, opener and closer included. */
	readonly markdown: string;
}

const OPENER_RE = /^\{\{([a-zA-Z][a-zA-Z0-9_,\-\s]*)\s*$/;

/**
 * Finds the stat blocks a note writes as Homebrewery `{{monster,frame ... }}`
 * containers, outermost first. Blocks inside code fences and unterminated
 * openers are not blocks, matching the renderer. A monster block nested inside
 * another monster block belongs to the outer one.
 */
export function findMonsterBlocks(source: string): MonsterBlock[] {
	const blocks: MonsterBlock[] = [];
	let lineStarts: number[] | null = null;
	let coveredUntil = -1;

	for (const tag of findHomebreweryTagRanges(source)) {
		if (tag.kind !== "open" || tag.blockEnd === undefined) continue;
		if (tag.from < coveredUntil) continue;

		const opener = OPENER_RE.exec(source.slice(tag.from, tag.to).trim());
		const classes = opener ? opener[1].split(/[,\s]+/).filter(Boolean) : [];
		if (!classes.includes("monster")) continue;

		lineStarts ??= computeLineStarts(source);
		const from = lineStartOf(source, tag.from);
		coveredUntil = tag.blockEnd;
		blocks.push({
			from,
			to: tag.blockEnd,
			firstLine: lineIndexAt(lineStarts, from),
			lastLine: lineIndexAt(lineStarts, tag.blockEnd),
			classes,
			markdown: source.slice(from, tag.blockEnd),
		});
	}
	return blocks;
}

function lineStartOf(source: string, offset: number): number {
	return source.lastIndexOf("\n", offset - 1) + 1;
}

function computeLineStarts(source: string): number[] {
	const starts = [0];
	for (let index = source.indexOf("\n"); index !== -1; index = source.indexOf("\n", index + 1)) {
		starts.push(index + 1);
	}
	return starts;
}

/** Index of the line containing `offset`, by binary search over line starts. */
function lineIndexAt(lineStarts: readonly number[], offset: number): number {
	let low = 0;
	let high = lineStarts.length - 1;
	while (low < high) {
		const middle = Math.ceil((low + high) / 2);
		if (lineStarts[middle] <= offset) low = middle;
		else high = middle - 1;
	}
	return low;
}

/**
 * What Reading view should do with one rendered section of the note, given the
 * section's line span (`lineStart`..`lineEnd`, 0-based, inclusive).
 *
 * Obsidian renders a note as separate sections (a heading, a table, a
 * paragraph), so a multi-section block is drawn once, in the section holding
 * its opener, and the rest of its sections are hidden.
 */
export type MonsterSectionAction =
	| { readonly kind: "leave" }
	| { readonly kind: "render"; readonly block: MonsterBlock }
	| { readonly kind: "hide" };

export function monsterSectionAction(
	blocks: readonly MonsterBlock[],
	lineStart: number,
	lineEnd: number
): MonsterSectionAction {
	for (const block of blocks) {
		if (lineEnd < block.firstLine || lineStart > block.lastLine) continue;
		// A section that also holds text outside the block cannot be replaced or
		// hidden without losing that text, so it is left as Obsidian drew it.
		if (lineStart < block.firstLine || lineEnd > block.lastLine) return { kind: "leave" };
		return lineStart === block.firstLine ? { kind: "render", block } : { kind: "hide" };
	}
	return { kind: "leave" };
}
