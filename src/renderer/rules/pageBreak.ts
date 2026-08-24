import type { StateBlock } from "markdown-it";

/**
 * Homebrewery page-break syntax: a line containing only "\page".
 * Emits a marker token; pageSplitter.ts later cuts the token stream on
 * these markers to produce separate page fragments.
 */
export function pageBreakRule(
	state: StateBlock,
	startLine: number,
	_endLine: number,
	silent: boolean
): boolean {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const end = state.eMarks[startLine];
	const line = state.src.slice(start, end).trim();

	if (line !== "\\page") return false;
	if (silent) return true;

	const token = state.push("brew_page_break", "", 0);
	token.map = [startLine, startLine + 1];

	state.line = startLine + 1;
	return true;
}
