import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import {
	findHomebreweryTagRanges,
	selectionTouchesTag,
	type HomebreweryTagRange,
} from "./homebreweryTagSyntax";

class HomebreweryTagWidget extends WidgetType {
	constructor(
		private readonly label: string,
		private readonly closing: boolean
	) {
		super();
	}

	eq(other: HomebreweryTagWidget): boolean {
		return other.label === this.label && other.closing === this.closing;
	}

	toDOM(): HTMLElement {
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

	ignoreEvent(): boolean {
		return false;
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
		.map((range) =>
			Decoration.replace({
				widget:
					range.kind === "page"
						? new HomebreweryPageBreakWidget(range.label)
						: new HomebreweryTagWidget(range.label, range.kind === "close"),
			}).range(range.from, range.to)
		);

	return Decoration.set(decorations, true);
}
