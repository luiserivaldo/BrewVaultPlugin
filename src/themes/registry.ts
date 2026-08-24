export type ThemeId = "blank" | "phb" | "dmg" | "journal" | "srd";
export type SelectableThemeId = "blank" | "phb" | "srd";

export interface ThemeCompatibility {
	components: readonly string[];
	snippets?: readonly string[];
}

export interface ThemeDefinition {
	id: ThemeId;
	name: string;
	upstreamId: "Blank" | "5ePHB" | "5eDMG" | "Journal" | "UnearthedArcana";
	baseTheme: ThemeId | null;
	stylesheetEntry: string;
	assets: readonly string[];
	fonts: readonly string[];
	compatibility?: ThemeCompatibility;
	selectable: boolean;
}

export const THEME_REGISTRY: Readonly<Record<ThemeId, ThemeDefinition>> = {
	blank: {
		id: "blank",
		name: "Blank",
		upstreamId: "Blank",
		baseTheme: null,
		stylesheetEntry: "styles/homebrewery/blank.css",
		assets: [],
		fonts: ["pagella"],
		compatibility: { components: ["page", "columnWrapper", "columnSplit"] },
		selectable: true,
	},
	phb: {
		id: "phb",
		name: "5e PHB",
		upstreamId: "5ePHB",
		baseTheme: "blank",
		stylesheetEntry: "styles/homebrewery/5e-phb.css",
		assets: ["parchment-background", "phb-footer-accent"],
		fonts: ["book-insanity", "mr-eaves", "scaly-sans", "solbera-imitation"],
		compatibility: {
			components: [
				"note",
				"descriptive",
				"monster",
				"monster.wide",
				"classTable",
				"wide",
				"footnote",
				"pageNumber",
			],
		},
		selectable: true,
	},
	dmg: {
		id: "dmg",
		name: "5e DMG",
		upstreamId: "5eDMG",
		baseTheme: "phb",
		stylesheetEntry: "styles/homebrewery/5e-dmg.css",
		assets: ["dmg-background", "dmg-footer-accent"],
		fonts: [],
		selectable: false,
	},
	journal: {
		id: "journal",
		name: "Journal",
		upstreamId: "Journal",
		baseTheme: "blank",
		stylesheetEntry: "styles/homebrewery/journal.css",
		assets: ["journal-background", "journal-border"],
		fonts: ["fredericka", "permanent-marker", "reenie-beanie"],
		selectable: false,
	},
	srd: {
		id: "srd",
		name: "Unearthed Arcana",
		upstreamId: "UnearthedArcana",
		baseTheme: "blank",
		stylesheetEntry: "styles/homebrewery/unearthed-arcana.css",
		assets: [],
		fonts: ["book-insanity", "mr-eaves"],
		selectable: true,
	},
};

export const ALL_THEME_CLASS_NAMES = Object.keys(THEME_REGISTRY).map(
	(id) => `brewvault-theme-${id}`
);

/** Resolves base-first inheritance classes, equivalent to themes.json. */
export function getThemeClassNames(theme: SelectableThemeId): string[] {
	const chain: ThemeId[] = [];
	const seen = new Set<ThemeId>();
	let current: ThemeId | null = theme;

	while (current) {
		if (seen.has(current)) throw new Error(`Circular BrewVault theme inheritance: ${current}`);
		seen.add(current);
		chain.unshift(current);
		current = THEME_REGISTRY[current].baseTheme;
	}

	return chain.map((id) => `brewvault-theme-${id}`);
}
