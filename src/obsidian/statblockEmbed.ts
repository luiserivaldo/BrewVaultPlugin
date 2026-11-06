import { MarkdownRenderChild, TFile, type MarkdownPostProcessorContext } from "obsidian";
import type BrewVaultPlugin from "../main";
import { renderBrewDocumentHtml } from "../renderer";
import { createEmbedShell } from "./brewBlockEmbed";
import { appendRenderedHtml } from "../renderer/renderedHtml";
import { EDITIONS, type Edition } from "../snippets/catalog";
import { renderStatBlockHtml, STATBLOCK_FENCE_LANGUAGE } from "../statblock/html";

/**
 * Edition picked with a block's switch, remembered for this session only so a
 * block keeps its edition while the note re-renders as you type. It is never
 * written to the note: changing a note's edition stays an explicit edit of
 * `bv_edition` or the block's `edition:` key.
 */
const editionChoices = new Map<string, Edition>();

/**
 * Renders `statblock` code blocks inside the note, in Reading view and Live
 * Preview, with no preview pane. The block goes through the same pipeline as
 * the export, so what shows here is what prints.
 */
export function registerStatBlockEmbed(plugin: BrewVaultPlugin): void {
	plugin.registerMarkdownCodeBlockProcessor(
		STATBLOCK_FENCE_LANGUAGE,
		(source, el, ctx) => {
			mountStatBlock(plugin, source, el, ctx);
		}
	);
}

function mountStatBlock(
	plugin: BrewVaultPlugin,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
): void {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	const note = file instanceof TFile ? file : null;
	const defaultEdition = note
		? plugin.resolveNoteEditionFor(note).edition
		: plugin.settings.defaultEdition;

	const line = ctx.getSectionInfo(el)?.lineStart;
	const memoryKey = `${ctx.sourcePath}#${line ?? source.slice(0, 80)}`;

	const { root, page } = createEmbedShell(plugin, el, note);
	const toolbar = root.createDiv({
		cls: "brewvault-statblock-toolbar",
		attr: { role: "group", "aria-label": "Stat block edition" },
	});
	const notes = root.createDiv({ cls: "brewvault-statblock-notes" });

	const child = new MarkdownRenderChild(root);
	ctx.addChild(child);

	const buttons = new Map<Edition, HTMLButtonElement>();
	const draw = (): void => {
		const rendered = renderStatBlockHtml(
			source,
			defaultEdition,
			(markdown) => renderBrewDocumentHtml(markdown),
			editionChoices.get(memoryKey)
		);
		page.empty();
		appendRenderedHtml(page, rendered.html);
		notes.empty();
		for (const warning of rendered.warnings) {
			notes.createDiv({ cls: "brewvault-statblock-warning", text: warning });
		}
		toolbar.toggleClass("is-hidden", !rendered.ok);
		for (const [edition, button] of buttons) {
			const active = edition === rendered.edition;
			button.toggleClass("is-active", active);
			button.setAttr("aria-pressed", String(active));
		}
	};

	for (const edition of EDITIONS) {
		const button = toolbar.createEl("button", {
			text: edition,
			cls: "brewvault-statblock-edition",
			attr: { type: "button", "aria-pressed": "false", "aria-label": `Show ${edition} stat block` },
		});
		buttons.set(edition, button);
		// Live Preview opens a code block for editing on click; the switch is not an edit.
		child.registerDomEvent(button, "mousedown", (event) => event.stopPropagation());
		child.registerDomEvent(button, "click", (event) => {
			event.stopPropagation();
			editionChoices.set(memoryKey, edition);
			draw();
		});
	}

	draw();
}
