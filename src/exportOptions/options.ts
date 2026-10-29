import type { BrewTheme } from "../settings/types";
import type { CustomStyleDefinition } from "../themes/customStyles";
import { resolveNoteTheme } from "../themes/noteTheme";

/**
 * Every export option BrewVault can take from a note property. Each option has
 * one frontmatter property, one label, and one parser for untrusted values.
 */
export interface ExportOptions {
	/** Theme used by the preview and exports. */
	theme: BrewTheme;
	/** Running footer text on every page; empty means no footer. */
	footer: string;
	/** Whether page numbers are printed. */
	showPageNumbers: boolean;
	/** Number printed on the first page. */
	firstPageNumber: number;
	/** Paper size; "settings" uses the page width and height from settings. */
	pageSize: PageSizeChoice;
	/** Document title and export file name; defaults to the note name. */
	title: string;
	/** Subfolder of the export folder; empty means the export folder itself. */
	exportSubfolder: string;
}

export type PageSizePreset = "letter" | "a4";
export type PageSizeChoice = PageSizePreset | "settings";

/** Page sizes in CSS pixels at 96 dpi. */
export const PAGE_SIZE_PRESETS: Readonly<
	Record<PageSizePreset, { readonly widthPx: number; readonly heightPx: number }>
> = {
	letter: { widthPx: 816, heightPx: 1056 },
	a4: { widthPx: 794, heightPx: 1123 },
};

/** Page dimensions for a size choice, falling back to the settings size. */
export function pageDimensions(
	choice: PageSizeChoice,
	settingsSize: { readonly pageWidthPx: number; readonly pageHeightPx: number }
): { pageWidthPx: number; pageHeightPx: number } {
	if (choice === "settings") {
		return { pageWidthPx: settingsSize.pageWidthPx, pageHeightPx: settingsSize.pageHeightPx };
	}
	const preset = PAGE_SIZE_PRESETS[choice];
	return { pageWidthPx: preset.widthPx, pageHeightPx: preset.heightPx };
}

export type ExportOptionKey = keyof ExportOptions;
export type PartialExportOptions = Partial<ExportOptions>;

export const EXPORT_OPTION_KEYS: readonly ExportOptionKey[] = [
	"theme",
	"footer",
	"showPageNumbers",
	"firstPageNumber",
	"pageSize",
	"title",
	"exportSubfolder",
];

export const EXPORT_OPTION_PROPERTIES: Readonly<Record<ExportOptionKey, string>> = {
	theme: "bv_theme",
	footer: "bv_footer",
	showPageNumbers: "bv_page_numbers",
	firstPageNumber: "bv_page_start",
	pageSize: "bv_page_size",
	title: "bv_title",
	exportSubfolder: "bv_export_folder",
};

export const EXPORT_OPTION_LABELS: Readonly<Record<ExportOptionKey, string>> = {
	theme: "Theme",
	footer: "Footer",
	showPageNumbers: "Page numbers",
	firstPageNumber: "First page number",
	pageSize: "Page size",
	title: "Title",
	exportSubfolder: "Export subfolder",
};

export type OptionParseResult<T> =
	| { kind: "none" }
	| { kind: "value"; value: T }
	| { kind: "invalid"; value: string };

export interface OptionParseContext {
	readonly customStyles: readonly CustomStyleDefinition[];
}

type OptionParsers = {
	readonly [K in ExportOptionKey]: (
		value: unknown,
		context: OptionParseContext
	) => OptionParseResult<ExportOptions[K]>;
};

const NONE = { kind: "none" } as const;

