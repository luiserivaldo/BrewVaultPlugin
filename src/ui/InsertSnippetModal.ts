import { App, FuzzySuggestModal, type FuzzyMatch, setIcon } from "obsidian";
import { snippetLabel, type BrewSnippet, type Edition } from "../snippets/catalog";

/** Browsable, icon-labelled picker over one edition's view of the catalog. */
export class InsertSnippetModal extends FuzzySuggestModal<BrewSnippet> {
	constructor(
		app: App,
		private readonly snippets: readonly BrewSnippet[],
		edition: Edition,
		private readonly onChoose: (snippet: BrewSnippet) => void
	) {
		super(app);
		this.setPlaceholder(`Insert ${edition} block…`);
	}

	getItems(): BrewSnippet[] {
		return [...this.snippets];
	}

	getItemText(snippet: BrewSnippet): string {
		return snippetLabel(snippet);
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
