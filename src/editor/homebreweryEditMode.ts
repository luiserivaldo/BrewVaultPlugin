import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type { AutomaticPageBreak } from "./automaticPageBreaks";
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

class AutomaticPageBreakWidget extends WidgetType {
	constructor(private readonly pageNumber: number) {
		super();
	}

	eq(other: AutomaticPageBreakWidget): boolean {
		return other.pageNumber === this.pageNumber;
	}

	toDOM(): HTMLElement {
		const element = document.createElement("div");
		element.className = "brewvault-edit-automatic-page-break";
		element.textContent = `Generated page ${this.pageNumber} starts`;
		element.setAttribute("role", "separator");
		element.setAttribute(
			"aria-label",
			`Automatically generated page ${this.pageNumber} starts`
		);
		return element;
	}
}

class HomebreweryEditModeView {
	decorations: DecorationSet;
	private constructs: HomebrewerySyntaxConstruct[];

	constructor(
		view: EditorView,
		private readonly getAutomaticBreaks: (filePath: string) => readonly AutomaticPageBreak[]
	) {
		this.constructs = findHomebrewerySyntax(view.state.doc.toString());
		this.decorations = buildDecorations(view, this.constructs, this.getBreaks(view));
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
			this.decorations = buildDecorations(
				update.view,
				this.constructs,
				this.getBreaks(update.view)
			);
		}
	}

	private getBreaks(view: EditorView): readonly AutomaticPageBreak[] {
		const file = view.state.field(editorInfoField, false)?.file;
		return file ? this.getAutomaticBreaks(file.path) : [];
	}
}

/** Creates the editor presentation backed by the latest measured preview boundaries. */
export function createHomebreweryEditModeExtension(
	getAutomaticBreaks: (filePath: string) => readonly AutomaticPageBreak[]
) {
	return ViewPlugin.define(
		(view) => new HomebreweryEditModeView(view, getAutomaticBreaks),
		{ decorations: (plugin) => plugin.decorations }
	);
}

function buildDecorations(
	view: EditorView,
	constructs: readonly HomebrewerySyntaxConstruct[],
	automaticBreaks: readonly AutomaticPageBreak[]
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

	for (const boundary of automaticBreaks) {
		if (boundary.line < 0 || boundary.line >= view.state.doc.lines) continue;
		const line = view.state.doc.line(boundary.line + 1);
		if (!view.visibleRanges.some((visible) => line.to >= visible.from && line.from <= visible.to)) {
			continue;
		}
		ranges.push(
			Decoration.widget({
				widget: new AutomaticPageBreakWidget(boundary.pageNumber),
				block: true,
				side: -1,
			}).range(line.from)
		);
	}

	return Decoration.set(ranges, true);
}

function isVisible(view: EditorView, construct: HomebrewerySyntaxConstruct): boolean {
	return view.visibleRanges.some(
		(visible) => construct.to >= visible.from && construct.from <= visible.to
	);
}
