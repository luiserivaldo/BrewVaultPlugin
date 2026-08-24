import type { StateInline } from "markdown-it";

/**
 * Homebrewery inline span syntax: {{className content here}}
 * Renders as <span class="brew-className">content here</span>.
 * Multiple classes: {{className1,className2 content}}.
 *
 * This only matches when "{{" and the matching "}}" are on the SAME line
 * (single inline token) — multi-line usage is handled by blockContainer.ts.
 */
export function inlineSpanRule(state: StateInline, silent: boolean): boolean {
	const src = state.src;
	const start = state.pos;

	if (src.charCodeAt(start) !== 0x7b /* { */ || src.charCodeAt(start + 1) !== 0x7b) {
		return false;
	}

	// Must not look like a block-open ("{{class" with nothing after it on
	// the line) — require at least one space-separated content token before
	// the closing braces, on the same line.
	const rest = src.slice(start + 2);
	const newlineIdx = rest.indexOf("\n");
	const searchSpace = newlineIdx === -1 ? rest : rest.slice(0, newlineIdx);

	const closeIdx = searchSpace.indexOf("}}");
	if (closeIdx === -1) return false;

	const inner = searchSpace.slice(0, closeIdx);
	const spaceIdx = inner.indexOf(" ");
	if (spaceIdx === -1) return false; // no content -> not a valid inline span

	const classPart = inner.slice(0, spaceIdx).trim();
	const content = inner.slice(spaceIdx + 1).trim();
	if (!classPart || !content || !/^[a-zA-Z][a-zA-Z0-9_,\-]*$/.test(classPart)) {
		return false;
	}

	if (silent) return true;

	const classNames = classPart
		.split(",")
		.map((c: string) => c.trim())
		.filter(Boolean)
		.map((c: string) => `brew-${c}`)
		.join(" ");

	const openToken = state.push("brew_span_open", "span", 1);
	openToken.attrSet("class", classNames);

	const textToken = state.push("text", "", 0);
	textToken.content = content;

	state.push("brew_span_close", "span", -1);

	// Absolute end position: "{{" + inner (up to closeIdx) + "}}"
	state.pos = start + 2 + closeIdx + 2;
	return true;
}
