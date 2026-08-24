/** A single rendered "sheet of paper" ready to be mounted into the DOM. */
export interface BrewPage {
	/** Sanitized-by-markdown-it inner HTML for this page. */
	html: string;
	/** 1-based page index, for numbering/footer display. */
	index: number;
}
