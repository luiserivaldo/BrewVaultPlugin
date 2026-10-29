export interface ResolvedImageEmbed {
	readonly src: string;
}

export interface BrewRenderOptions {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
	/** Vault path of the note being rendered, marked on its headings. */
	readonly headingSource?: string;
}

export interface BrewRenderEnvironment {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
	readonly headingSource?: string;
}

export function isBrewRenderEnvironment(
	value: unknown
): value is BrewRenderEnvironment {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as { imageEmbeds?: unknown; headingSource?: unknown };
	return (
		(candidate.imageEmbeds === undefined || candidate.imageEmbeds instanceof Map) &&
		(candidate.headingSource === undefined || typeof candidate.headingSource === "string")
	);
}
