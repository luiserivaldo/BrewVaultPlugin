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
 * Palette commands for the snippet catalog. Command ids derive from snippet
 * ids, which makes snippet ids part of the saved-hotkey contract: never
 * rename one.
 *
 * Always registered: the pickers, one `insert-default-<family>` command per
 * edition-sensitive block (following the note's or default edition, read at
 * run time), and every edition-neutral block. The per-edition variants
 * (`insert-<id>`, e.g. "PHB 2014: Spell") are opt-in through
 * {@link syncEditionBlockCommands}, so the palette stays short by default.
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
		if (!snippet.edition) addSnippetCommand(plugin, snippet);
	}
}

const pluginsWithEditionCommands = new WeakSet<Plugin>();

/** Adds or removes the per-edition block commands; safe to call repeatedly. */
export function syncEditionBlockCommands(plugin: Plugin, enabled: boolean): void {
	if (enabled === pluginsWithEditionCommands.has(plugin)) return;
	for (const snippet of SNIPPET_CATALOG) {
		if (!snippet.edition) continue;
		if (enabled) addSnippetCommand(plugin, snippet);
		else plugin.removeCommand(snippetCommandId(snippet));
	}
	if (enabled) pluginsWithEditionCommands.add(plugin);
	else pluginsWithEditionCommands.delete(plugin);
}

function snippetCommandId(snippet: BrewSnippet): string {
	return `insert-${snippet.id}`;
}

function addSnippetCommand(plugin: Plugin, snippet: BrewSnippet): void {
	plugin.addCommand({
		id: snippetCommandId(snippet),
		name: `Insert ${snippetLabel(snippet)}`,
		icon: snippet.icon,
		checkCallback: (checking) =>
			withTargetEditor(plugin, checking, (editor) => insertSnippet(editor, snippet)),
	});
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

function findTargetEditor(plugin: Plugin): Editor | null {
	return findTargetMarkdownView(plugin)?.editor ?? null;
}

/** The focused note in edit mode, else the most recently used one in the main area. */
export function findTargetMarkdownView(plugin: Plugin): MarkdownView | null {
	const { workspace } = plugin.app;
	const active = workspace.getActiveViewOfType(MarkdownView);
	if (active?.getMode() === "source") return active;

	const recent = workspace.getMostRecentLeaf(workspace.rootSplit)?.view;
	return recent instanceof MarkdownView && recent.getMode() === "source" ? recent : null;
}

function insertSnippet(editor: Editor, snippet: BrewSnippet): void {
	insertBlock(editor, snippet.body);
}

/** Inserts block-level Markdown on its own lines, as one undoable edit. */
export function insertBlock(editor: Editor, body: string): void {
	const from = editor.getCursor("from");
	const to = editor.getCursor("to");
	const text = formatSnippetForCursor(
		body,
		editor.getLine(from.line).slice(0, from.ch),
		editor.getLine(to.line).slice(to.ch)
	);
	// replaceSelection is a single undoable editor transaction.
	editor.replaceSelection(text);
	editor.focus();
}
