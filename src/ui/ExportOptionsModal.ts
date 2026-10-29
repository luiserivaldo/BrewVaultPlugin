import { App, Modal } from "obsidian";
import type { ExportOptionRow } from "../exportOptions/describe";
import type { InvalidNoteProperty } from "../exportOptions/noteProperties";

export interface ExportOptionsReport {
	readonly noteName: string;
	readonly rows: readonly ExportOptionRow[];
	readonly edition: { readonly value: string; readonly source: string };
	readonly invalid: readonly InvalidNoteProperty[];
}

/** Read-only table explaining how the active note will export, and why. */
export class ExportOptionsModal extends Modal {
	constructor(
		app: App,
		private readonly report: ExportOptionsReport
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, report } = this;
		contentEl.empty();
		contentEl.addClass("brewvault-export-options");
		contentEl.createEl("h2", { text: `Export options: ${report.noteName}` });

		const table = contentEl.createEl("table");
		const head = table.createEl("thead").createEl("tr");
		for (const heading of ["Option", "Value", "From"]) head.createEl("th", { text: heading });

		const body = table.createEl("tbody");
		for (const row of report.rows) addRow(body, row.label, row.value, row.source);
		addRow(body, "Insert block edition", report.edition.value, report.edition.source);

		if (report.invalid.length > 0) {
			contentEl.createEl("h3", { text: "Ignored properties" });
			const list = contentEl.createEl("ul");
			for (const { property, value } of report.invalid) {
				list.createEl("li", { text: `${property}: "${value}" is not a valid value.` });
			}
		}

		contentEl.createEl("p", {
			cls: "setting-item-description",
			text: "Theme-specific export commands override the theme shown here.",
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function addRow(body: HTMLElement, label: string, value: string, source: string): void {
	const row = body.createEl("tr");
	row.createEl("td", { text: label });
	row.createEl("td", { text: value });
	row.createEl("td", { text: source });
}
