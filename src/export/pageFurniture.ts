/**
 * Per-page decorations added around rendered content: the running footer and
 * the page number. Shared by the preview and standalone export so they match.
 */
export interface PageFurniture {
	readonly footer: string;
}

export const DEFAULT_PAGE_FURNITURE: PageFurniture = { footer: "" };

/** Footer text for a page, or null when no footer is shown. */
export function pageFooterText(furniture: PageFurniture): string | null {
	return furniture.footer ? furniture.footer : null;
}

