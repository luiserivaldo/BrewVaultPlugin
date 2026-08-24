import type { StateBlock } from "markdown-it";

const SPACER_RE = /^(:+)\s*$/;
const FIELD_RE = /^(.*?\S)\s+::\s+(\S.*)$/;

/**
 * Homebrewery template line semantics used by stat blocks and snippets:
 *
 * - `:` on its own is an invisible one-line vertical spacer (`::` is two).
 * - `Label :: value` is one visible field row. The delimiter is layout syntax,
 *   not document text, and consecutive source rows must not collapse into one
 *   CommonMark paragraph.
 */
export function templateLineRule(
	state: StateBlock,
	startLine: number,
	_endLine: number,
	silent: boolean
): boolean {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const end = state.eMarks[startLine];
	const line = state.src.slice(start, end).trim();

	const spacerMatch = SPACER_RE.exec(line);
	if (spacerMatch) {
		if (silent) return true;

		const lines = Math.min(spacerMatch[1].length, 4);
		const token = state.push("brew_template_spacer", "div", 0);
		token.attrSet("class", `blank brewBlank brewBlank-${lines}`);
		token.block = true;
		token.map = [startLine, startLine + 1];
		state.line = startLine + 1;
		return true;
	}

	const fieldMatch = FIELD_RE.exec(line);
	if (!fieldMatch) return false;
	if (silent) return true;

	const open = state.push("brew_template_field_open", "div", 1);
	open.attrSet("class", "brewDefinitionLine");
	open.block = true;
	open.map = [startLine, startLine + 1];

	const inline = state.push("inline", "", 0);
	inline.content = `${fieldMatch[1]} ${fieldMatch[2]}`;
	inline.map = [startLine, startLine + 1];
	inline.children = [];

	const close = state.push("brew_template_field_close", "div", -1);
	close.block = true;
	state.line = startLine + 1;
	return true;
}
