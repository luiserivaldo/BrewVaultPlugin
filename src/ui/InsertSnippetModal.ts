import { App, FuzzySuggestModal, type FuzzyMatch, setIcon } from "obsidian";
import {
	SNIPPET_CATALOG,
	SNIPPET_GROUP_LABELS,
	type BrewSnippet,
} from "../snippets/catalog";

/** Browsable, icon-labelled picker over the snippet catalog. */
export class InsertSnippetModal extends FuzzySuggestModal<BrewSnippet> {
	constructor(app: App, private readonly onChoose: (snippet: BrewSnippet) => void) {
		super(app);
		this.setPlaceholder("Insert block…");
	}

	getItems(): BrewSnippet[] {
		return [...SNIPPET_CATALOG];
	}

	getItemText(snippet: BrewSnippet): string {
		return `${SNIPPET_GROUP_LABELS[snippet.group]}: ${snippet.name}`;
	}

	renderSuggestion(match: FuzzyMatch<BrewSnippet>, el: HTMLElement): void {
		el.addClass("brewvault-snippet-suggestion");
		setIcon(el.createSpan({ cls: "brewvault-snippet-icon" }), match.item.icon);
		el.createSpan({ text: this.getItemText(match.item) });
	}

	onChooseItem(snippet: BrewSnippet): void {
		this.onChoose(snippet);
	}
}
