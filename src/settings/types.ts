export type BrewTheme = "phb" | "srd" | "blank";

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

export const DEFAULT_SETTINGS: BrewVaultSettings = {
	theme: "phb",
	exportFolder: "BrewVault Exports",
	pageWidthPx: 816,
	pageHeightPx: 1056,
	debounceMs: 250,
};
