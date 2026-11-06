import { foldedRanges } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { editorLivePreviewField, setIcon } from "obsidian";
import { isBlockLabelsChange } from "./blockLabels";
import { isBlockFolded, toggleBlockFold } from "./homebreweryBlockFolding";
import {
	blockFoldRange,
	findHomebreweryTagRanges,
	selectionTouchesTag,
	type HomebreweryTagRange,
} from "./homebreweryTagSyntax";

const FOLD_TOGGLE_CLASS = "brewvault-tag-fold";

class HomebreweryTagWidget extends WidgetType {
	constructor(
		private readonly label: string,
		private readonly closing: boolean,
		/** What the chevron folds; null for closing tags. */
		private readonly foldRange: { from: number; to: number } | null = null,
		private readonly folded = false
	) {
		super();
	}

	get hasFoldToggle(): boolean {
		return this.foldRange !== null;
	}

	eq(other: HomebreweryTagWidget): boolean {
		return (
			other.label === this.label &&
			other.closing === this.closing &&
			other.folded === this.folded &&
			other.foldRange?.from === this.foldRange?.from &&
			other.foldRange?.to === this.foldRange?.to
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const tag = this.tagElement();
		const range = this.foldRange;
		if (!range) return tag;

		// The chevron collapses everything inside the block, nested blocks and
		// headings included. Obsidian remembers the fold with the note's others.
		const group = createSpan({ cls: "brewvault-tag-preview-group" });
		const toggle = group.createSpan({
			cls: this.folded ? `${FOLD_TOGGLE_CLASS} is-collapsed` : FOLD_TOGGLE_CLASS,
			attr: {
				role: "button",
				"aria-label": `${this.folded ? "Expand" : "Collapse"} ${this.label} block`,
				"aria-expanded": String(!this.folded),
			},
		});
		setIcon(toggle, "chevron-down");
		toggle.addEventListener("mousedown", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleBlockFold(view, range);
		});
		group.appendChild(tag);
		return group;
	}

	ignoreEvent(event: Event): boolean {
		return event.target instanceof Element && event.target.closest(`.${FOLD_TOGGLE_CLASS}`) !== null;
	}

	private tagElement(): HTMLElement {
		return createSpan({
			cls: this.closing
				? "brewvault-tag-preview is-closing"
				: "brewvault-tag-preview",
			text: this.closing ? `End ${this.label}` : this.label,
			attr: {
				"aria-label": this.closing
					? `End ${this.label} block`
					: `${this.label} block`,
			},
		});
	}
}

class HomebreweryPageBreakWidget extends WidgetType {
	constructor(private readonly label: string) {
		super();
	}

	eq(other: HomebreweryPageBreakWidget): boolean {
		return other.label === this.label;
	}

	toDOM(): HTMLElement {
		return createSpan({
			cls: "brewvault-page-break-preview",
			text: this.label,
			attr: {
				role: "separator",
				"aria-label": `Explicit page break; ${this.label} starts`,
			},
		});
	}

	ignoreEvent(): boolean {
		return false;
	}
}

/**
 * Lightweight, editor-local presentation for matched Homebrewery block tags.
 * Labels are drawn in Live Preview only (Source mode shows the text as
 * written), and only while `showLabels()` is on.
 */
export function homebreweryTagPreviewExtension(showLabels: () => boolean): Extension {
	class HomebreweryTagPreviewView {
		decorations: DecorationSet;
		private ranges: HomebreweryTagRange[];

		constructor(view: EditorView) {
			this.ranges = findHomebreweryTagRanges(view.state.doc.toString());
			this.decorations = buildDecorations(view, this.ranges, showLabels());
		}

		update(update: ViewUpdate): void {
			if (update.docChanged) {
				this.ranges = findHomebreweryTagRanges(update.state.doc.toString());
			}

			if (
				update.docChanged ||
				foldedRanges(update.startState) !== foldedRanges(update.state) ||
				update.selectionSet ||
				update.viewportChanged ||
				update.focusChanged ||
				update.startState.field(editorLivePreviewField, false) !==
					update.state.field(editorLivePreviewField, false) ||
				isBlockLabelsChange(update.transactions)
			) {
				this.decorations = buildDecorations(update.view, this.ranges, showLabels());
			}
		}
	}

	return ViewPlugin.fromClass(HomebreweryTagPreviewView, {
		decorations: (plugin) => plugin.decorations,
	});
}

function buildDecorations(
	view: EditorView,
	ranges: readonly HomebreweryTagRange[],
	showLabels: boolean
): DecorationSet {
	if (!showLabels || !view.state.field(editorLivePreviewField, false)) return Decoration.none;
	const selections = view.state.selection.ranges;
	const decorations = ranges
		.filter((range) =>
			view.visibleRanges.some(
				(visible) => range.to >= visible.from && range.from <= visible.to
			)
		)
		.flatMap((range) => {
			// A tag being edited shows its source, and nothing sits in the text
			// flow beside the cursor: its label moves to the line's far edge, so
			// both ends of a block stay labelled without a widget to type around.
			const editing = view.hasFocus && selectionTouchesTag(selections, range);
			if (editing && range.kind === "page") return [];
			if (range.kind === "page") {
				return [
					Decoration.replace({
						widget: new HomebreweryPageBreakWidget(range.label),
					}).range(range.from, range.to),
				];
			}
			if (editing) {
				const label = range.kind === "close" ? `End ${range.label}` : range.label;
				const lineStart = view.state.doc.lineAt(range.from).from;
				return [
					Decoration.line({
						class: "brewvault-tag-editing-line",
						attributes: { "data-brewvault-label": label },
					}).range(lineStart),
				];
			}
			const widget = tagWidget(view, range);
			const replace = Decoration.replace({ widget }).range(range.from, range.to);
			if (!widget.hasFoldToggle) return [replace];
			// Marks the line so CSS can hide Obsidian's duplicate fold arrow
			// without a `:has()` selector re-evaluated on every editor change.
			const lineStart = view.state.doc.lineAt(range.from).from;
			return [foldToggleLine.range(lineStart), replace];
		});

	return Decoration.set(decorations, true);
}

const foldToggleLine = Decoration.line({ class: "brewvault-tag-fold-line" });

function tagWidget(view: EditorView, range: HomebreweryTagRange): HomebreweryTagWidget {
	const fold = blockFoldRange(range);
	return new HomebreweryTagWidget(
		range.label,
		range.kind === "close",
		fold,
		fold !== null && isBlockFolded(view.state, fold.from)
	);
}
