import {
	EXPORT_OPTION_KEYS,
	type ExportOptionKey,
	type ExportOptions,
	type PartialExportOptions,
} from "./options";

export type OptionSource = "command" | "note" | "settings";

export interface ResolvedExportOptions {
	readonly values: ExportOptions;
	readonly sources: Readonly<Record<ExportOptionKey, OptionSource>>;
}

export interface ExportOptionLayers {
	/** Explicit choices made by the command being run. */
	readonly command?: PartialExportOptions;
	/** The note's own `bv_*` properties. */
	readonly note: PartialExportOptions;
	/** Values derived from plugin settings; always complete. */
	readonly defaults: ExportOptions;
}

/**
 * Resolves each option separately, highest priority first: the command, the
 * note's properties, then settings. Keeps where every value came from so the
 * user can be shown why a note exported the way it did.
 */
export function resolveExportOptions(layers: ExportOptionLayers): ResolvedExportOptions {
	const values = { ...layers.defaults };
	const sources = {} as Record<ExportOptionKey, OptionSource>;
	for (const key of EXPORT_OPTION_KEYS) {
		sources[key] = applyLayer(values, layers, key);
	}
	return { values, sources };
}

function applyLayer<K extends ExportOptionKey>(
	values: ExportOptions,
	layers: ExportOptionLayers,
	key: K
): OptionSource {
	const command = layers.command?.[key];
	if (command !== undefined) {
		values[key] = command;
		return "command";
	}
	const note = layers.note[key];
	if (note !== undefined) {
		values[key] = note;
		return "note";
	}
	return "settings";
}
