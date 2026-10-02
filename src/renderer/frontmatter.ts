/**
 * Removes a YAML frontmatter document from the beginning of a Markdown note.
 *
 * The opening marker must be the first line (apart from an optional BOM), so
 * horizontal rules or thematic breaks later in a document remain Markdown.
 * Both YAML's `---` and `...` document terminators are accepted.
 */
export function stripYamlFrontmatter(source: string): string {
	const opening = source.match(/^\uFEFF?---[ \t]*(?:\r?\n|$)/);
	if (!opening) return source;

	const contentStart = opening[0].length;
	const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/gm;
	closing.lastIndex = contentStart;
	const closingMatch = closing.exec(source);
	if (!closingMatch) return source;

	return source.slice(closingMatch.index + closingMatch[0].length);
}
