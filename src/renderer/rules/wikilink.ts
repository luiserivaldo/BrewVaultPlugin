import type { StateInline } from "markdown-it";
import { isBrewRenderEnvironment } from "../imageEmbeds";

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

	const separator = inner.indexOf("|");
	const target = (separator === -1 ? inner : inner.slice(0, separator)).trim();
	const alias = separator === -1 ? "" : inner.slice(separator + 1).trim();

	if (embedded) {
		const environment: unknown = state.env;
		const resolved = isBrewRenderEnvironment(environment)
			? environment.imageEmbeds?.get(target)
			: undefined;
		if (resolved) {
			const token = state.push("brew_vault_image", "img", 0);
			token.attrSet("src", resolved.src);
			token.attrSet("alt", imageAltText(target, alias));
			const dimensions = parseImageDimensions(alias);
			if (dimensions.width) token.attrSet("width", String(dimensions.width));
			if (dimensions.height) token.attrSet("height", String(dimensions.height));
		}
	} else {
		const token = state.push("text", "", 0);
		token.content = alias || formatWikilinkTarget(target);
	}

	state.pos = close + 2;
	return true;
}

function imageAltText(target: string, alias: string): string {
	return parseImageDimensions(alias).isDimension
		? formatImageTarget(target)
		: alias || formatImageTarget(target);
}

function formatImageTarget(target: string): string {
	const fragmentAt = target.search(/[#^]/);
	const withoutFragment = fragmentAt === -1 ? target : target.slice(0, fragmentAt);
	const basename = withoutFragment.slice(withoutFragment.lastIndexOf("/") + 1);
	return basename.replace(/\.[^.]+$/, "") || "Embedded image";
}

function parseImageDimensions(alias: string): {
	readonly isDimension: boolean;
	readonly width?: number;
	readonly height?: number;
} {
	const match = /^(\d+)(?:x(\d+))?$/.exec(alias);
	if (!match) return { isDimension: false };
	const width = Number(match[1]);
	const height = match[2] ? Number(match[2]) : undefined;
	return { isDimension: true, width, height };
}

/** Mirrors Obsidian's compact display for unaliased note targets. */
export function formatWikilinkTarget(target: string): string {
	const fragmentAt = target.search(/[#^]/);
	const withoutFragment = fragmentAt === -1 ? target : target.slice(0, fragmentAt);
	const basename = withoutFragment.slice(withoutFragment.lastIndexOf("/") + 1);
	return basename.replace(/\.md$/i, "") || target;
}
