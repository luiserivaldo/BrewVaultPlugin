import type { ExportBackend } from "../platform/types";

export const MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE =
	"Direct PDF export is not available on mobile yet. Export the file as HTML, open it in a browser, then use Print → Save as PDF.";

const DIRECT_PDF_UNAVAILABLE_NOTICE =
	"Direct PDF export is not available on this platform.";

/** Return user-facing guidance before starting an unsupported direct PDF job. */
export function getDirectPdfUnavailableNotice(
	backend: Pick<ExportBackend, "platform" | "supportsDirectPdf">
): string | null {
	if (backend.supportsDirectPdf) return null;
	return backend.platform === "mobile"
		? MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE
		: DIRECT_PDF_UNAVAILABLE_NOTICE;
}
