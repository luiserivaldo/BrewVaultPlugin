import { stripYamlFrontmatter } from "./frontmatter";

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Removes Obsidian comments (`%%hidden%%`, inline or spanning lines) from
 * note source, as Obsidian hides them in Reading view.
 *
 * `%%` inside fenced code blocks and inline code spans is literal text. An
 * unclosed `%%` hides the rest of the note, matching Obsidian. Lines left
 * blank only because a comment was removed are dropped, so a comment line
 * between two paragraph lines does not split the paragraph. Leading YAML
 * frontmatter is left untouched.
 */
export function stripObsidianComments(source: string): string {
	if (!source.includes("%%")) return source;
	const bodyStart = source.length - stripYamlFrontmatter(source).length;
	const lines = source.slice(bodyStart).split("\n");

	const output: string[] = [];
	let inComment = false;
	let fence: string | null = null;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex];

		if (!inComment) {
			const fenceMatch = line.match(FENCE_OPEN);
			if (fence) {
				if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
					fence = null;
				}
				output.push(line);
				continue;
			}
			if (fenceMatch) {
				fence = fenceMatch[1];
				output.push(line);
				continue;
			}
		}

		const touched = inComment || line.includes("%%");
		let kept = "";
		let index = 0;
		while (index < line.length) {
			if (inComment) {
				const close = line.indexOf("%%", index);
				if (close === -1) {
					index = line.length;
				} else {
					inComment = false;
					index = close + 2;
				}
				continue;
			}
			const char = line[index];
			if (char === "`") {
				const span = inlineCodeSpanEnd(lines, lineIndex, index);
				if (span !== null) {
					kept += line.slice(index, span);
					index = span;
					continue;
				}
				// No matching run: the whole backtick run is literal text.
				let runEnd = index;
				while (line[runEnd] === "`") runEnd += 1;
				kept += line.slice(index, runEnd);
				index = runEnd;
				continue;
			}
			if (char === "%" && line[index + 1] === "%") {
				inComment = true;
				index += 2;
				continue;
			}
			kept += char;
			index += 1;
		}

		if (touched && kept.trim() === "") continue;
		output.push(kept);
	}

	return source.slice(0, bodyStart) + output.join("\n");
}

/**
 * Returns the end of an inline code span opened at `start` on the same line,
 * or null when no closing run of equal length exists there. Code spans that
 * wrap across lines are rare in notes and are treated as unclosed.
 */
function inlineCodeSpanEnd(lines: readonly string[], lineIndex: number, start: number): number | null {
	const line = lines[lineIndex];
	let runEnd = start;
	while (line[runEnd] === "`") runEnd += 1;
	const length = runEnd - start;
	let search = runEnd;
	while (search < line.length) {
		const next = line.indexOf("`", search);
		if (next === -1) return null;
		let closeEnd = next;
		while (line[closeEnd] === "`") closeEnd += 1;
		if (closeEnd - next === length) return closeEnd;
		search = closeEnd;
	}
	return null;
}
