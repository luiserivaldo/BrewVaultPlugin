import type { BrewPage } from "../renderer/types";
import type { BrewTheme } from "../settings/types";

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
	const pagesHtml = pages
		.map(
			(page) => `
	<div class="brewPage">
		${page.html}
		<div class="brewPageNumber">${page.index}</div>
	</div>`
		)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
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
@media print {
	body { background: none; padding: 0; gap: 0; }
	.brewPage {
		box-shadow: none;
		page-break-after: always;
		margin: 0;
	}
}
</style>
</head>
<body class="brewvault-theme-${theme}">
<div class="brewvault-pages brewvault-theme-${theme}">
${pagesHtml}
</div>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
