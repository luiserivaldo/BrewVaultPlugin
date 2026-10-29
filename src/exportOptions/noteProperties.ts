import {
	EXPORT_OPTION_KEYS,
	EXPORT_OPTION_PROPERTIES,
	parseExportOption,
	setExportOption,
	type OptionParseContext,
	type PartialExportOptions,
} from "./options";

export interface InvalidNoteProperty {
	readonly property: string;
	readonly value: string;
}

export interface NoteExportOptions {
	readonly options: PartialExportOptions;
	readonly invalid: readonly InvalidNoteProperty[];
}

/** Reads every `bv_*` export option from a note's untrusted frontmatter. */
export function parseNoteExportOptions(
	frontmatter: unknown,
	context: OptionParseContext
): NoteExportOptions {
	const properties: Record<string, unknown> =
		typeof frontmatter === "object" && frontmatter !== null && !Array.isArray(frontmatter)
			? (frontmatter as Record<string, unknown>)
			: {};
	const options: PartialExportOptions = {};
	const invalid: InvalidNoteProperty[] = [];

	for (const key of EXPORT_OPTION_KEYS) {
		const property = EXPORT_OPTION_PROPERTIES[key];
		const parsed = parseExportOption(key, properties[property], context);
		if (parsed.kind === "value") setExportOption(options, key, parsed.value);
		else if (parsed.kind === "invalid") invalid.push({ property, value: parsed.value });
	}

	return { options, invalid };
}

export function formatInvalidPropertiesMessage(
	noteName: string,
	invalid: readonly InvalidNoteProperty[]
): string {
	const list = invalid.map(({ property, value }) => `${property} "${value}"`).join(", ");
	return `BrewVault ignored invalid ${list} in "${noteName}" and used the defaults instead.`;
}
