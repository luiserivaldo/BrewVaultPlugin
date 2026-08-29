import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { DropdownComponent } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type BrewVaultPlugin from "../main";
import { DEFAULT_SETTINGS, type BrewTheme } from "./types";

export class BrewVaultSettingTab extends PluginSettingTab {
	plugin: BrewVaultPlugin;
	private themeDropdowns: DropdownComponent[] = [];

	constructor(app: App, plugin: BrewVaultPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Obsidian 1.13+ uses these definitions for rendering and settings search. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Choose theme",
				desc: "Visual style applied to the rendered pages.",
				render: (setting) => {
					this.addThemeControl(setting);
				},
			},
			{
				name: "Submit custom stylesheet",
				desc: `Choose a local .css file. Add /* @brewvault-theme: Display name */ to set its name; otherwise BrewVault assigns Custom_Style_N.`,
				render: (setting) => {
					this.addCustomCssControl(setting);
				},
			},
			...this.plugin.settings.customStyles.map((style) => ({
				name: style.name,
				desc: "User-submitted custom style.",
				render: (setting: Setting) => {
					this.addCustomStyleManagementControl(setting, style.id);
				},
			})),
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
			.setName("Choose theme")
			.setDesc("Visual style applied to the rendered pages."));

		this.addCustomCssControl(new Setting(containerEl)
			.setName("Submit custom stylesheet")
			.setDesc(
				"Choose a local .css file. Add /* @brewvault-theme: Display name */ to set its name; otherwise BrewVault assigns Custom_Style_N."
			));

		for (const style of this.plugin.settings.customStyles) {
			this.addCustomStyleManagementControl(
				new Setting(containerEl)
					.setName(style.name)
					.setDesc("User-submitted custom style."),
				style.id
			);
		}

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
		setting.addDropdown((drop) => {
			this.themeDropdowns.push(drop);
			drop
				.addOption("phb", "Player's Handbook (parchment)")
				.addOption("dmg", "Dungeon master's guide")
				.addOption("srd", "SRD / Unearthed Arcana")
				.addOption("blank", "Blank (plain paginated page)");
			for (const style of this.plugin.settings.customStyles) {
				drop.addOption(style.id, style.name);
			}
			drop
				.setValue(this.plugin.settings.theme)
				.onChange(async (value) => {
					this.plugin.settings.theme = value as BrewTheme;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				});
		});
	}

	private addCustomCssControl(setting: Setting): void {
		const input = setting.controlEl.createEl("input", {
			attr: {
				type: "file",
				accept: ".css,text/css",
				"aria-label": "Submit a custom stylesheet",
			},
		});
		input.addEventListener("change", () => {
			void this.submitCustomCssFile(input);
		});
	}

	private async submitCustomCssFile(input: HTMLInputElement): Promise<void> {
		const file = input.files?.[0];
		if (!file) return;
		try {
			if (!file.name.toLocaleLowerCase().endsWith(".css")) {
				throw new Error("Choose a file with the .css extension.");
			}
			const style = await this.plugin.submitCustomStyle(await file.text());
			this.addCustomStyleToOpenDropdowns(style.id, style.name);
			new Notice(`Added custom style "${style.name}".`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to add custom CSS.";
			new Notice(`BrewVault rejected the custom CSS: ${message}`);
		} finally {
			input.value = "";
		}
	}

	private addCustomStyleManagementControl(setting: Setting, styleId: BrewTheme): void {
		setting.addButton((button) =>
			button
				.setButtonText("Remove")
				.onClick(async () => {
					await this.plugin.removeCustomStyle(styleId);
					this.removeCustomStyleFromOpenDropdowns(styleId);
					setting.settingEl.remove();
					new Notice("Custom style removed.");
				})
		);
	}

	private addCustomStyleToOpenDropdowns(styleId: string, name: string): void {
		this.themeDropdowns = this.themeDropdowns.filter((drop) => drop.selectEl.isConnected);
		for (const drop of this.themeDropdowns) drop.addOption(styleId, name);
	}

	private removeCustomStyleFromOpenDropdowns(styleId: string): void {
		this.themeDropdowns = this.themeDropdowns.filter((drop) => drop.selectEl.isConnected);
		for (const drop of this.themeDropdowns) {
			drop.selectEl.querySelector(`option[value="${styleId}"]`)?.remove();
			drop.setValue(this.plugin.settings.theme);
		}
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
