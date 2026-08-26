export interface ResolvedImageEmbed {
	readonly src: string;
}

export interface BrewRenderOptions {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
}

export interface BrewRenderEnvironment {
	readonly imageEmbeds?: ReadonlyMap<string, ResolvedImageEmbed>;
}

export function isBrewRenderEnvironment(
	value: unknown
): value is BrewRenderEnvironment {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as { imageEmbeds?: unknown };
	return (
		candidate.imageEmbeds === undefined || candidate.imageEmbeds instanceof Map
	);
}
