import type { BrewPage } from "../renderer/types";
import type { BrewTheme } from "../settings/types";
import { getThemeClassNames } from "../themes/registry";

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
	pageHeightPx: number
): string {
	const themeClassNames = getThemeClassNames(theme).join(" ");
	const pagesHtml = pages
		.map(
			(page) => `
	<div class="page brewPage">
		${ensureColumnWrapper(page.html)}
		<div class="pageNumber brewPageNumber">${page.index}</div>
	</div>`
		)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
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
${themeCss}
@page { size: Letter portrait; margin: 0; }
@media print {
	html, body { width: 8.5in; margin: 0; padding: 0; }
	body { background: none; padding: 0; gap: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.brewPage {
		box-shadow: none;
		margin: 0;
		break-after: page;
		page-break-after: always;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
}
</style>
</head>
<body class="${themeClassNames}">
<div class="brewvault-pages ${themeClassNames}">
${pagesHtml}
</div>
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

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
