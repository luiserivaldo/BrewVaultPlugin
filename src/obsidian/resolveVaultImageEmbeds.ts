import { MetadataCache, TFile, Vault } from "obsidian";
import type { ResolvedImageEmbed } from "../renderer/imageEmbeds";

const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
	avif: "image/avif",
	bmp: "image/bmp",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

export interface ResolvedVaultImageEmbeds {
	readonly imageEmbeds: ReadonlyMap<string, ResolvedImageEmbed>;
	readonly dependencyPaths: ReadonlySet<string>;
}

/**
 * Resolves Obsidian image embeds through public vault APIs and converts them
 * to self-contained data URLs. Source Markdown is never modified.
 */
export async function resolveVaultImageEmbeds(
	source: string,
	sourceFile: TFile,
	vault: Vault,
	metadataCache: MetadataCache
): Promise<ResolvedVaultImageEmbeds> {
	const imageEmbeds = new Map<string, ResolvedImageEmbed>();
	const dependencyPaths = new Set<string>();

	for (const target of collectImageEmbedTargets(source)) {
		const linkpath = stripSubpath(target);
		if (!linkpath) continue;

		const destination = metadataCache.getFirstLinkpathDest(
			linkpath,
			sourceFile.path
		);
		if (!(destination instanceof TFile)) continue;

		const mimeType = IMAGE_MIME_TYPES[destination.extension.toLowerCase()];
		if (!mimeType) continue;

		try {
			const bytes = await vault.readBinary(destination);
			imageEmbeds.set(target, {
				src: `data:${mimeType};base64,${encodeBase64(bytes)}`,
			});
			dependencyPaths.add(destination.path);
		} catch (error) {
			console.warn(
				`BrewVault could not read embedded image "${destination.path}".`,
				error
			);
		}
	}

	return { imageEmbeds, dependencyPaths };
}

export function collectImageEmbedTargets(source: string): string[] {
	const targets = new Set<string>();
	const embedPattern = /!\[\[([^\]\n]+)\]\]/g;
	for (const match of source.matchAll(embedPattern)) {
		const inner = match[1]?.trim() ?? "";
		const separator = inner.indexOf("|");
		const target = (separator === -1 ? inner : inner.slice(0, separator)).trim();
		if (target) targets.add(target);
	}
	return [...targets];
}

function stripSubpath(target: string): string {
	const subpathAt = target.search(/[#^]/);
	return (subpathAt === -1 ? target : target.slice(0, subpathAt)).trim();
}

/** Browser-safe base64 encoding; deliberately avoids Node's Buffer API. */
export function encodeBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let output = "";

	for (let index = 0; index < bytes.length; index += 3) {
		const first = bytes[index] ?? 0;
		const second = bytes[index + 1] ?? 0;
		const third = bytes[index + 2] ?? 0;
		const combined = (first << 16) | (second << 8) | third;

		output += alphabet[(combined >> 18) & 63];
		output += alphabet[(combined >> 12) & 63];
		output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
		output += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
	}

	return output;
}
