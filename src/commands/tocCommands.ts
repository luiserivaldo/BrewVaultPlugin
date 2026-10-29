import { Notice, TFile, type Editor, type Plugin } from "obsidian";
import { renderNotePages } from "../obsidian/renderNotePages";
import type { BrewPage } from "../renderer/types";
import { formatSnippetForCursor } from "../snippets/insertion";
import {
	buildTocBlock,
	detectHeadings,
	findTocBlock,
	formatTocRows,
	TOC_HEADER,
	TOC_OPENER,
} from "../toc/tableOfContents";
import { findTargetMarkdownView } from "./insertSnippet";

/** How a note is laid out for export: the same pages its PDF would have. */
export interface TocLayout {
	readonly firstPageNumber: number;
	readonly paginate: (pages: BrewPage[]) => Promise<BrewPage[]>;
}

/**
 * Writing the contents can push headings onto later pages, so the note is
 * laid out again with the new block until the page numbers stop changing.
 */
const MAX_LAYOUT_PASSES = 4;

export function registerTocCommands(plugin: Plugin, layoutFor: (file: TFile) => TocLayout): void {
	plugin.addCommand({
		id: "generate-table-of-contents",
		name: "Generate table of contents",
		checkCallback: (checking) => {
			const view = findTargetMarkdownView(plugin);
			const file = view?.file;
			if (!view || !(file instanceof TFile)) return false;
			if (!checking) void generateTableOfContents(plugin, file, view.editor, layoutFor(file));
			return true;
		},
	});
}

/**
 * Writes or refreshes the note's `{{toc` block from its `#`, `##`, and `###`
 * headings and the pages they land on, including notes compiled into it.
 * The result is ordinary Markdown: edit it freely, and run the command again
 * to refresh it.
 */
async function generateTableOfContents(
	plugin: Plugin,
	file: TFile,
	editor: Editor,
	layout: TocLayout
): Promise<void> {
	const source = editor.getValue();
	const existing = findTocBlock(source);
	let from: number;
	let to: number;
	let place: (block: string) => string;
	if (existing) {
		from = editor.posToOffset({ line: existing.startLine, ch: 0 });
		to = editor.posToOffset({ line: existing.endLine, ch: editor.getLine(existing.endLine).length });
		place = (block) => block;
	} else {
		const cursorFrom = editor.getCursor("from");
		const cursorTo = editor.getCursor("to");
		from = editor.posToOffset(cursorFrom);
		to = editor.posToOffset(cursorTo);
		const before = editor.getLine(cursorFrom.line).slice(0, cursorFrom.ch);
		const after = editor.getLine(cursorTo.line).slice(cursorTo.ch);
		place = (block) => formatSnippetForCursor(`${block}\n`, before, after);
	}
	const opener = existing?.opener ?? TOC_OPENER;
	const header = existing?.header ?? [TOC_HEADER];

	const working = new Notice("Generating table of contents…", 0);
	let block = existing ? source.slice(from, to) : buildTocBlock([], opener, header);
	let headingCount = 0;
	try {
		for (let pass = 0; pass < MAX_LAYOUT_PASSES; pass++) {
			const candidate = source.slice(0, from) + place(block) + source.slice(to);
			const rendered = await renderNotePages(plugin.app, {
				file,
				source: candidate,
				paginate: layout.paginate,
			});
			const headings = detectHeadings(rendered.pages);
			headingCount = headings.length;
			const next = buildTocBlock(formatTocRows(headings, layout.firstPageNumber), opener, header);
			if (next === block) break;
			block = next;
		}
	} finally {
		working.hide();
	}

	if (headingCount === 0) {
		new Notice("No #, ##, or ### headings found, so there is nothing to list.");
		return;
	}
	if (editor.getValue() !== source) {
		new Notice("The note changed while the contents were generated. Run the command again.");
		return;
	}
	editor.replaceRange(place(block), editor.offsetToPos(from), editor.offsetToPos(to));
	new Notice(
		`${existing ? "Refreshed" : "Added"} the table of contents: ${headingCount} ${headingCount === 1 ? "heading" : "headings"}.`
	);
}
