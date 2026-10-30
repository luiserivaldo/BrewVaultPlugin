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
import { isEdition, type Edition } from "../snippets/catalog";

export type BrewTheme = ThemeSelectionId;

/**
 * How mobile PDF commands finish: hand a `.brew.html` file to the system
 * browser for printing, or rasterize the styled pages inside Obsidian.
 */
export type MobilePdfMethod = "browser" | "native";

export function isMobilePdfMethod(value: unknown): value is MobilePdfMethod {
	return value === "browser" || value === "native";
}

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
	/** Rules edition used by insert commands that do not name one. */
	defaultEdition: Edition;
	/** Mobile PDF strategy; desktop always prints directly through Electron. */
	mobilePdfMethod: MobilePdfMethod;
	/**
	 * Also register a palette command for each edition's variant of a block
	 * (e.g. "PHB 2014: Spell"). Off keeps the palette to the pickers, the
	 * default-edition block commands, and edition-neutral blocks.
	 */
	editionBlockCommands: boolean;
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
	defaultEdition: "2024",
	mobilePdfMethod: "browser",
	editionBlockCommands: false,
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

	const rawDefaultEdition = stored?.defaultEdition;
	const defaultEdition = isEdition(rawDefaultEdition)
		? rawDefaultEdition
		: DEFAULT_SETTINGS.defaultEdition;

	const rawMobilePdfMethod = stored?.mobilePdfMethod;
	const mobilePdfMethod = isMobilePdfMethod(rawMobilePdfMethod)
		? rawMobilePdfMethod
		: DEFAULT_SETTINGS.mobilePdfMethod;

	const rawEditionBlockCommands = stored?.editionBlockCommands;
	const editionBlockCommands = resolveEditionBlockCommands(rawEditionBlockCommands);

	const settings = {
		...DEFAULT_SETTINGS,
		...(stored ?? {}),
		theme,
		customStyles,
		nextCustomStyleNumber,
		exportFolder,
		defaultEdition,
		mobilePdfMethod,
		editionBlockCommands,
	};

	return {
		settings,
		shouldPersist:
			!stored ||
			rawTheme !== theme ||
			rawExportFolder !== exportFolder ||
			(rawDefaultEdition !== undefined && rawDefaultEdition !== defaultEdition) ||
			(rawMobilePdfMethod !== undefined && rawMobilePdfMethod !== mobilePdfMethod) ||
			(rawEditionBlockCommands !== undefined && rawEditionBlockCommands !== editionBlockCommands) ||
			rawNextCustomStyleNumber !== nextCustomStyleNumber ||
			JSON.stringify(rawCustomStyles ?? []) !== JSON.stringify(customStyles),
	};
}

/**
 * Whether per-edition block commands are on. Installs saved before 0.7.2 have
 * no stored value and get the trimmed default like fresh installs: hotkeys
 * bound to those commands stay in hotkeys.json and return when re-enabled.
 */
export function resolveEditionBlockCommands(raw: unknown): boolean {
	return typeof raw === "boolean" ? raw : DEFAULT_SETTINGS.editionBlockCommands;
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
