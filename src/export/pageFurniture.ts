/**
 * Per-page decorations added around rendered content: the running footer and
 * the page number. Shared by the preview and standalone export so they match.
 */
export interface PageFurniture {
	readonly footer: string;
	readonly showPageNumbers: boolean;
	readonly firstPageNumber: number;
}

/** Classes on the footer element: Homebrewery's `footnote` plus BrewVault's own. */
export const PAGE_FOOTER_CLASS = "footnote brewvault-running-footer";

export const DEFAULT_PAGE_FURNITURE: PageFurniture = {
	footer: "",
	showPageNumbers: true,
	firstPageNumber: 1,
};

/** Footer text for a page, or null when no footer is shown. */
export function pageFooterText(furniture: PageFurniture): string | null {
	return furniture.footer ? furniture.footer : null;
}


/** Visible page number for a 1-based page index, or null when hidden. */
export function pageNumberText(pageIndex: number, furniture: PageFurniture): string | null {
	if (!furniture.showPageNumbers) return null;
	return String(furniture.firstPageNumber + pageIndex - 1);
}