const EXPORT_OPTION_PARSERS: OptionParsers = {
	theme: (value, context) => {
		const resolved = resolveNoteTheme(value, context.customStyles);
		return resolved.kind === "theme" ? { kind: "value", value: resolved.theme } : resolved;
	},
	footer: (value) => {
		if (value === undefined || value === null) return NONE;
		// `bv_footer: false` explicitly turns a footer off.
		if (value === false) return { kind: "value", value: "" };
		if (typeof value === "string" || typeof value === "number") {
			return { kind: "value", value: String(value).trim() };
		}
		return invalid(value);
	},
	showPageNumbers: parseBoolean,
	firstPageNumber: (value) => {
		if (value === undefined || value === null) return NONE;
		const number = typeof value === "string" ? Number(value.trim()) : value;
		const isPageNumber =
			typeof number === "number" &&
			Number.isInteger(number) &&
			number >= 1 &&
			number <= MAX_PAGE_NUMBER;
		if (isPageNumber) {
			return { kind: "value", value: number };
		}
		return invalid(value);
	},
	pageSize: (value) => {
		if (value === undefined || value === null) return NONE;
		if (typeof value === "string") {
			const size = PAGE_SIZE_ALIASES[value.trim().toLowerCase()];
			if (size) return { kind: "value", value: size };
		}
		return invalid(value);
	},
	title: (value) => {
		if (value === undefined || value === null) return NONE;
		if (typeof value === "string" || typeof value === "number") {
			const title = String(value).trim();
			if (!title) return NONE;
			if (title.length <= MAX_TITLE_LENGTH) return { kind: "value", value: title };
		}
		return invalid(value);
	},
	exportSubfolder: (value) => {
		if (value === undefined || value === null) return NONE;
		if (typeof value !== "string") return invalid(value);
		const subfolder = normalizeExportSubfolder(value);
		return subfolder === null ? invalid(value) : { kind: "value", value: subfolder };
	},
};

/**
 * Normalizes a relative subfolder such as "Llynwych/Monsters". Returns null
 * for paths that could leave the export folder (`..`, `.`, drive letters) or
 * that contain characters file systems reject.
 */
export function normalizeExportSubfolder(value: string): string | null {
	const segments = value
		.replace(/\\/g, "/")
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);
	const isSafe = segments.every(
		// eslint-disable-next-line no-control-regex -- control characters are invalid in folder names
		(segment) => segment !== "." && segment !== ".." && !/[\u0000-\u001f:*?"<>|]/.test(segment)
	);
	return isSafe ? segments.join("/") : null;
}

const MAX_TITLE_LENGTH = 200;
const MAX_PAGE_NUMBER = 9999;

const PAGE_SIZE_ALIASES: Readonly<Record<string, PageSizePreset>> = {
	letter: "letter",
	"us letter": "letter",
	a4: "a4",
};

const BOOLEAN_WORDS: Readonly<Record<string, boolean>> = {
	true: true,
	yes: true,
	on: true,
	show: true,
	false: false,
	no: false,
	off: false,
	hide: false,
};

/** Accepts YAML booleans and common yes/no words, case-insensitively. */
function parseBoolean(value: unknown): OptionParseResult<boolean> {
	if (value === undefined || value === null) return NONE;
	if (typeof value === "boolean") return { kind: "value", value };
	if (typeof value === "string") {
		const word = BOOLEAN_WORDS[value.trim().toLowerCase()];
		if (word !== undefined) return { kind: "value", value: word };
	}
	return invalid(value);
}

/** Parses one untrusted option value, such as a frontmatter property. */
export function parseExportOption<K extends ExportOptionKey>(
	key: K,
	value: unknown,
	context: OptionParseContext
): OptionParseResult<ExportOptions[K]> {
	const parse = EXPORT_OPTION_PARSERS[key] as (
		value: unknown,
		context: OptionParseContext
	) => OptionParseResult<ExportOptions[K]>;
	return parse(value, context);
}

export function setExportOption<K extends ExportOptionKey>(
	target: PartialExportOptions,
	key: K,
	value: ExportOptions[K]
): void {
	target[key] = value;
}

export function invalid(value: unknown): { kind: "invalid"; value: string } {
	return { kind: "invalid", value: typeof value === "string" ? value : JSON.stringify(value) };
}
