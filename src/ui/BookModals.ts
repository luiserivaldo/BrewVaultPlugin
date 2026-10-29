import { App, FuzzySuggestModal, Modal, TFolder } from "obsidian";
import type { BookPlan } from "../book/plan";

/** Read-only dry run: which notes a `{{bookContent}}` block adds, in order. */
export class BookContentsModal extends Modal {
	constructor(
		app: App,
		private readonly noteName: string,
		private readonly plan: BookPlan
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, plan } = this;
		contentEl.empty();
		contentEl.addClass("brewvault-book-contents");
		contentEl.createEl("h2", { text: `Included notes: ${this.noteName}` });
		contentEl.createEl("p", {
			cls: "setting-item-description",
			text: `${plan.memberCount} ${plan.memberCount === 1 ? "note" : "notes"}, compiled in this order after the text around them.`,
		});

		const warnings = plan.diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
		if (warnings.length > 0) {
			contentEl.createEl("h3", { text: "Problems" });
			const list = contentEl.createEl("ul");
			for (const warning of warnings) list.createEl("li", { text: warning.message });
		}

		contentEl.createEl("h3", { text: "Order" });
		const order = contentEl.createEl("ol");
		for (const segment of plan.segments) {
			if (segment.kind !== "member") continue;
			const item = order.createEl("li", { text: segment.note.name });
			item.createSpan({
				cls: "brewvault-book-contents-source",
				text: segment.includeLine === null ? " · linked" : ` · include on line ${segment.includeLine}`,
			});
		}

		const notes = plan.diagnostics.filter((diagnostic) => diagnostic.severity === "info");
		if (notes.length > 0) {
			contentEl.createEl("h3", { text: "Ignored note properties" });
			const list = contentEl.createEl("ul");
			for (const note of notes) list.createEl("li", { text: note.message });
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** Picks a vault folder from the command palette. */
export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	constructor(
		app: App,
		private readonly onChoose: (folder: TFolder) => void
	) {
		super(app);
		this.setPlaceholder("Include notes from folder…");
	}

	getItems(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder && !file.isRoot())
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder): void {
		this.onChoose(folder);
	}
}
