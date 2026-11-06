import { StateField, type EditorState, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField, setIcon } from "obsidian";
import { formatHomebreweryTagLabel } from "./homebreweryTagSyntax";
import { findMonsterBlocks, type MonsterBlock } from "./monsterBlocks";

/** Draws a block's Markdown into `host`; supplied by the plugin. */
export type MountMonsterBlock = (
	host: HTMLElement,
	sourcePath: string | null,
	markdown: string
) => void;

class MonsterBlockWidget extends WidgetType {
	constructor(
		private readonly markdown: string,
		private readonly label: string,
		private readonly sourcePath: string | null,
		private readonly mount: MountMonsterBlock
	) {
		super();
	}

	eq(other: MonsterBlockWidget): boolean {
		return (
			other.markdown === this.markdown &&
			other.label === this.label &&
			other.sourcePath === this.sourcePath
		);
	}

	/** A first guess before the block is measured, so scrolling does not jump. */
	get estimatedHeight(): number {
		return 320;
	}

	toDOM(view: EditorView): HTMLElement {
		const widget = createDiv({ cls: "brewvault-monster-widget" });
		const reveal = (): void => {
			view.dispatch({ selection: { anchor: view.posAtDOM(widget) } });
			view.focus();
		};

		// The same start and end tags the editor shows around the source, so the
		// card reads as the block it is: code, drawn, with its contents between.
		this.tagRow(widget, this.label, false);
		const card = widget.createDiv({ cls: "brewvault-monster-card" });
		this.mount(card, this.sourcePath, this.markdown);
		const edit = card.createEl("button", {
			cls: "brewvault-monster-edit clickable-icon",
			attr: { type: "button", "aria-label": "Edit block source" },
		});
		setIcon(edit, "code-2");
		this.tagRow(widget, `End ${this.label}`, true);

		// Clicking anywhere on the card reveals its source: the block is drawn
		// only while the cursor is outside it.
		widget.addEventListener("mousedown", (event) => {
			if (event.target instanceof Element && event.target.closest("a")) return;
			event.preventDefault();
			reveal();
		});
		// Keyboard activation of the edit button arrives as a click with no pointer.
		edit.addEventListener("click", (event) => {
			if (event.detail === 0) reveal();
		});
		return widget;
	}

	private tagRow(widget: HTMLElement, text: string, closing: boolean): void {
		const row = widget.createDiv({ cls: "brewvault-monster-tag-row" });
		row.createSpan({
			cls: closing ? "brewvault-tag-preview is-closing" : "brewvault-tag-preview",
			text,
			attr: { "aria-label": `${text} block. Click to edit its source.` },
		});
	}
}

const blocksByDoc = new WeakMap<Text, MonsterBlock[]>();

function monsterBlocksFor(doc: Text): MonsterBlock[] {
	let blocks = blocksByDoc.get(doc);
	if (!blocks) {
		blocks = findMonsterBlocks(doc.toString());
		blocksByDoc.set(doc, blocks);
	}
	return blocks;
}

function buildDecorations(state: EditorState, mount: MountMonsterBlock): DecorationSet {
	// Source mode shows the text as written; only Live Preview draws blocks.
	if (!state.field(editorLivePreviewField, false)) return Decoration.none;

	const sourcePath = state.field(editorInfoField, false)?.file?.path ?? null;
	const selections = state.selection.ranges;
	const decorations = monsterBlocksFor(state.doc)
		.filter((block) => !selections.some((range) => range.from <= block.to && range.to >= block.from))
		.map((block) =>
			Decoration.replace({
				widget: new MonsterBlockWidget(
					block.markdown,
					formatHomebreweryTagLabel(block.classes.join(",")),
					sourcePath,
					mount
				),
				block: true,
			}).range(block.from, block.to)
		);
	return Decoration.set(decorations);
}

/**
 * Live Preview: shows each `{{monster ... }}` block as its rendered stat block
 * while the cursor is elsewhere, and as plain source (with its tag chips) while
 * the cursor is inside. The source text is never changed.
 */
export function monsterBlockPreviewExtension(mount: MountMonsterBlock): Extension {
	return StateField.define<DecorationSet>({
		create: (state) => buildDecorations(state, mount),
		update(value, transaction) {
			const modeChanged =
				transaction.startState.field(editorLivePreviewField, false) !==
				transaction.state.field(editorLivePreviewField, false);
			if (transaction.docChanged || transaction.selection || modeChanged) {
				return buildDecorations(transaction.state, mount);
			}
			return value;
		},
		provide: (field) => EditorView.decorations.from(field),
	});
}
