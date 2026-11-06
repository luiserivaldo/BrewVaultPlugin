import type BrewVaultPlugin from "../main";
import { findMonsterBlocks, monsterSectionAction, type MonsterBlock } from "../editor/monsterBlocks";
import { mountBrewMarkdown } from "./brewBlockEmbed";

export const HIDDEN_SECTION_CLASS = "brewvault-monster-hidden";

/**
 * Reading view: draws each `{{monster ... }}` block as its rendered stat block.
 * Obsidian hands a post-processor one section of the note at a time, so the
 * block is drawn in the section holding its opener and its other sections are
 * hidden.
 */
export function registerMonsterBlockReading(plugin: BrewVaultPlugin): void {
	let cachedText: string | null = null;
	let cachedBlocks: MonsterBlock[] = [];

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		const section = ctx.getSectionInfo(el);
		if (!section) return;

		if (section.text !== cachedText) {
			cachedText = section.text;
			cachedBlocks = findMonsterBlocks(section.text);
		}
		const action = monsterSectionAction(cachedBlocks, section.lineStart, section.lineEnd);
		if (action.kind === "hide") {
			el.empty();
			el.addClass(HIDDEN_SECTION_CLASS);
		} else if (action.kind === "render") {
			el.empty();
			mountBrewMarkdown(plugin, el, ctx.sourcePath, action.block.markdown);
		}
	});
}
