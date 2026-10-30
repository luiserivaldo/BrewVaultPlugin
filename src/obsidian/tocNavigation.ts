import { ViewPlugin, type EditorView } from "@codemirror/view";
import {
	editorInfoField,
	editorLivePreviewField,
	Keymap,
	TFile,
	type App,
	type PaneType,
	type Plugin,
	type WorkspaceLeaf,
} from "obsidian";
import { findHeadingLine, parseTocRowLink, splitTocTarget } from "../toc/tableOfContents";

/**
 * Opens the heading a contents row names, such as `SRD/Imp#Imp`, like a
 * wikilink: the note opens in `leaf` and scrolls to the heading. Returns
 * false when the note no longer exists.
 */
export async function openTocTarget(
	app: App,
	target: string,
	sourcePath: string,
	leaf: WorkspaceLeaf
): Promise<boolean> {
	const { linkpath, heading } = splitTocTarget(target);
	const file = app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
	if (!(file instanceof TFile)) return false;
	const line = heading
		? findHeadingLine(
				(app.metadataCache.getFileCache(file)?.headings ?? []).map((cached) => ({
					heading: cached.heading,
					line: cached.position.start.line,
				})),
				heading
			)
		: null;
	await leaf.openFile(file, { active: true, ...(line === null ? {} : { eState: { line } }) });
	return true;
}

/**
 * Makes contents rows jump to their heading from the editor and from reading
 * view. Rows link to `#p<page>` for Homebrewery; the vault target is kept in
 * the link's title, so BrewVault follows that instead.
 */
export function registerTocNavigation(plugin: Plugin): void {
	const { app } = plugin;

	plugin.registerEditorExtension(
		ViewPlugin.define((view) => {
			// Capture phase: Obsidian follows editor links on click further up
			// and would otherwise look for a heading called "p12".
			const onClick = (event: MouseEvent) => followEditorRow(app, view, event);
			view.dom.addEventListener("click", onClick, true);
			return { destroy: () => view.dom.removeEventListener("click", onClick, true) };
		})
	);

	// Reading view renders rows as ordinary links: point them at the heading
	// so Obsidian opens it like any internal link.
	plugin.registerMarkdownPostProcessor((element) => {
		for (const link of Array.from(element.querySelectorAll<HTMLAnchorElement>("a[data-href^='#p']"))) {
			const title = link.getAttribute("title");
			if (!title || !/^#p\d+$/.test(link.dataset.href ?? "")) continue;
			link.dataset.href = title;
			link.setAttribute("href", title);
		}
	});
}

function followEditorRow(app: App, view: EditorView, event: MouseEvent): void {
	if (event.button !== 0 || !(event.target instanceof Element)) return;
	if (!event.target.closest(".cm-link, .cm-url, .cm-underline")) return;
	const livePreview = view.state.field(editorLivePreviewField, false) ?? false;
	const modifier = Keymap.isModEvent(event);
	// Like Obsidian's own links: a plain click in Live Preview, Mod-click in source mode.
	if (!livePreview && !modifier) return;

	const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
	if (position === null) return;
	const row = parseTocRowLink(view.state.doc.lineAt(position).text);
	const file = view.state.field(editorInfoField, false)?.file;
	if (!row?.target || !(file instanceof TFile)) return;

	event.preventDefault();
	event.stopPropagation();
	const paneType: PaneType | false = livePreview && modifier ? (modifier === true ? "tab" : modifier) : false;
	void openTocTarget(app, row.target, file.path, app.workspace.getLeaf(paneType));
}
