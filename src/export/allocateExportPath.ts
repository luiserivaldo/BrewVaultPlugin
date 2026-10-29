/**
 * Returns the first unused vault-relative export path. The original basename
 * is preferred; collisions append `_1`, `_2`, and so on before the full suffix.
 */
export function allocateExportPath(
	folder: string,
	basename: string,
	suffix: string,
	exists: (path: string) => boolean
): string {
	let copyNumber = 0;
	while (true) {
		const numberedBasename = copyNumber === 0 ? basename : `${basename}_${copyNumber}`;
		const candidate = `${folder}/${numberedBasename}${suffix}`;
		if (!exists(candidate)) return candidate;
		copyNumber++;
	}
}

/**
 * Turns a document title into a safe export file name. Characters that
 * Windows, macOS, Android, or Obsidian links reject become hyphens; the
 * fallback is used when nothing printable remains.
 */
export function toExportBasename(title: string, fallback: string): string {
	const cleaned = title
		// eslint-disable-next-line no-control-regex -- control characters are invalid in file names
		.replace(/[\u0000-\u001f\\/:*?"<>|#^[\]]/g, "-")
		.replace(/\s+/g, " ")
		.replace(/-{2,}/g, "-")
		.trim()
		.replace(/[. ]+$/, "");
	return cleaned || fallback;
}
