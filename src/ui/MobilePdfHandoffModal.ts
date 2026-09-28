import { App, Modal, Notice } from "obsidian";
import {
	closeThenOpenHtmlArtifact,
	getSavedHtmlArtifactMessage,
	MOBILE_PDF_BROWSER_INSTRUCTION,
	MOBILE_PDF_DIALOG_TITLE,
	MOBILE_PDF_OPEN_BUTTON_LABEL,
} from "../mobile/openHtmlArtifact";

/**
 * Opens the preserved mobile HTML artifact in Android's default browser/app.
 */
export class MobilePdfHandoffModal extends Modal {
	constructor(
		app: App,
		private readonly artifactPath: string
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: MOBILE_PDF_DIALOG_TITLE });
		contentEl.createEl("p", {
			text: getSavedHtmlArtifactMessage(this.artifactPath),
		});
		contentEl.createEl("p", {
			text: MOBILE_PDF_BROWSER_INSTRUCTION,
		});

		const actions = contentEl.createDiv({
			cls: "brewvault-mobile-pdf-actions",
		});
		const openButton = actions.createEl("button", {
			text: MOBILE_PDF_OPEN_BUTTON_LABEL,
			cls: "mod-cta",
		});
		openButton.addEventListener("click", () => {
			void this.openArtifact();
		});

		const closeButton = actions.createEl("button", { text: "Close" });
		closeButton.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async openArtifact(): Promise<void> {
		const outcome = await closeThenOpenHtmlArtifact(
			this.app,
			this.artifactPath,
			() => this.close()
		);

		if (outcome.kind === "opened") {
			return;
		}

		console.warn("BrewVault could not open the mobile HTML artifact", outcome.reason);
		new Notice("Could not open the saved HTML file in a browser.");
	}
}
