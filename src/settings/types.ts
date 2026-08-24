import type { SelectableThemeId } from "../themes/registry";

export type BrewTheme = SelectableThemeId;

export interface BrewVaultSettings {
	/** Which theme stylesheet variant to apply to the preview pages. */
	theme: BrewTheme;
	/** Vault-relative folder used for file-based exports. */
	exportFolder: string;
	/** Page width in pixels (US Letter at 96 CSS dpi). */
	pageWidthPx: number;
	/** Page height in pixels (US Letter at 96 CSS dpi). */
	pageHeightPx: number;
	/** Debounce, in milliseconds, between a file change and a re-render. */
	debounceMs: number;
}

export const LEGACY_DEFAULT_EXPORT_FOLDER = "BrewVault Exports";

export const DEFAULT_SETTINGS: BrewVaultSettings = {
	theme: "phb",
	exportFolder: "BrewVault-Exports",
	pageWidthPx: 816,
	pageHeightPx: 1056,
	debounceMs: 250,
};

export interface NormalizedSettings {
	settings: BrewVaultSettings;
	shouldPersist: boolean;
}

/**
 * Applies persisted-setting compatibility rules without touching the vault.
 * The original default folder is the only existing path renamed automatically;
 * every user-selected path remains user-owned.
 */
export function normalizeStoredSettings(
	stored: Record<string, unknown> | null
): NormalizedSettings {
	const rawTheme = stored?.theme;
	const theme: BrewTheme = isBrewTheme(rawTheme)
		? rawTheme
		: rawTheme === "journal"
			? "srd"
			: DEFAULT_SETTINGS.theme;

	const rawExportFolder = stored?.exportFolder;
	const trimmedExportFolder =
		typeof rawExportFolder === "string" && rawExportFolder.trim().length > 0
			? rawExportFolder.trim()
			: DEFAULT_SETTINGS.exportFolder;
	const exportFolder =
		rawExportFolder === LEGACY_DEFAULT_EXPORT_FOLDER
			? DEFAULT_SETTINGS.exportFolder
			: trimmedExportFolder;

	const settings = {
		...DEFAULT_SETTINGS,
		...(stored ?? {}),
		theme,
		exportFolder,
	};

	return {
		settings,
		shouldPersist:
			!stored || rawTheme !== theme || rawExportFolder !== exportFolder,
	};
}

export function isBrewTheme(value: unknown): value is BrewTheme {
	return value === "phb" || value === "srd" || value === "blank";
}
