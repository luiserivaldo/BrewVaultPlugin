/**
 * Append plugin-rendered HTML without assigning to innerHTML. Raw Markdown HTML
 * is disabled by the renderer, so this only parses BrewVault's own serialized
 * output. DOMParser also keeps the parsing boundary explicit for review tools.
 */
export function appendRenderedHtml(container: HTMLElement, html: string): void {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	for (const child of Array.from(parsed.body.childNodes)) {
		container.appendChild(document.importNode(child, true));
	}
}
