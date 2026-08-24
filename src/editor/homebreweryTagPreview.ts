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
		const element = document.createElement("span");
		element.className = this.closing
			? "brewvault-tag-preview is-closing"
			: "brewvault-tag-preview";
		element.textContent = this.closing ? `End ${this.label}` : this.label;
		element.setAttribute(
			"aria-label",
			this.closing ? `End ${this.label} block` : `${this.label} block`
		);
		return element;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

class HomebreweryPageBreakWidget extends WidgetType {
	eq(): boolean {
		return true;
	}

	toDOM(): HTMLElement {
		const element = document.createElement("span");
		element.className = "brewvault-page-break-preview";
		element.textContent = "Next page starts";
		element.setAttribute("role", "separator");
		element.setAttribute("aria-label", "Explicit page break; next page starts");
		return element;
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
						? new HomebreweryPageBreakWidget()
						: new HomebreweryTagWidget(range.label, range.kind === "close"),
			}).range(range.from, range.to)
		);

	return Decoration.set(decorations, true);
}
