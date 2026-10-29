/**
 * Per-page decorations added around rendered content: the running footer and
 * the page number. Shared by the preview and standalone export so they match.
 */
export interface PageFurniture {
	readonly footer: string;
	readonly showPageNumbers: boolean;
}

export const DEFAULT_PAGE_FURNITURE: PageFurniture = { footer: "", showPageNumbers: true };

/** Footer text for a page, or null when no footer is shown. */
export function pageFooterText(furniture: PageFurniture): string | null {
	return furniture.footer ? furniture.footer : null;
}


/** Visible page number for a 1-based page index, or null when hidden. */
export function pageNumberText(pageIndex: number, furniture: PageFurniture): string | null {
	return furniture.showPageNumbers ? String(pageIndex) : null;
}
