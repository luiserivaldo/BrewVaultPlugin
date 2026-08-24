import MarkdownIt from "markdown-it";
import { blockContainerRule } from "./rules/blockContainer";
import { inlineSpanRule } from "./rules/inlineSpan";
import { pageBreakRule } from "./rules/pageBreak";
import { columnBreakRule } from "./rules/columnBreak";
import { wikilinkRule } from "./rules/wikilink";

/**
 * Builds a fresh markdown-it instance configured for Homebrewery-flavored
 * Markdown. A new instance is cheap to create and keeps renders isolated
 * (no shared mutable state leaking between files).
 */
export function createBrewMarkdownEngine(): MarkdownIt {
	const md = new MarkdownIt({
		html: false, // never trust/render raw HTML from vault notes
		linkify: true,
		typographer: true,
		breaks: false,
	});

	// Order matters: page/column breaks and block containers are block-level
	// rules that must run before paragraph parsing swallows their lines.
	// markdown-it's rule chain is: block rules run top-to-bottom per file,
	// so we insert ours near the front (before "paragraph"/"fence" catch-alls
	// but after "code"/"blockquote" so those still take precedence).
	md.block.ruler.before("fence", "brew_page_break", pageBreakRule);
	md.block.ruler.before("fence", "brew_column_break", columnBreakRule);
	md.block.ruler.before("fence", "brew_block_container", blockContainerRule, {
		alt: ["paragraph", "reference", "blockquote", "list"],
	});

	md.inline.ruler.before("emphasis", "brew_inline_span", inlineSpanRule);
	md.inline.ruler.before("image", "brew_wikilink", wikilinkRule);

	// These two token types are pure markers: pageBreak becomes a sentinel
	// comment that pageSplitter.ts later splits the final HTML string on,
	// and columnBreak becomes a self-contained div (open+close together,
	// since a bare nesting:0 token with an empty tag would otherwise
	// render as a malformed "<>" via markdown-it's default renderToken).
	md.renderer.rules.brew_page_break = () => PAGE_BREAK_SENTINEL;
	md.renderer.rules.brew_column_break = () => '<div class="columnSplit"></div>';

	return md;
}

/** Sentinel inserted into rendered HTML at every `\page`; see pageSplitter.ts */
export const PAGE_BREAK_SENTINEL = "<!--BREW_PAGE_BREAK-->";
