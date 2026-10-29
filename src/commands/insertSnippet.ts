import { MarkdownView, type Editor, type Plugin } from "obsidian";
import {
	SNIPPET_CATALOG,
	SNIPPET_GROUP_LABELS,
	type BrewSnippet,
} from "../snippets/catalog";
import { formatSnippetForCursor } from "../snippets/insertion";
import { InsertSnippetModal } from "../ui/InsertSnippetModal";

/**
 * One palette command per snippet, so each is searchable and hotkey-bindable,
 * plus a browsable picker. Command ids derive from snippet ids, which makes
 * snippet ids part of the saved-hotkey contract: never rename one.
 */
export function registerInsertSnippetCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: "insert-block",
		name: "Insert block…",
		checkCallback: (checking) =>
			withTargetEditor(plugin, checking, (editor) =>
				new InsertSnippetModal(plugin.app, (snippet) => insertSnippet(editor, snippet)).open()
			),
	});

	for (const snippet of SNIPPET_CATALOG) {
		plugin.addCommand({
			id: `insert-${snippet.id}`,
			name: `Insert ${SNIPPET_GROUP_LABELS[snippet.group]}: ${snippet.name}`,
			icon: snippet.icon,
			checkCallback: (checking) =>
				withTargetEditor(plugin, checking, (editor) => insertSnippet(editor, snippet)),
		});
	}
}

// Not an editorCallback: those hide the command whenever focus is in a
// sidebar (file explorer, PDF, preview), even with a note open beside it.
function withTargetEditor(plugin: Plugin, checking: boolean, run: (editor: Editor) => void): boolean {
	const editor = findTargetEditor(plugin);
	if (!editor) return false;
	if (!checking) run(editor);
	return true;
}

/** The focused note's editor, else the most recently used note in the main area. */
function findTargetEditor(plugin: Plugin): Editor | null {
	const { workspace } = plugin.app;
	const active = workspace.getActiveViewOfType(MarkdownView);
	if (active?.getMode() === "source") return active.editor;

	const recent = workspace.getMostRecentLeaf(workspace.rootSplit)?.view;
	return recent instanceof MarkdownView && recent.getMode() === "source"
		? recent.editor
		: null;
}

function insertSnippet(editor: Editor, snippet: BrewSnippet): void {
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");
	const text = formatSnippetForCursor(
		snippet.body,
		editor.getLine(from.line).slice(0, from.ch),
		editor.getLine(to.line).slice(to.ch)
	);
	// replaceSelection is a single undoable editor transaction.
	editor.replaceSelection(text);
	editor.focus();
}
