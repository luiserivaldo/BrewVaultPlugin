import { TFile } from "obsidian";
import type BrewVaultPlugin from "../main";
import { renderBrewDocumentHtml } from "../renderer";
import { appendRenderedHtml } from "../renderer/renderedHtml";
import { getThemeClassNames, isCustomThemeId } from "../themes/registry";
import { resolveVaultImageEmbeds } from "./resolveVaultImageEmbeds";

export const EMBED_CLASS = "brewvault-statblock-embed";

export interface EmbedShell {
	readonly root: HTMLElement;
	/** The page element the rendered block is drawn into. */
	readonly page: HTMLElement;
}

/**
 * The themed wrapper an in-note block is drawn in: the note's theme classes on
 * a `.page`, sized to one printed column by `statblock-embed.css`.
 */
export function createEmbedShell(
	plugin: BrewVaultPlugin,
	host: HTMLElement,
	file: TFile | null,
	extraClasses: readonly string[] = []
): EmbedShell {
	const theme = file
		? plugin.resolveNoteExportOptions(file).resolved.values.theme
		: plugin.settings.theme;
	if (isCustomThemeId(theme)) plugin.syncCustomStyleSheet(theme);

	const root = host.createDiv({
		cls: [EMBED_CLASS, "brewvault-pages", ...getThemeClassNames(theme), ...extraClasses],
	});
	const page = root.createDiv({ cls: "page brewPage" });
	return { root, page };
}

/**
 * Draws a block of Homebrewery Markdown (such as `{{monster,frame ... }}`) into
 * `host`, exactly as the preview and exports render it. Vault images inside it
 * resolve a moment later, once their files are found.
 */
export function mountBrewMarkdown(
	plugin: BrewVaultPlugin,
	host: HTMLElement,
	sourcePath: string | null,
	markdown: string
): void {
	const abstract = sourcePath ? plugin.app.vault.getAbstractFileByPath(sourcePath) : null;
	const file = abstract instanceof TFile ? abstract : null;
	const opener = /^\{\{[^\n]*/.exec(markdown)?.[0] ?? "";
	const classes = [
		...(/\bwide\b/.test(opener) ? ["is-wide"] : []),
		// A quote has no box of its own, so it is recoloured in dark mode to stay legible.
		...(/\bquote\b/.test(opener) ? ["is-quote"] : []),
	];
	const { page } = createEmbedShell(plugin, host, file, classes);

	appendRenderedHtml(page, renderBrewDocumentHtml(markdown));

	if (file && /!\[/.test(markdown)) {
		void resolveVaultImageEmbeds(markdown, file, plugin.app.vault, plugin.app.metadataCache).then(
			({ imageEmbeds }) => {
				if (!page.isConnected) return;
				page.empty();
				appendRenderedHtml(page, renderBrewDocumentHtml(markdown, { imageEmbeds }));
			}
		);
	}
}
