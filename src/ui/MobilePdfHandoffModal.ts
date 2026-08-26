import { App, Modal, Notice } from "obsidian";
import {
	getMobilePdfHandoffNotice,
	shareHtmlArtifact,
} from "../mobile/shareHtmlArtifact";

/**
 * Requests the fresh user gesture required by Android's Web Share API after
 * rendering and vault persistence have completed.
 */
export class MobilePdfHandoffModal extends Modal {
	constructor(
		app: App,
		private readonly artifactPath: string,
		private readonly html: string,
		private readonly filename: string
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Mobile PDF export ready" });
		contentEl.createEl("p", {
			text: `Saved "${this.artifactPath}".`,
		});
		contentEl.createEl("p", {
			text: "Tap share HTML, choose a browser or file app, then use print → save as PDF. The saved HTML remains in your vault if sharing is cancelled or fails.",
		});

		const status = contentEl.createEl("p");
		const shareButton = contentEl.createEl("button", {
			text: "Share HTML…",
			cls: "mod-cta",
		});
		shareButton.addEventListener("click", () => {
			void this.shareArtifact(shareButton, status);
		});

		const closeButton = contentEl.createEl("button", { text: "Close" });
		closeButton.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async shareArtifact(
		shareButton: HTMLButtonElement,
		status: HTMLParagraphElement
	): Promise<void> {
		shareButton.disabled = true;
		status.setText("Opening share sheet…");
		const outcome = await shareHtmlArtifact(this.html, this.filename);
		const notice = getMobilePdfHandoffNotice(this.artifactPath, outcome);

		if (outcome.kind === "failed") {
			console.warn("BrewVault mobile HTML handoff failed", outcome.reason);
		}

		new Notice(notice);
		if (outcome.kind === "shared") {
			this.close();
			return;
		}

		status.setText(notice);
		shareButton.disabled = false;
	}
}
