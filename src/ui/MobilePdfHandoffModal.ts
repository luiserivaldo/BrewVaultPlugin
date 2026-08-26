import { App, Modal, Notice } from "obsidian";
import {
	getSavedHtmlArtifactMessage,
	MOBILE_PDF_BROWSER_INSTRUCTION,
	MOBILE_PDF_OPEN_BUTTON_LABEL,
	openHtmlArtifact,
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
		contentEl.createEl("h2", { text: "Mobile PDF export ready" });
		contentEl.createEl("p", {
			text: getSavedHtmlArtifactMessage(this.artifactPath),
		});
		contentEl.createEl("p", {
			text: MOBILE_PDF_BROWSER_INSTRUCTION,
		});

		const openButton = contentEl.createEl("button", {
			text: MOBILE_PDF_OPEN_BUTTON_LABEL,
			cls: "mod-cta",
		});
		openButton.addEventListener("click", () => {
			void this.openArtifact(openButton);
		});

		const closeButton = contentEl.createEl("button", { text: "Close" });
		closeButton.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async openArtifact(openButton: HTMLButtonElement): Promise<void> {
		openButton.disabled = true;
		const outcome = await openHtmlArtifact(this.app, this.artifactPath);

		if (outcome.kind === "opened") {
			this.close();
			return;
		}

		console.warn("BrewVault could not open the mobile HTML artifact", outcome.reason);
		new Notice("Could not open the saved HTML file in a browser.");
		openButton.disabled = false;
	}
}
