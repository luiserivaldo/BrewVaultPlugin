import type { StateBlock } from "markdown-it";

/**
 * Homebrewery block-container syntax:
 *
 *   {{note,wide
 *   Body content, itself parsed as normal Markdown/nested blocks.
 *   }}
 *
 * The opening line is "{{" followed by one or more comma/space separated
 * class names and NOTHING else (an inline `{{class text}}` on a single line
 * is handled separately by inlineSpan.ts). The block is closed by a line
 * that is exactly "}}" (optionally indented to match the opener), and
 * nesting is supported by tracking brace depth across lines.
 */
const OPEN_RE = /^\{\{([a-zA-Z][a-zA-Z0-9_,\-\s]*)\s*$/;
const CLOSE_RE = /^\}\}\s*$/;

export function blockContainerRule(
	state: StateBlock,
	startLine: number,
	endLine: number,
	silent: boolean
): boolean {
	const startPos = state.bMarks[startLine] + state.tShift[startLine];
	const endPos = state.eMarks[startLine];
	const firstLine = state.src.slice(startPos, endPos);

	const openMatch = OPEN_RE.exec(firstLine.trim());
	if (!openMatch) return false;

	// Find the matching close, tracking nested {{ / }} opener lines so a
	// nested block's own "}}" doesn't prematurely close the outer one.
	let nextLine = startLine + 1;
	let depth = 1;
	let closeLine = -1;

	while (nextLine < endLine) {
		const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
		const lineEnd = state.eMarks[nextLine];
		const line = state.src.slice(lineStart, lineEnd).trim();

		if (OPEN_RE.test(line)) {
			depth++;
		} else if (CLOSE_RE.test(line)) {
			depth--;
			if (depth === 0) {
				closeLine = nextLine;
				break;
			}
		}
		nextLine++;
	}

	if (closeLine === -1) return false; // unterminated block, bail out safely
	if (silent) return true;

	const classNames = openMatch[1]
		.split(/[,\s]+/)
		.map((c) => c.trim())
		.filter(Boolean)
		.map((c) => `brew-${c}`)
		.join(" ");

	const openToken = state.push("brew_block_open", "div", 1);
	openToken.attrSet("class", `brewBlock ${classNames}`.trim());
	openToken.map = [startLine, closeLine];
	openToken.block = true;

	// Recursively parse the inner content as its own block sequence so
	// standard Markdown (and nested brew blocks) work inside containers.
	state.md.block.tokenize(state, startLine + 1, closeLine);

	const closeToken = state.push("brew_block_close", "div", -1);
	closeToken.block = true;

	state.line = closeLine + 1;
	return true;
}
