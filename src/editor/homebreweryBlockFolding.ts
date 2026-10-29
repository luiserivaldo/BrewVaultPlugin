import { foldEffect, foldedRanges, foldService, unfoldEffect } from "@codemirror/language";
import type { EditorState, Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { blockFoldRange, findHomebreweryTagRanges } from "./homebreweryTagSyntax";

/** Fold ranges by opener line start, computed once per document version. */
const foldRangesByDoc = new WeakMap<Text, Map<number, { from: number; to: number }>>();

function foldRangesFor(doc: Text): Map<number, { from: number; to: number }> {
	let ranges = foldRangesByDoc.get(doc);
	if (!ranges) {
		ranges = new Map();
		for (const tag of findHomebreweryTagRanges(doc.toString())) {
			const range = blockFoldRange(tag);
			if (range) ranges.set(doc.lineAt(tag.from).from, range);
		}
		foldRangesByDoc.set(doc, ranges);
	}
	return ranges;
}

/** The fold range of the block opened on the line starting at `lineStart`. */
export function blockFoldAt(state: EditorState, lineStart: number): { from: number; to: number } | null {
	return foldRangesFor(state.doc).get(lineStart) ?? null;
}

/**
 * Makes every matched `{{block` foldable. Obsidian saves and restores editor
 * folds through CodeMirror, so a collapsed block stays collapsed when the
 * note is reopened.
 */
export const homebreweryBlockFoldService = foldService.of((state, lineStart) => blockFoldAt(state, lineStart));

/** True when the block whose fold starts at `from` is collapsed. */
export function isBlockFolded(state: EditorState, from: number): boolean {
	let folded = false;
	foldedRanges(state).between(from, from, (rangeFrom) => {
		if (rangeFrom === from) folded = true;
	});
	return folded;
}

/** Collapses or expands the block whose fold range is given. */
export function toggleBlockFold(view: EditorView, range: { from: number; to: number }): void {
	const folded: { from: number; to: number }[] = [];
	foldedRanges(view.state).between(range.from, range.from, (from, to) => {
		if (from === range.from) folded.push({ from, to });
	});
	view.dispatch({
		effects:
			folded.length > 0
				? folded.map((existing) => unfoldEffect.of(existing))
				: [foldEffect.of(range)],
	});
}
