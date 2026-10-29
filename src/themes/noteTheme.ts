import { isCustomThemeId, type SelectableThemeId, type ThemeSelectionId } from "./registry";
import type { CustomStyleDefinition } from "./customStyles";

/** Frontmatter key that selects a theme for one note. */
export const NOTE_THEME_PROPERTY = "bv_theme";

export type NoteThemeResolution =
	| { kind: "none" }
	| { kind: "theme"; theme: ThemeSelectionId }
	| { kind: "invalid"; value: string };

/**
 * Accepted spellings for built-in themes, compared case-insensitively. Each
 * theme accepts its id, its settings-dropdown label, and common short names.
 */
const BUILT_IN_THEME_ALIASES: Readonly<Record<string, SelectableThemeId>> = {
	phb: "phb",
	"5e phb": "phb",
	"player's handbook": "phb",
	"players handbook": "phb",
	dmg: "dmg",
	"5e dmg": "dmg",
	"dungeon master's guide": "dmg",
	"dungeon masters guide": "dmg",
	srd: "srd",
	ua: "srd",
	"unearthed arcana": "srd",
	"srd / unearthed arcana": "srd",
	blank: "blank",
};

/**
 * Interprets an untrusted `bv_theme` frontmatter value. Built-in themes match
 * by id or name; custom styles match by `custom:N` id or by their exact name
 * (case-insensitive). Absent or blank values mean "no per-note theme".
 */
export function resolveNoteTheme(
	value: unknown,
	customStyles: readonly CustomStyleDefinition[]
): NoteThemeResolution {
	if (value === undefined || value === null) return { kind: "none" };
	if (typeof value !== "string") return { kind: "invalid", value: JSON.stringify(value) };

	const trimmed = value.trim();
	if (!trimmed) return { kind: "none" };
	const key = trimmed.toLowerCase();

	const builtIn = BUILT_IN_THEME_ALIASES[key];
	if (builtIn) return { kind: "theme", theme: builtIn };

	const custom = customStyles.find(
		(style) => style.id === key || style.name.trim().toLowerCase() === key
	);
	if (custom && isCustomThemeId(custom.id)) return { kind: "theme", theme: custom.id };

	return { kind: "invalid", value: trimmed };
}

export function formatInvalidNoteThemeMessage(noteName: string, value: string): string {
	return `Unknown ${NOTE_THEME_PROPERTY} "${value}" in "${noteName}". Using the theme from settings.`;
}

/**
 * Applies BrewVault's theme precedence: an explicit command theme, then the
 * note's `bv_theme`, then the theme chosen in settings.
 */
export function chooseExportTheme(
	commandTheme: ThemeSelectionId | undefined,
	noteTheme: NoteThemeResolution,
	settingsTheme: ThemeSelectionId
): ThemeSelectionId {
	if (commandTheme) return commandTheme;
	return noteTheme.kind === "theme" ? noteTheme.theme : settingsTheme;
}
