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
