import type { StateBlock } from "markdown-it";

/**
 * Homebrewery column-break syntax: a line containing only "\column".
 * Renders as a <div class="columnSplit"> which the theme CSS uses to force
 * a CSS multi-column break.
 */
export function columnBreakRule(
	state: StateBlock,
	startLine: number,
	_endLine: number,
	silent: boolean
): boolean {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const end = state.eMarks[startLine];
	const line = state.src.slice(start, end).trim();

	if (line !== "\\column") return false;
	if (silent) return true;

	const token = state.push("brew_column_break", "div", 0);
	token.attrSet("class", "columnSplit");
	token.map = [startLine, startLine + 1];

	state.line = startLine + 1;
	return true;
}
