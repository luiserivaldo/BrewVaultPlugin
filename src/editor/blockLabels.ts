import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** Sent to an editor to make it re-read the "Show block labels" setting. */
export const blockLabelsChanged = StateEffect.define<null>();

export function isBlockLabelsChange(transactions: readonly { effects: readonly StateEffect<unknown>[] }[]): boolean {
	return transactions.some((transaction) => transaction.effects.some((effect) => effect.is(blockLabelsChanged)));
}

export function refreshBlockLabels(view: EditorView): void {
	view.dispatch({ effects: blockLabelsChanged.of(null) });
}
