import { isEdition, type Edition } from "../snippets/catalog";

export interface ResolvedImageEmbed {
	readonly src: string;
}

export interface BrewRenderOptions {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
	/** Vault path of the note being rendered, marked on its headings. */
	readonly headingSource?: string;
	/** Edition `statblock` fences print in unless they set their own. */
	readonly statblockEdition?: Edition;
}

export interface BrewRenderEnvironment {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
	readonly headingSource?: string;
	readonly statblockEdition?: Edition;
}

export function isBrewRenderEnvironment(
	value: unknown
): value is BrewRenderEnvironment {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as {
		imageEmbeds?: unknown;
		headingSource?: unknown;
		statblockEdition?: unknown;
	};
	return (
		(candidate.imageEmbeds === undefined || candidate.imageEmbeds instanceof Map) &&
		(candidate.headingSource === undefined || typeof candidate.headingSource === "string") &&
		(candidate.statblockEdition === undefined || isEdition(candidate.statblockEdition))
	);
}
