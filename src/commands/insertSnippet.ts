import { MarkdownView, type Editor, type Plugin } from "obsidian";
import {
	EDITIONS,
	SNIPPET_CATALOG,
	SNIPPET_FAMILIES,
	resolveSnippetFamily,
	snippetLabel,
	snippetsForEdition,
	type BrewSnippet,
	type Edition,
} from "../snippets/catalog";
import { formatSnippetForCursor } from "../snippets/insertion";
import { InsertSnippetModal } from "../ui/InsertSnippetModal";

/**
 * One palette command per snippet, so each is searchable and hotkey-bindable,
 * plus browsable pickers. Command ids derive from snippet ids, which makes
 * snippet ids part of the saved-hotkey contract: never rename one.
 *
 * Edition-sensitive blocks get an explicit command per edition plus an
 * `insert-default-<family>` command that follows the default-edition setting,
 * read at run time so changing the setting needs no reload.
 */
export function registerInsertSnippetCommands(
	plugin: Plugin,
	getDefaultEdition: () => Edition
): void {
	plugin.addCommand({
		id: "insert-block",
		name: "Insert block…",
		checkCallback: (checking) =>
			withTargetEditor(plugin, checking, (editor) =>
				openPicker(plugin, editor, getDefaultEdition())
			),
	});
	for (const edition of EDITIONS) {
		plugin.addCommand({
			id: `insert-block-${edition}`,
			name: `Insert ${edition} block…`,
			checkCallback: (checking) =>
				withTargetEditor(plugin, checking, (editor) => openPicker(plugin, editor, edition)),
		});
	}

	for (const family of SNIPPET_FAMILIES) {
		const sample = resolveSnippetFamily(family, "2024");
		if (!sample) continue;
		plugin.addCommand({
			id: `insert-default-${family}`,
			name: `Insert ${snippetLabel(sample, false)}`,
			icon: sample.icon,
			checkCallback: (checking) =>
				withTargetEditor(plugin, checking, (editor) =>
					insertSnippet(editor, resolveSnippetFamily(family, getDefaultEdition()) ?? sample)
				),
		});
	}

	for (const snippet of SNIPPET_CATALOG) {
		plugin.addCommand({
			id: `insert-${snippet.id}`,
			name: `Insert ${snippetLabel(snippet)}`,
			icon: snippet.icon,
			checkCallback: (checking) =>
				withTargetEditor(plugin, checking, (editor) => insertSnippet(editor, snippet)),
		});
	}
}

function openPicker(plugin: Plugin, editor: Editor, edition: Edition): void {
	new InsertSnippetModal(plugin.app, snippetsForEdition(edition), edition, (snippet) =>
		insertSnippet(editor, snippet)
	).open();
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
