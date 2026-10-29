import { CONTENT_BLOCK_NAME, formatAttribute } from "./manifest";

/** An empty content block, inserted by command. */
export const BOOK_CONTENT_BLOCK = `{{${CONTENT_BLOCK_NAME}
- [[Note name]]
}}
`;

/** One `{{bv:include}}` line for a folder, as written by commands. */
export function includeLine(folder: string): string {
	return `{{bv:include ${formatAttribute("folder", folder)} ${formatAttribute("sort", "name")}}}`;
}

/** The `- [[link]]` list an include currently adds, ready to reorder by hand. */
export function expandIncludeMarkdown(links: readonly string[]): string {
	return links.map((link) => `- [[${link}]]`).join("\n");
}
