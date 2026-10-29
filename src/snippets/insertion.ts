/**
 * Pure cursor-placement logic for snippet insertion, kept free of Obsidian
 * types so it can be unit tested.
 *
 * Every catalog body is block-level Markdown (`{{block`, `\page`, tables,
 * `::` fields): it only parses correctly when it starts at the beginning of a
 * line and the surrounding text does not merge into its first or last line.
 *
 * @param body       Snippet Markdown; begins at column 0 and ends with "\n".
 * @param lineBefore Text on the current line before the selection start.
 * @param lineAfter  Text on the current line after the selection end.
 * @returns The exact string to put in place of the selection.
 */
export function formatSnippetForCursor(
	body: string,
	lineBefore: string,
	lineAfter: string
): string {
	// Text before the cursor would become part of the block's first line.
	const prefix = lineBefore.trim() ? "\n" : "";
	// With nothing after the cursor, the body's own final newline would leave
	// an extra blank line; otherwise it moves the rest of the line below.
	const content = lineAfter ? body : body.replace(/\n$/, "");
	return prefix + content;
}
