import type { MetadataCache, TFile } from "obsidian";
import type { CustomStyleDefinition } from "../themes/customStyles";
import {
	NOTE_THEME_PROPERTY,
	resolveNoteTheme,
	type NoteThemeResolution,
} from "../themes/noteTheme";

/** Reads a note's `bv_theme` from Obsidian's parsed frontmatter cache. */
export function readNoteTheme(
	file: TFile,
	metadataCache: MetadataCache,
	customStyles: readonly CustomStyleDefinition[]
): NoteThemeResolution {
	const frontmatter: unknown = metadataCache.getFileCache(file)?.frontmatter;
	const value =
		typeof frontmatter === "object" && frontmatter !== null
			? (frontmatter as Record<string, unknown>)[NOTE_THEME_PROPERTY]
			: undefined;
	return resolveNoteTheme(value, customStyles);
}
