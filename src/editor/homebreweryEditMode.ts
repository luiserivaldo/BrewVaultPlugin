import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import {
	findHomebrewerySyntax,
	selectionTouchesConstruct,
	type HomebrewerySyntaxConstruct,
} from "./homebrewerySyntax";

class BlockDelimiterWidget extends WidgetType {
	constructor(
		private readonly label: string,
		private readonly closing: boolean
	) {
		super();
	}

	eq(other: BlockDelimiterWidget): boolean {
		return other.label === this.label && other.closing === this.closing;
	}

	toDOM(): HTMLElement {
		const element = document.createElement("span");
		element.className = this.closing
			? "brewvault-edit-block-label is-closing"
			: "brewvault-edit-block-label";
		element.textContent = this.closing ? `End ${this.label}` : this.label;
		element.setAttribute("aria-label", this.closing ? `End ${this.label} block` : `${this.label} block`);
		return element;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

class LayoutBreakWidget extends WidgetType {
	constructor(
		private readonly label: string,
		private readonly pageBreak: boolean
	) {
		super();
	}

	eq(other: LayoutBreakWidget): boolean {
		return other.label === this.label && other.pageBreak === this.pageBreak;
	}

	toDOM(): HTMLElement {
		const element = document.createElement("span");
		element.className = this.pageBreak
			? "brewvault-edit-layout-break is-page-break"
			: "brewvault-edit-layout-break is-column-break";
		element.textContent = this.label;
		element.setAttribute("role", "separator");
		element.setAttribute("aria-label", this.label);
		return element;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

class HomebreweryEditModeView {
	decorations: DecorationSet;
	private constructs: HomebrewerySyntaxConstruct[];

	constructor(view: EditorView) {
		this.constructs = findHomebrewerySyntax(view.state.doc.toString());
		this.decorations = buildDecorations(view, this.constructs);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged) {
			this.constructs = findHomebrewerySyntax(update.state.doc.toString());
		}

		if (
			update.docChanged ||
			update.selectionSet ||
			update.viewportChanged ||
			update.focusChanged
		) {
			this.decorations = buildDecorations(update.view, this.constructs);
		}
	}
}

/** CodeMirror extension that presents block delimiters as readable labels. */
export const homebreweryEditModeExtension = ViewPlugin.fromClass(
	HomebreweryEditModeView,
	{
		decorations: (plugin) => plugin.decorations,
	}
);

function buildDecorations(
	view: EditorView,
	constructs: readonly HomebrewerySyntaxConstruct[]
): DecorationSet {
	const selections = view.state.selection.ranges;
	const ranges: ReturnType<Decoration["range"]>[] = [];

	for (const construct of constructs) {
		if (!isVisible(view, construct)) continue;

		const sourceIsSelected =
			view.hasFocus && selectionTouchesConstruct(selections, construct);
		if (construct.kind === "block-open" || construct.kind === "block-close") {
			if (!sourceIsSelected) {
				ranges.push(
					Decoration.replace({
						widget: new BlockDelimiterWidget(
							construct.label,
							construct.kind === "block-close"
						),
					}).range(construct.from, construct.to)
				);
			}
			continue;
		}

		const pageBreak = construct.kind === "page-break";
		ranges.push(
			Decoration.line({
				class: pageBreak
					? "brewvault-edit-break-line is-page-break"
					: "brewvault-edit-break-line is-column-break",
			}).range(construct.lineFrom)
		);
		if (!sourceIsSelected) {
			ranges.push(
				Decoration.replace({
					widget: new LayoutBreakWidget(construct.label, pageBreak),
				}).range(construct.from, construct.to)
			);
		}
	}

	return Decoration.set(ranges, true);
}

function isVisible(view: EditorView, construct: HomebrewerySyntaxConstruct): boolean {
	return view.visibleRanges.some(
		(visible) => construct.to >= visible.from && construct.from <= visible.to
	);
}
