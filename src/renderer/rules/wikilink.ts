import type { StateInline } from "markdown-it";

/**
 * Renders Obsidian wikilinks as plain labels and suppresses unresolved embeds.
 * BrewVault does not mutate source notes or emit vault-internal destinations
 * into standalone HTML/PDF output.
 */
export function wikilinkRule(state: StateInline, silent: boolean): boolean {
	const start = state.pos;
	const embedded =
		state.src.charCodeAt(start) === 0x21 /* ! */ &&
		state.src.charCodeAt(start + 1) === 0x5b /* [ */ &&
		state.src.charCodeAt(start + 2) === 0x5b;
	const linked =
		state.src.charCodeAt(start) === 0x5b /* [ */ &&
		state.src.charCodeAt(start + 1) === 0x5b;

	if (!embedded && !linked) return false;

	const contentStart = start + (embedded ? 3 : 2);
	const close = state.src.indexOf("]]", contentStart);
	if (close === -1) return false;

	const newline = state.src.indexOf("\n", contentStart);
	if (newline !== -1 && newline < close) return false;

	const inner = state.src.slice(contentStart, close).trim();
	if (!inner) return false;
	if (silent) return true;

	if (!embedded) {
		const separator = inner.indexOf("|");
		const target = (separator === -1 ? inner : inner.slice(0, separator)).trim();
		const alias = separator === -1 ? "" : inner.slice(separator + 1).trim();
		const token = state.push("text", "", 0);
		token.content = alias || formatWikilinkTarget(target);
	}

	state.pos = close + 2;
	return true;
}

/** Mirrors Obsidian's compact display for unaliased note targets. */
export function formatWikilinkTarget(target: string): string {
	const fragmentAt = target.search(/[#^]/);
	const withoutFragment = fragmentAt === -1 ? target : target.slice(0, fragmentAt);
	const basename = withoutFragment.slice(withoutFragment.lastIndexOf("/") + 1);
	return basename.replace(/\.md$/i, "") || target;
}
