import type { BrewPage } from "../renderer/types";
import type { BrewTheme } from "../settings/types";
import { getThemeClassNames } from "../themes/registry";
import {
	DEFAULT_PAGE_FURNITURE,
	PAGE_FOOTER_CLASS,
	pageFooterText,
	pageNumberText,
	type PageFurniture,
} from "./pageFurniture";

/**
 * Wraps already-rendered pages into a complete, self-contained HTML
 * document: the plugin's theme CSS is inlined (no external <link>), so the
 * file opens correctly no matter where it's later moved. This is the
 * hand-off artifact for "print to PDF" from a regular browser — a
 * `@media print` block is added so each `.brewPage` prints on its own
 * sheet instead of being cut off mid-page.
 */
export function buildStandaloneHtml(
	pages: BrewPage[],
	theme: BrewTheme,
	themeCss: string,
	title: string,
	pageWidthPx: number,
	pageHeightPx: number,
	furniture: PageFurniture = DEFAULT_PAGE_FURNITURE
): string {
	const themeClassNames = getThemeClassNames(theme).join(" ");
	const footer = pageFooterText(furniture);
	const footerHtml = footer ? `\n\t\t<div class="${PAGE_FOOTER_CLASS}">${escapeHtml(footer)}</div>` : "";
	const pagesHtml = pages
		.map(
			(page) => `
	<div class="page brewPage">
		${ensureColumnWrapper(page.html)}${footerHtml}${pageNumberHtml(page.index, furniture)}
	</div>`
		)
		.join("\n");

	const PRINT_CONTROL_SCRIPT =
		'document.querySelector("[data-brewvault-print]").addEventListener("click",()=>window.print());';
	const PRINT_CONTROL_SCRIPT_SHA256 =
		"sha256-vvRiW0cCBu7DM39Mp9A2V0XV9yDXvVHLnlmvhmPzKEk=";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src '${PRINT_CONTROL_SCRIPT_SHA256}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
<title>${escapeHtml(title)}</title>
<style>
:root {
	--brew-page-width: ${pageWidthPx}px;
	--brew-page-height: ${pageHeightPx}px;
}

body {
	margin: 0;
	background: #444;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 24px;
	padding: 24px;
	font-family: sans-serif;
}

.brewvault-export-controls {
	box-sizing: border-box;
	width: min(100%, var(--brew-page-width));
	padding: 16px;
	border: 1px solid #777;
	border-radius: 8px;
	background: #f5f5f5;
	color: #1f1f1f;
	font: 16px/1.4 sans-serif;
}

.brewvault-export-controls strong,
.brewvault-export-controls span {
	display: block;
}

.brewvault-export-controls button {
	width: 100%;
	min-height: 48px;
	margin: 12px 0;
	border: 0;
	border-radius: 6px;
	background: #6c31e3;
	color: #fff;
	font: 700 16px/1.2 sans-serif;
	cursor: pointer;
}
${themeCss}
/* The bundled stylesheet gives .brewvault-pages a default Letter size, which
   would override :root. Set the export size on the container itself, after
   the theme CSS, so every page matches the printed sheet. */
.brewvault-pages {
	--brew-page-width: ${pageWidthPx}px;
	--brew-page-height: ${pageHeightPx}px;
}
/* .brewPage is one complete sheet. Its own padding is the document margin,
   so printer margins must remain zero or the browser scales and repaginates
   the fixed-size sheet. */
@page { size: ${pageWidthPx}px ${pageHeightPx}px; margin: 0; }
@media print {
	html, body { width: ${pageWidthPx}px; margin: 0; padding: 0; }
	body { display: block; background: none; padding: 0; gap: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.brewvault-export-controls { display: none !important; }
	.brewvault-pages { display: block; }
	.brewPage {
		box-shadow: none;
		margin: 0;
		/* The wrapper holds the two fixed columns. Do not balance them: that
		   leaves intentionally empty space and diverges from preview. */
		column-count: initial;
		column-width: auto;
		break-inside: avoid;
		page-break-inside: avoid;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.brewPage .columnWrapper {
		height: 100%;
		max-height: 100%;
		column-count: 2;
		column-width: 8cm;
		column-gap: .9cm;
		column-fill: auto;
	}
	.brewvault-theme-phb .page .columnWrapper {
		height: calc(100% - .3cm);
		max-height: calc(100% - .3cm);
	}
	.brewvault-pages > .brewPage:not(:last-child) {
		break-after: page;
		page-break-after: always;
	}
	.brewvault-pages > .brewPage:last-child {
		break-after: auto;
		page-break-after: auto;
	}
}
</style>
</head>
<body class="${themeClassNames}">
<aside class="brewvault-export-controls" aria-label="PDF export controls">
	<strong>BrewVault PDF export</strong>
	<button type="button" data-brewvault-print aria-describedby="brewvault-print-help">Print / Save as PDF</button>
	<span id="brewvault-print-help">Use this button to open the print dialog.</span>
</aside>
<div class="brewvault-pages ${themeClassNames}">
${pagesHtml}
</div>
<script>${PRINT_CONTROL_SCRIPT}</script>
</body>
</html>
`;
}

/** Export callers normally provide paginated pages, but this keeps the public
 * serializer's DOM contract deterministic for tests and alternate callers. */
function ensureColumnWrapper(html: string): string {
	return /^\s*<div class="columnWrapper">/.test(html)
		? html
		: `<div class="columnWrapper">${html}</div>`;
}

function pageNumberHtml(pageIndex: number, furniture: PageFurniture): string {
	const text = pageNumberText(pageIndex, furniture);
	return text === null
		? ""
		: `\n\t\t<div class="pageNumber brewPageNumber">${escapeHtml(text)}</div>`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
