import type { App } from "obsidian";

export type OpenHtmlArtifactOutcome =
	| { readonly kind: "opened" }
	| { readonly kind: "unavailable"; readonly reason: string }
	| { readonly kind: "failed"; readonly reason: string };

export interface DefaultAppOpener {
	openWithDefaultApp?(vaultPath: string): void | Promise<void>;
}

export const MOBILE_PDF_BROWSER_INSTRUCTION =
	'Choose Chrome or Brave, then tap "Print / Save as PDF" in the document. Chrome fallback: menu -> Share -> swipe to Print -> Save as PDF.';
export const MOBILE_PDF_PICKER_NOTICE =
	"Android controls the app list, spacing, and layout; BrewVault cannot filter it.";
export const MOBILE_PDF_OPEN_BUTTON_LABEL = "Open in Browser";
export const MOBILE_PDF_DIALOG_TITLE = "Export to PDF export ready";

export function getSavedHtmlArtifactMessage(artifactPath: string): string {
	return `Saved file as "${artifactPath}".`;
}

/**
 * Open a vault-local HTML file through Obsidian's optional default-app bridge.
 * The capability is isolated and feature-detected because it is not part of
 * the public App type surface.
 */
export async function openHtmlArtifact(
	app: App,
	artifactPath: string,
	opener: DefaultAppOpener = app as unknown as DefaultAppOpener
): Promise<OpenHtmlArtifactOutcome> {
	if (typeof opener.openWithDefaultApp !== "function") {
		return {
			kind: "unavailable",
			reason: "Obsidian does not provide a default-app opener.",
		};
	}

	try {
		await opener.openWithDefaultApp.call(app, artifactPath);
		return { kind: "opened" };
	} catch (error) {
		return { kind: "failed", reason: getErrorMessage(error) };
	}
}

/**
 * Open a standalone HTML string for printing/sharing on mobile.
 * Uses navigator.share with a file blob when available, falls back to window.print().
 * This avoids the wide-gap Android chooser that openWithDefaultApp triggers.
 */
export async function printHtmlArtifact(
	html: string,
	filename: string
): Promise<{ kind: "shared" } | { kind: "printed" } | { kind: "unavailable"; reason: string }> {
	// Check for actual browser environment with required APIs
	const hasNavigatorShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
	const hasWindowOpen = typeof window !== "undefined" && typeof window.open === "function";
	if (!hasNavigatorShare && !hasWindowOpen) {
		return { kind: "unavailable", reason: "Not running in a browser environment." };
	}

	const blob = new Blob([html], { type: "text/html" });
	const file = new File([blob], filename, { type: "text/html" });

	// Try Web Share API Level 2 with file support
	if (hasNavigatorShare && navigator.canShare && navigator.canShare({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title: filename });
			return { kind: "shared" };
		} catch {
			// Share cancelled or failed — fall through to print fallback
		}
	}

	// Fallback: open in new tab and trigger print
	if (hasWindowOpen) {
		try {
			const url = URL.createObjectURL(blob);
			const win = window.open(url, "_blank", "noopener,noreferrer");
			if (win) {
				win.addEventListener("load", () => {
					win.focus();
					win.print();
					// Clean up object URL after a short delay to allow print dialog to capture content
					window.setTimeout(() => URL.revokeObjectURL(url), 5000);
				});
				return { kind: "printed" };
			}
			return { kind: "unavailable", reason: "Popup blocked or window.open failed." };
		} catch (e) {
			return { kind: "unavailable", reason: getErrorMessage(e) };
		}
	}

	return { kind: "unavailable", reason: "No print or share capability available." };
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
