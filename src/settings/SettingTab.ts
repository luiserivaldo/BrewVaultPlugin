import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type BrewVaultPlugin from "../main";
import { DEFAULT_SETTINGS, type BrewTheme } from "./types";

export class BrewVaultSettingTab extends PluginSettingTab {
	plugin: BrewVaultPlugin;

	constructor(app: App, plugin: BrewVaultPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Obsidian 1.13+ uses these definitions for rendering and settings search. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Theme",
				desc: "Visual style applied to the rendered pages.",
				render: (setting) => {
					this.addThemeControl(setting);
				},
			},
			{
				name: "Export folder",
				desc: "Vault-relative folder for BrewVault exports. It is created automatically when needed.",
				render: (setting) => {
					this.addExportFolderControl(setting);
				},
			},
			{
				name: "Page width (px)",
				desc: "Rendered page width. Default 816px approximates 8.5in at 96dpi.",
				render: (setting) => {
					this.addPageWidthControl(setting);
				},
			},
			{
				name: "Page height (px)",
				desc: "Rendered page height. Default 1056px approximates 11in at 96dpi.",
				render: (setting) => {
					this.addPageHeightControl(setting);
				},
			},
			{
				name: "Re-render debounce (ms)",
				desc: "How long to wait after you stop typing before the preview updates.",
				render: (setting) => {
					this.addDebounceControl(setting);
				},
			},
		];
	}

	/** Obsidian versions before 1.13 use this imperative fallback. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addThemeControl(new Setting(containerEl)
			.setName("Theme")
			.setDesc("Visual style applied to the rendered pages."));

		this.addExportFolderControl(new Setting(containerEl)
			.setName("Export folder")
			.setDesc("Vault-relative folder for BrewVault exports. It is created automatically when needed."));

		this.addPageWidthControl(new Setting(containerEl)
			.setName("Page width (px)")
			.setDesc("Rendered page width. Default 816px approximates 8.5in at 96dpi."));

		this.addPageHeightControl(new Setting(containerEl)
			.setName("Page height (px)")
			.setDesc("Rendered page height. Default 1056px approximates 11in at 96dpi."));

		this.addDebounceControl(new Setting(containerEl)
			.setName("Re-render debounce (ms)")
			.setDesc("How long to wait after you stop typing before the preview updates."));
	}

	private addThemeControl(setting: Setting): void {
		setting.addDropdown((drop) =>
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
	}

	private addExportFolderControl(setting: Setting): void {
		setting.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.exportFolder)
				.setValue(this.plugin.settings.exportFolder)
				.onChange(async (value) => {
					this.plugin.settings.exportFolder =
						value.trim() || DEFAULT_SETTINGS.exportFolder;
					await this.plugin.saveSettings();
				})
		);
	}

	private addPageWidthControl(setting: Setting): void {
		setting.addText((text) =>
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
	}

	private addPageHeightControl(setting: Setting): void {
		setting.addText((text) =>
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
	}

	private addDebounceControl(setting: Setting): void {
		setting.addText((text) =>
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
