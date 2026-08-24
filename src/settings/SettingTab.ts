import { App, PluginSettingTab, Setting } from "obsidian";
import type BrewVaultPlugin from "../main";
import type { BrewTheme } from "./types";

export class BrewVaultSettingTab extends PluginSettingTab {
	plugin: BrewVaultPlugin;

	constructor(app: App, plugin: BrewVaultPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "BrewVault settings" });

		new Setting(containerEl)
			.setName("Theme")
			.setDesc("Visual style applied to the rendered pages.")
			.addDropdown((drop) =>
				drop
					.addOption("phb", "Player's Handbook (parchment)")
					.addOption("srd", "SRD / Unearthed Arcana")
					.addOption("blank", "Blank (plain paginated page)")
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						this.plugin.settings.theme = value as BrewTheme;
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					})
			);

		new Setting(containerEl)
			.setName("Page width (px)")
			.setDesc("Rendered page width. Default 816px approximates 8.5in at 96dpi.")
			.addText((text) =>
				text
					.setPlaceholder("816")
					.setValue(String(this.plugin.settings.pageWidthPx))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!Number.isNaN(parsed) && parsed > 0) {
							this.plugin.settings.pageWidthPx = parsed;
							await this.plugin.saveSettings();
							this.plugin.refreshAllViews();
						}
					})
			);

		new Setting(containerEl)
			.setName("Page height (px)")
			.setDesc("Rendered page height. Default 1056px approximates 11in at 96dpi.")
			.addText((text) =>
				text
					.setPlaceholder("1056")
					.setValue(String(this.plugin.settings.pageHeightPx))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!Number.isNaN(parsed) && parsed > 0) {
							this.plugin.settings.pageHeightPx = parsed;
							await this.plugin.saveSettings();
							this.plugin.refreshAllViews();
						}
					})
			);

		new Setting(containerEl)
			.setName("Re-render debounce (ms)")
			.setDesc("How long to wait after you stop typing before the preview updates.")
			.addText((text) =>
				text
					.setPlaceholder("250")
					.setValue(String(this.plugin.settings.debounceMs))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!Number.isNaN(parsed) && parsed >= 0) {
							this.plugin.settings.debounceMs = parsed;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
