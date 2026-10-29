import { Notice, TFile, type App, type Editor, type Plugin } from "obsidian";
import { hasBookContent, parseIncludeLine } from "../book/manifest";
import { BOOK_CONTENT_BLOCK, expandIncludeMarkdown, includeLine } from "../book/skeleton";
import { planBookNote } from "../obsidian/renderNotePages";
import { BookContentsModal, FolderSuggestModal } from "../ui/BookModals";
import { findTargetMarkdownView, insertBlock } from "./insertSnippet";

/**
 * Commands for compiling notes into one document. They only ever edit the
 * compiling note itself, and only when the user runs them.
 */
export function registerBookCommands(plugin: Plugin): void {
	const { app } = plugin;

	plugin.addCommand({
		id: "show-book-contents",
		name: "Show included notes",
		checkCallback: (checking) => {
			const file = app.workspace.getActiveFile();
			const canRun = file instanceof TFile && file.extension === "md";
			if (canRun && !checking) openBookContents(app, file);
			return canRun;
		},
	});

	plugin.addCommand({
		id: "insert-book-content",
		name: "Insert book content block",
		checkCallback: (checking) => {
			const view = findTargetMarkdownView(plugin);
			if (!view) return false;
			if (!checking) insertBlock(view.editor, BOOK_CONTENT_BLOCK);
			return true;
		},
	});

	plugin.addCommand({
		id: "insert-folder-include",
		name: "Insert folder include…",
		checkCallback: (checking) => {
			const view = findTargetMarkdownView(plugin);
			if (!view) return false;
			if (!checking) {
				new FolderSuggestModal(app, (folder) => {
					insertBlock(view.editor, `${includeLine(folder.path)}\n`);
				}).open();
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "expand-include-into-links",
		name: "Expand include into links",
		checkCallback: (checking) => {
			const view = findTargetMarkdownView(plugin);
			const file = view?.file;
			if (!view || !(file instanceof TFile)) return false;
			const line = view.editor.getCursor().line;
			if (parseIncludeLine(view.editor.getLine(line)) === null) return false;
			if (!checking) expandInclude(app, file, view.editor, line);
			return true;
		},
	});
}

/** Opens the notes a `{{bookContent}}` block includes, in order, and any problems. */
export function openBookContents(app: App, file: TFile): void {
	void app.vault.cachedRead(file).then((source) => {
		if (!hasBookContent(source)) {
			new Notice(`"${file.basename}" has no {{bookContent}} block, so it doesn't include other notes.`);
			return;
		}
		new BookContentsModal(app, file.basename, planBookNote(app, file, source).plan).open();
	});
}

function expandInclude(app: App, file: TFile, editor: Editor, line: number): void {
	const { plan } = planBookNote(app, file, editor.getValue());
	const links: string[] = [];
	for (const segment of plan.segments) {
		if (segment.kind !== "member" || segment.includeLine !== line + 1) continue;
		const target = app.vault.getAbstractFileByPath(segment.note.path);
		if (target instanceof TFile) links.push(app.metadataCache.fileToLinktext(target, file.path, true));
	}

	if (links.length === 0) {
		new Notice("This include adds no notes, so there is nothing to expand.");
		return;
	}
	const current = editor.getLine(line);
	editor.replaceRange(expandIncludeMarkdown(links), { line, ch: 0 }, { line, ch: current.length });
}
