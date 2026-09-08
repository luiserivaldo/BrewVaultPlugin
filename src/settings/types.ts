import {
	isCustomThemeId,
	isSelectableThemeId,
	type ThemeSelectionId,
} from "../themes/registry";
import {
	inferNextCustomStyleNumber,
	normalizeStoredCustomStyles,
	type CustomStyleDefinition,
} from "../themes/customStyles";

export type BrewTheme = ThemeSelectionId;

export interface BrewVaultSettings {
	/** Which theme stylesheet variant to apply to the preview pages. */
	theme: BrewTheme;
	/** User-submitted, self-contained CSS styles. */
	customStyles: CustomStyleDefinition[];
	/** Monotonic suffix reserved for the next unnamed custom style. */
	nextCustomStyleNumber: number;
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
	customStyles: [],
	nextCustomStyleNumber: 1,
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
	const rawCustomStyles = stored?.customStyles;
	const customStyles = normalizeStoredCustomStyles(rawCustomStyles);
	const rawNextCustomStyleNumber = stored?.nextCustomStyleNumber;
	const nextCustomStyleNumber = inferNextCustomStyleNumber(
		customStyles,
		rawNextCustomStyleNumber
	);
	const rawTheme = stored?.theme;
	const theme: BrewTheme = isBrewTheme(rawTheme, customStyles)
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
		customStyles,
		nextCustomStyleNumber,
		exportFolder,
	};

	return {
		settings,
		shouldPersist:
			!stored ||
			rawTheme !== theme ||
			rawExportFolder !== exportFolder ||
			rawNextCustomStyleNumber !== nextCustomStyleNumber ||
			JSON.stringify(rawCustomStyles ?? []) !== JSON.stringify(customStyles),
	};
}

export function isBrewTheme(
	value: unknown,
	customStyles: readonly CustomStyleDefinition[] = []
): value is BrewTheme {
	return (
		isSelectableThemeId(value) ||
		(isCustomThemeId(value) && customStyles.some((style) => style.id === value))
	);
}
