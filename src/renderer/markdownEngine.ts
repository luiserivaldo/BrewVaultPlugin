import MarkdownIt from "markdown-it";
import { blockContainerRule } from "./rules/blockContainer";
import { inlineSpanRule } from "./rules/inlineSpan";
import { pageBreakRule } from "./rules/pageBreak";
import { columnBreakRule } from "./rules/columnBreak";
import { wikilinkRule } from "./rules/wikilink";
import { templateLineRule } from "./rules/templateLine";

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
	md.block.ruler.before("fence", "brew_template_line", templateLineRule, {
		alt: ["paragraph", "reference", "blockquote", "list"],
	});
	md.block.ruler.before("fence", "brew_block_container", blockContainerRule, {
		alt: ["paragraph", "reference", "blockquote", "list"],
	});

	md.inline.ruler.before("emphasis", "brew_inline_span", inlineSpanRule);
	md.inline.ruler.before("image", "brew_wikilink", wikilinkRule);
	md.core.ruler.after("inline", "brew_attribution_paragraph", (state) => {
		for (let index = 1; index < state.tokens.length; index += 1) {
			const inlineToken = state.tokens[index];
			const paragraphOpen = state.tokens[index - 1];
			const hasAttribution = inlineToken.children?.some((child) =>
				child.attrGet("class")?.split(/\s+/).includes("attribution")
			);
			if (
				inlineToken.type === "inline" &&
				paragraphOpen.type === "paragraph_open" &&
				hasAttribution
			) {
				paragraphOpen.attrJoin("class", "has-attribution");
			}
		}
	});

	// These two token types are pure markers: pageBreak becomes a sentinel
	// comment that pageSplitter.ts later splits the final HTML string on,
	// and columnBreak becomes a self-contained div (open+close together,
	// since a bare nesting:0 token with an empty tag would otherwise
	// render as a malformed "<>" via markdown-it's default renderToken).
	md.renderer.rules.brew_page_break = () => PAGE_BREAK_SENTINEL;
	md.renderer.rules.brew_column_break = () => '<div class="columnSplit"></div>';
	md.renderer.rules.brew_template_spacer = (tokens, index) =>
		`<div${md.renderer.renderAttrs(tokens[index])}></div>`;
	md.renderer.rules.brew_span = (tokens, index) => {
		const token = tokens[index];
		return `<span${md.renderer.renderAttrs(token)}>${md.renderInline(token.content)}</span>`;
	};

	return md;
}

/** Sentinel inserted into rendered HTML at every `\page`; see pageSplitter.ts */
export const PAGE_BREAK_SENTINEL = "<!--BREW_PAGE_BREAK-->";
