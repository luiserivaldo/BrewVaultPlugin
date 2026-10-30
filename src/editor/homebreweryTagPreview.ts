import { foldedRanges } from "@codemirror/language";
import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { setIcon } from "obsidian";
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

class HomebreweryTagPreviewView {
	decorations: DecorationSet;
	private ranges: HomebreweryTagRange[];

	constructor(view: EditorView) {
		this.ranges = findHomebreweryTagRanges(view.state.doc.toString());
		this.decorations = buildDecorations(view, this.ranges);
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
			update.focusChanged
		) {
			this.decorations = buildDecorations(update.view, this.ranges);
		}
	}
}

/** Lightweight, editor-local presentation for matched Homebrewery block tags. */
export const homebreweryTagPreviewExtension = ViewPlugin.fromClass(
	HomebreweryTagPreviewView,
	{ decorations: (plugin) => plugin.decorations }
);

function buildDecorations(
	view: EditorView,
	ranges: readonly HomebreweryTagRange[]
): DecorationSet {
	const selections = view.state.selection.ranges;
	const decorations = ranges
		.filter((range) =>
			view.visibleRanges.some(
				(visible) => range.to >= visible.from && range.from <= visible.to
			)
		)
		.filter(
			(range) => !view.hasFocus || !selectionTouchesTag(selections, range)
		)
		.flatMap((range) => {
			if (range.kind === "page") {
				return [
					Decoration.replace({
						widget: new HomebreweryPageBreakWidget(range.label),
					}).range(range.from, range.to),
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
