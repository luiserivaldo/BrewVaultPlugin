import type { Edition } from "../snippets/catalog";
import { parseStatBlock } from "./parse";
import { serializeStatBlock } from "./serialize";

export const STATBLOCK_FENCE_LANGUAGE = "statblock";
export const STATBLOCK_ERROR_CLASS = "brewvault-statblock-error";

export interface RenderedStatBlock {
	readonly html: string;
	/** Edition actually printed; unchanged by errors. */
	readonly edition: Edition;
	readonly ok: boolean;
	readonly warnings: readonly string[];
}

/**
 * Renders the YAML of one `statblock` fence to HTML. The edition is the first
 * of: an explicit `override` (the in-note toggle), the block's own `edition`
 * key, then `defaultEdition` (the note's `bv_edition`, else the setting).
 * `renderMarkdown` is the shared Homebrewery renderer, injected so this module
 * never depends on the renderer that calls it.
 */
export function renderStatBlockHtml(
	source: string,
	defaultEdition: Edition,
	renderMarkdown: (markdown: string) => string,
	override?: Edition
): RenderedStatBlock {
	const parsed = parseStatBlock(source);
	if (!parsed.ok) {
		return {
			html: errorHtml(parsed.errors),
			edition: override ?? defaultEdition,
			ok: false,
			warnings: [],
		};
	}
	const edition = override ?? parsed.edition ?? defaultEdition;
	return {
		html: renderMarkdown(serializeStatBlock(parsed.block, edition)),
		edition,
		ok: true,
		warnings: parsed.warnings,
	};
}

function errorHtml(errors: readonly string[]): string {
	const items = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("");
	return `<div class="${STATBLOCK_ERROR_CLASS}"><strong>Stat block problem</strong><ul>${items}</ul></div>\n`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
