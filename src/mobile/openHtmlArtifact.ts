import type { App } from "obsidian";

export type OpenHtmlArtifactOutcome =
	| { readonly kind: "opened" }
	| { readonly kind: "unavailable"; readonly reason: string }
	| { readonly kind: "failed"; readonly reason: string };

export interface DefaultAppOpener {
	openWithDefaultApp?(vaultPath: string): void | Promise<void>;
}

export const MOBILE_PDF_BROWSER_INSTRUCTION =
	'Click "Open in Browser", then Print -> Save as PDF.';
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

/** Unmount plugin UI before Android creates or launches its native resolver. */
export async function closeThenOpenHtmlArtifact(
	app: App,
	artifactPath: string,
	closeDialog: () => void,
	opener: DefaultAppOpener = app as unknown as DefaultAppOpener
): Promise<OpenHtmlArtifactOutcome> {
	closeDialog();
	return openHtmlArtifact(app, artifactPath, opener);
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
