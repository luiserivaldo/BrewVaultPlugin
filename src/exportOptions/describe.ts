import type { BrewTheme } from "../settings/types";
import type { CustomStyleDefinition } from "../themes/customStyles";
import { isSelectableThemeId, THEME_REGISTRY } from "../themes/registry";
import {
	EXPORT_OPTION_KEYS,
	EXPORT_OPTION_LABELS,
	EXPORT_OPTION_PROPERTIES,
	pageDimensions,
	type ExportOptionKey,
	type ExportOptions,
	type PageSizeChoice,
} from "./options";
import type { OptionSource, ResolvedExportOptions } from "./resolve";

const PAGE_SIZE_NAMES: Readonly<Record<PageSizeChoice, string>> = {
	letter: "Letter",
	a4: "A4",
	settings: "Settings size",
};

export interface ExportOptionRow {
	readonly label: string;
	readonly property: string;
	readonly value: string;
	readonly source: string;
}

export interface DescribeContext {
	readonly customStyles: readonly CustomStyleDefinition[];
	readonly pageWidthPx: number;
	readonly pageHeightPx: number;
	readonly exportFolder: string;
}

/** One human-readable row per export option: its value and where it came from. */
export function describeExportOptions(
	resolved: ResolvedExportOptions,
	context: DescribeContext
): ExportOptionRow[] {
	return EXPORT_OPTION_KEYS.map((key) => ({
		label: EXPORT_OPTION_LABELS[key],
		property: EXPORT_OPTION_PROPERTIES[key],
		value: describeValue(key, resolved.values, context),
		source: describeSource(resolved.sources[key], key),
	}));
}

export function describeSource(source: OptionSource, key: ExportOptionKey): string {
	if (source === "note") return `Note property ${EXPORT_OPTION_PROPERTIES[key]}`;
	if (source === "command") return "Command";
	return "Settings";
}

export function themeDisplayName(
	theme: BrewTheme,
	customStyles: readonly CustomStyleDefinition[]
): string {
	if (isSelectableThemeId(theme)) return THEME_REGISTRY[theme].name;
	return customStyles.find((style) => style.id === theme)?.name ?? theme;
}

function describeValue(
	key: ExportOptionKey,
	values: ExportOptions,
	context: DescribeContext
): string {
	switch (key) {
		case "theme":
			return themeDisplayName(values.theme, context.customStyles);
		case "footer":
			return values.footer || "None";
		case "showPageNumbers":
			return values.showPageNumbers ? "Shown" : "Hidden";
		case "firstPageNumber":
			return String(values.firstPageNumber);
		case "pageSize": {
			const { pageWidthPx, pageHeightPx } = pageDimensions(values.pageSize, context);
			const name = PAGE_SIZE_NAMES[values.pageSize];
			return `${name} (${pageWidthPx} × ${pageHeightPx} px)`;
		}
		case "title":
			return values.title;
		case "exportSubfolder":
			return values.exportSubfolder
				? `${context.exportFolder}/${values.exportSubfolder}`
				: context.exportFolder;
	}
}
