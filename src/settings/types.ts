export type BrewTheme = "phb" | "blank" | "journal";

export interface BrewVaultSettings {
	/** Which theme stylesheet variant to apply to the preview pages. */
	theme: BrewTheme;
	/** Page width in pixels (default approximates 8.5in @ 96dpi). */
	pageWidthPx: number;
	/** Page height in pixels (default approximates 11in @ 96dpi). */
	pageHeightPx: number;
	/** Debounce, in milliseconds, between a file change and a re-render. */
	debounceMs: number;
}

export const DEFAULT_SETTINGS: BrewVaultSettings = {
	theme: "phb",
	pageWidthPx: 816,
	pageHeightPx: 1056,
	debounceMs: 250,
};
