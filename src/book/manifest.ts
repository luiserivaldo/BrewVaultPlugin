import { stripYamlFrontmatter } from "../renderer/frontmatter";

/**
 * One line-level piece of a note's body, in reading order. Other notes are
 * pulled in only by `- [[link]]` and `{{bv:include}}` lines inside a
 * `{{bookContent}}` block. Everything else is kept as Markdown text and
 * rendered where it stands.
 */
export type ManifestItem =
	| { readonly kind: "text"; readonly markdown: string }
	| {
			readonly kind: "member";
			readonly linkpath: string;
			readonly line: number;
	  }
	| {
			readonly kind: "include";
			readonly attributes: readonly IncludeAttribute[];
			readonly line: number;
			readonly raw: string;
	  }
	| { readonly kind: "problem"; readonly message: string };

export interface IncludeAttribute {
	readonly name: string;
	readonly value: string;
}

/**
 * A list item that holds nothing but one wiki link, optionally followed by a
 * `: description` or `- description` (catalogue notes often add one).
 * Embeds (`![[…]]`) are not members.
 */
const MEMBER_LINE =
	/^\s*(?:[-*+]|\d+[.)])\s+\[\[([^\]|#^\n]+)(?:[#^][^\]|\n]*)?(?:\|[^\]\n]*)?\]\](?:\s*(?:[:–—-]\s.*|[:–—-]?))?\s*$/;
const DIRECTIVE_LINE = /^\s*\{\{bv:(include)\b(.*)\}\}\s*$/i;
/** Same opener and closer lines as Homebrewery blocks (see blockContainer.ts). */
export const BLOCK_OPEN = /^\s*\{\{([a-zA-Z][a-zA-Z0-9_,\-\s]*?)\s*$/;
export const BLOCK_CLOSE = /^\s*\}\}\s*$/;
const ATTRIBUTE = /([A-Za-z][\w-]*)\s*=\s*"([^"]*)"/g;
export const FENCE = /^\s*(`{3,}|~{3,})/;

/** Class names that open a book content block (`{{bookContent`). */
const CONTENT_BLOCK_NAMES = new Set(["bookcontent", "book-content", "bv_book_content"]);
export const CONTENT_BLOCK_NAME = "bookContent";

/** True when a line opens a `{{bookContent` block. */
export function isContentBlockOpener(line: string): boolean {
	const opener = BLOCK_OPEN.exec(line);
	const first = opener?.[1].split(/[,\s]+/).find(Boolean);
	return first !== undefined && CONTENT_BLOCK_NAMES.has(first.toLowerCase());
}

/**
 * True when a note compiles other notes: it has a `{{bookContent` block
 * outside code fences. This is the only switch; no property is needed.
 */
export function hasBookContent(source: string): boolean {
	let fence: string | null = null;
	for (const line of stripYamlFrontmatter(source).split(/\r?\n/)) {
		const fenceMatch = FENCE.exec(line);
		if (fence !== null) {
			if (fenceMatch && fenceMatch[1].startsWith(fence)) fence = null;
		} else if (fenceMatch) {
			fence = fenceMatch[1];
		} else if (isContentBlockOpener(line)) {
			return true;
		}
	}
	return false;
}

/** Splits a book note (frontmatter allowed) into ordered manifest items. */
export function parseBookManifest(source: string): ManifestItem[] {
	const body = stripYamlFrontmatter(source);
	const lineOffset = countLines(source) - countLines(body);
	const items: ManifestItem[] = [];
	let text: string[] = [];
	let fence: string | null = null;
	/** Open `{{bookContent` block: its start line and nested block depth. */
	let content: { line: number; depth: number } | null = null;

	const flushText = () => {
		if (text.some((line) => line.trim().length > 0)) {
			items.push({ kind: "text", markdown: text.join("\n") });
		}
		text = [];
	};

	const lines = body.split(/\r?\n/);
	for (const [index, line] of lines.entries()) {
		const lineNumber = index + 1 + lineOffset;
		const fenceMatch = FENCE.exec(line);
		if (fence !== null) {
			if (fenceMatch && fenceMatch[1].startsWith(fence)) fence = null;
			text.push(line);
			continue;
		}
		if (fenceMatch) {
			fence = fenceMatch[1];
			text.push(line);
			continue;
		}

		if (content === null) {
			if (isContentBlockOpener(line)) {
				flushText();
				content = { line: lineNumber, depth: 1 };
				continue;
			}
			// Outside a content block, links and includes are ordinary text.
		} else {
			// The content block renders no box of its own: its opener and closer
			// disappear, so pagination still sees every note's blocks separately.
			if (BLOCK_OPEN.test(line)) content.depth++;
			else if (BLOCK_CLOSE.test(line) && --content.depth === 0) {
				flushText();
				content = null;
				continue;
			}

			const member = MEMBER_LINE.exec(line);
			if (member) {
				flushText();
				items.push({
					kind: "member",
					linkpath: member[1].trim(),
					line: lineNumber,
				});
				continue;
			}

			const directive = DIRECTIVE_LINE.exec(line);
			if (directive) {
				flushText();
				items.push({
					kind: "include",
					attributes: parseAttributes(directive[2]),
					line: lineNumber,
					raw: line.trim(),
				});
				continue;
			}
		}

		text.push(line);
	}

	flushText();
	if (content !== null) {
		items.push({
			kind: "problem",
			message: `Line ${content.line}: the {{${CONTENT_BLOCK_NAME}}} block has no closing }} line, so it runs to the end of the note.`,
		});
	}
	return items;
}

export function parseAttributes(source: string): IncludeAttribute[] {
	return Array.from(source.matchAll(ATTRIBUTE), (match) => ({
		name: match[1].toLowerCase(),
		value: match[2],
	}));
}

/** Parses one line as an include directive, for the expand command. */
export function parseIncludeLine(line: string): readonly IncludeAttribute[] | null {
	const directive = DIRECTIVE_LINE.exec(line);
	if (!directive || directive[1].toLowerCase() !== "include") return null;
	return parseAttributes(directive[2]);
}

/** Quotes a value for a `{{bv:…}}` attribute. Double quotes cannot be escaped. */
export function formatAttribute(name: string, value: string): string {
	return `${name}="${value.replace(/"/g, "'")}"`;
}

function countLines(text: string): number {
	return text.split(/\r?\n/).length;
}
