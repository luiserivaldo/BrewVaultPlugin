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
}

export type ExportOptionKey = keyof ExportOptions;
export type PartialExportOptions = Partial<ExportOptions>;

export const EXPORT_OPTION_KEYS: readonly ExportOptionKey[] = ["theme", "footer", "showPageNumbers"];

export const EXPORT_OPTION_PROPERTIES: Readonly<Record<ExportOptionKey, string>> = {
	theme: "bv_theme",
	footer: "bv_footer",
	showPageNumbers: "bv_page_numbers",
};

export const EXPORT_OPTION_LABELS: Readonly<Record<ExportOptionKey, string>> = {
	theme: "Theme",
	footer: "Footer",
	showPageNumbers: "Page numbers",
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
