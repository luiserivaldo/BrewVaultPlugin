import { StateEffect, StateField, type EditorState, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { editorInfoField, editorLivePreviewField, setIcon } from "obsidian";
import { isBlockLabelsChange } from "./blockLabels";
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
		private readonly showLabel: boolean,
		private readonly sourcePath: string | null,
		private readonly mount: MountMonsterBlock
	) {
		super();
	}

	eq(other: MonsterBlockWidget): boolean {
		return (
			other.markdown === this.markdown &&
			other.label === this.label &&
			other.showLabel === this.showLabel &&
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
		if (this.showLabel) this.tagRow(widget, this.label, false);
		const card = widget.createDiv({ cls: "brewvault-monster-card" });
		this.mount(card, this.sourcePath, this.markdown);
		const edit = card.createEl("button", {
			cls: "brewvault-monster-edit clickable-icon",
			attr: { type: "button", "aria-label": "Edit block source" },
		});
		setIcon(edit, "code-2");
		if (this.showLabel) this.tagRow(widget, `End ${this.label}`, true);

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

interface BlockDecorations {
	readonly set: DecorationSet;
	/** Which blocks are drawn as cards (not being edited), by start offset. */
	readonly key: string;
	/** A mouse button is down in the editor; cards are not redrawn yet. */
	readonly pointerDown: boolean;
}

const pointerDownChanged = StateEffect.define<boolean>();

function buildDecorations(
	state: EditorState,
	mount: MountMonsterBlock,
	showLabels: boolean,
	pointerDown: boolean
): BlockDecorations {
	// Source mode shows the text as written; only Live Preview draws blocks.
	if (!state.field(editorLivePreviewField, false)) {
		return { set: Decoration.none, key: "", pointerDown };
	}

	const sourcePath = state.field(editorInfoField, false)?.file?.path ?? null;
	const selections = state.selection.ranges;
	const drawn = monsterBlocksFor(state.doc).filter(
		(block) => !selections.some((range) => range.from <= block.to && range.to >= block.from)
	);
	const decorations = drawn.map((block) =>
		Decoration.replace({
			widget: new MonsterBlockWidget(
				block.markdown,
				formatHomebreweryTagLabel(block.classes.join(",")),
				showLabels,
				sourcePath,
				mount
			),
			block: true,
		}).range(block.from, block.to)
	);
	return {
		set: Decoration.set(decorations),
		key: drawn.map((block) => block.from).join(","),
		pointerDown,
	};
}

/**
 * Live Preview: shows each `{{monster ... }}` block as its rendered stat block
 * while the cursor is elsewhere, and as plain source (with its tag chips) while
 * the cursor is inside. The source text is never changed.
 *
 * Two things keep clicking out of a tall block from misbehaving. The card is
 * not drawn until the mouse button is released: collapsing the source at
 * mouse-down shifts the page under the pointer, so the release lands on the
 * card and selects the block again. And when the card is drawn, the cursor
 * line is kept at the same place on screen instead of the page jumping.
 */
export function monsterBlockPreviewExtension(
	mount: MountMonsterBlock,
	showLabels: () => boolean
): Extension {
	const field = StateField.define<BlockDecorations>({
		create: (state) => buildDecorations(state, mount, showLabels(), false),
		update(value, transaction) {
			let pointerDown = value.pointerDown;
			for (const effect of transaction.effects) {
				if (effect.is(pointerDownChanged)) pointerDown = effect.value;
			}
			const released = value.pointerDown && !pointerDown;
			const modeChanged =
				transaction.startState.field(editorLivePreviewField, false) !==
				transaction.state.field(editorLivePreviewField, false);
			if (
				transaction.docChanged ||
				modeChanged ||
				released ||
				isBlockLabelsChange([transaction]) ||
				(transaction.selection && !pointerDown)
			) {
				return buildDecorations(transaction.state, mount, showLabels(), pointerDown);
			}
			return pointerDown === value.pointerDown ? value : { ...value, pointerDown };
		},
		provide: (decorations) => EditorView.decorations.from(decorations, (value) => value.set),
	});

	const trackPointer = EditorView.domEventHandlers({
		mousedown(_event, view) {
			view.dispatch({ effects: pointerDownChanged.of(true) });
			window.addEventListener(
				"mouseup",
				() => view.dispatch({ effects: pointerDownChanged.of(false) }),
				{ once: true, capture: true }
			);
			return false;
		},
	});

	const keepCursorInPlace = ViewPlugin.fromClass(
		class {
			/**
			 * Where the cursor line last sat on screen. CodeMirror cannot say once
			 * the layout has changed (the line may no longer be drawn), so it is
			 * remembered while the layout is still the one the user clicked on.
			 */
			private seen: { pos: number; top: number } | null = null;

			update(update: ViewUpdate): void {
				if (update.docChanged) {
					this.seen = null;
					return;
				}
				const head = update.state.selection.main.head;
				if (update.startState.field(field).key === update.state.field(field).key) {
					if (update.selectionSet) {
						// Read after the update has been drawn; mid-update the editor
						// cannot report where a line is.
						update.view.requestMeasure({
							read: (view) => this.measure(view, head),
							write: (seen) => {
								this.seen = seen;
							},
						});
					}
					return;
				}

				const before = this.seen?.pos === head ? this.seen.top : null;
				const view = update.view;
				if (before === null) {
					// No remembered position (such as moving with the keyboard): at
					// least keep the cursor on screen rather than leaving it far off.
					window.requestAnimationFrame(() => {
						if (view.dom.isConnected) {
							view.dispatch({ effects: EditorView.scrollIntoView(head, { y: "nearest", yMargin: 40 }) });
						}
					});
					return;
				}
				this.restore(view, head, before);
			}

			private measure(view: EditorView, pos: number): { pos: number; top: number } | null {
				try {
					const rect = view.coordsAtPos(pos);
					return rect ? { pos, top: rect.top } : null;
				} catch {
					return null;
				}
			}

			/**
			 * CodeMirror applies its own scroll anchor (the first visible line)
			 * during layout. After a collapse that line can be gone, so the page
			 * lands at the block's start and the cursor line may not be drawn at
			 * all. This puts the cursor line back at `before`, first by its
			 * estimated position and then, once drawn, by its real one, for as long
			 * as the layout keeps moving. Any scrolling by the user stops it.
			 */
			private restore(view: EditorView, head: number, before: number): void {
				let cancelled = false;
				const cancel = (): void => {
					cancelled = true;
					view.scrollDOM.removeEventListener("wheel", cancel);
					view.scrollDOM.removeEventListener("touchmove", cancel);
					view.scrollDOM.removeEventListener("keydown", cancel);
				};
				view.scrollDOM.addEventListener("wheel", cancel, { passive: true });
				view.scrollDOM.addEventListener("touchmove", cancel, { passive: true });
				view.scrollDOM.addEventListener("keydown", cancel);

				const settle = (framesLeft: number, steadyFrames: number): void => {
					if (cancelled || !view.dom.isConnected) return cancel();
					const drawn = view.coordsAtPos(head)?.top;
					const top = drawn ?? view.documentTop + view.lineBlockAt(head).top;
					const shift = top - before;
					const moved = Math.abs(shift) > 0.5;
					if (moved) view.scrollDOM.scrollTop += shift;
					const steady = moved || drawn === undefined ? 0 : steadyFrames + 1;
					if (framesLeft <= 0 || steady >= 3) return cancel();
					window.requestAnimationFrame(() => settle(framesLeft - 1, steady));
				};
				window.requestAnimationFrame(() => settle(30, 0));
			}
		}
	);

	return [field, trackPointer, keepCursorInPlace];
}
