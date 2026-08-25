export type PreviewOrientation = "portrait" | "landscape";

export interface PreviewViewportLayout {
	readonly orientation: PreviewOrientation;
	readonly scale: number;
	readonly scaledPageWidthPx: number;
	readonly scaledPageHeightPx: number;
	readonly inlineOffsetPx: number;
	readonly blockOffsetPx: number;
}

/**
 * Calculate the visual presentation of one fixed-size page inside a preview.
 * The page's actual width and height are never changed: callers apply `scale`
 * as a transform and use the negative offsets to collapse only its layout box.
 */
export function calculatePreviewViewportLayout(
	availableWidthPx: number,
	availableHeightPx: number,
	pageWidthPx: number,
	pageHeightPx: number
): PreviewViewportLayout {
	assertPositiveDimension(pageWidthPx, "page width");
	assertPositiveDimension(pageHeightPx, "page height");

	const safeWidth = normalizeAvailableDimension(availableWidthPx, pageWidthPx);
	const safeHeight = normalizeAvailableDimension(availableHeightPx, pageHeightPx);
	const scale = Math.min(1, safeWidth / pageWidthPx);
	const scaledPageWidthPx = pageWidthPx * scale;
	const scaledPageHeightPx = pageHeightPx * scale;

	return {
		orientation: safeWidth > safeHeight ? "landscape" : "portrait",
		scale,
		scaledPageWidthPx,
		scaledPageHeightPx,
		inlineOffsetPx: (scaledPageWidthPx - pageWidthPx) / 2,
		blockOffsetPx: scaledPageHeightPx - pageHeightPx,
	};
}

function assertPositiveDimension(value: number, label: string): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`BrewVault ${label} must be a positive finite number.`);
	}
}

function normalizeAvailableDimension(value: number, fallback: number): number {
	return Number.isFinite(value) && value > 0 ? value : fallback;
}
