import type { StateInline } from "markdown-it";

/**
 * Homebrewery inline span syntax: {{className content here}}
 * Renders as <span class="brew-className">content here</span>.
 * Multiple classes: {{className1,className2 content}}. No classes: {{ content}}.
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

	// "{{ text}}" (a space straight after the braces) has no classes. Homebrewery
	// renders it as an inline-block span; table of contents rows use two.
	const classPart = inner.slice(0, spaceIdx).trim();
	const content = inner.slice(spaceIdx + 1).trim();
	if (!content || (classPart && !/^[a-zA-Z][a-zA-Z0-9_,-]*$/.test(classPart))) {
		return false;
	}

	// Absolute end position: "{{" + inner (up to closeIdx) + "}}". Silent
	// mode (link labels such as [{{ Title}}](#p2)) must advance it too.
	const end = start + 2 + closeIdx + 2;
	if (silent) {
		state.pos = end;
		return true;
	}

	const classNames = classPart
		? classPart
				.split(",")
				.map((c: string) => c.trim())
				.filter(Boolean)
				.flatMap((className: string) => [className, `brew-${className}`])
				.join(" ")
		: "inline-block";

	// Keep nested Markdown delimiters isolated from the outer inline parser.
	// Appending a nested parse directly to state.tokens corrupts markdown-it's
	// emphasis delimiter indexes in constructs such as
	// {{bonus **Proficiency Bonus** +3}}.
	const token = state.push("brew_span", "span", 0);
	token.attrSet("class", classNames);
	token.content = content;

	state.pos = end;
	return true;
}
