import type { MetadataCache, TFile } from "obsidian";

/**
 * Returns a note's parsed frontmatter from Obsidian's metadata cache. The
 * result is untrusted: callers must validate every value they read.
 */
export function readNoteFrontmatter(file: TFile, metadataCache: MetadataCache): unknown {
	return metadataCache.getFileCache(file)?.frontmatter;
}
