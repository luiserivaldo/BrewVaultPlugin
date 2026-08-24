import { Notice, normalizePath, Plugin, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import {
	BrewVaultSettings,
	BrewTheme,
	DEFAULT_SETTINGS,
	normalizeStoredSettings,
} from "./settings/types";
import { BrewVaultSettingTab } from "./settings/SettingTab";
import { HomebreweryView, HOMEBREWERY_VIEW_TYPE } from "./view/HomebreweryView";
import { renderBrewMarkdown } from "./renderer";
import { paginateBrewPages } from "./renderer/paginateDom";
import { buildStandaloneHtml } from "./export/buildStandaloneHtml";
import { allocateExportPath } from "./export/allocateExportPath";
import { BUNDLED_THEME_CSS } from "./generated/themeCss";
import { ElectronPdfExporter } from "./electron/ElectronPdfExporter";

export default class BrewVaultPlugin extends Plugin {
	settings: BrewVaultSettings = DEFAULT_SETTINGS;
	private readonly pdfExporter = new ElectronPdfExporter();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(HOMEBREWERY_VIEW_TYPE, (leaf) => new HomebreweryView(leaf, this));

		this.addRibbonIcon("scroll", "Open Homebrewery Preview", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-homebrewery-preview",
			name: "Open Homebrewery Preview",
			callback: () => {
				this.activateView();
			},
		});

		this.addSettingTab(new BrewVaultSettingTab(this.app, this));

		// --- Milestone 4: export ---
		this.addCommand({
			id: "export-current-file-as-html",
			name: "Export current file as HTML",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = !!file && file.extension === "md";
				if (canRun && !checking) {
					this.exportFileAsHtml(file as TFile);
				}
				return canRun;
			},
		});

		// Default PDF export uses the theme selected in BrewVault settings.
		this.addPdfExportCommand(
			"export-current-file-as-pdf",
			"Export current file as Homebrewery PDF"
		);

		// Curated theme-specific commands are intentionally limited to the three
		// baseline styles. Besides being convenient in the command palette, the
		// stable command IDs are suitable for Obsidian CLI invocation.
		this.addPdfExportCommand(
			"export-current-file-as-pdf-phb",
			"Export current file as Homebrewery PDF in PHB style",
			"phb"
		);
		this.addPdfExportCommand(
			"export-current-file-as-pdf-srd",
			"Export current file as Homebrewery PDF in SRD style",
			"srd"
		);
		this.addPdfExportCommand(
			"export-current-file-as-pdf-blank",
			"Export current file as Homebrewery PDF in Blank style",
			"blank"
		);
	}

	private addPdfExportCommand(id: string, name: string, theme?: BrewTheme): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = !!file && file.extension === "md";
				if (canRun && !checking) {
					void this.exportFileAsPdf(file as TFile, theme);
				}
				return canRun;
			},
		});
	}

	/**
	 * Renders `file` the same way the live preview does, then writes a
	 * self-contained HTML file (theme CSS inlined) into the configured vault
	 * export folder, named "<note-name>.brew.html". See ARCHITECTURE.md §8/§9.1.
	 */
	async exportFileAsHtml(file: TFile): Promise<void> {
		try {
			const source = await this.app.vault.cachedRead(file);
			const renderedPages = renderBrewMarkdown(source);
			const pages = await paginateBrewPages(renderedPages, {
				theme: this.settings.theme,
				pageWidthPx: this.settings.pageWidthPx,
				pageHeightPx: this.settings.pageHeightPx,
			});

			const html = buildStandaloneHtml(
				pages,
				this.settings.theme,
				BUNDLED_THEME_CSS,
				file.basename,
				this.settings.pageWidthPx,
				this.settings.pageHeightPx
			);

			const exportFolder = await this.ensureExportFolder();
			const outPath = this.allocateExportPath(exportFolder, file.basename, ".brew.html");
			await this.app.vault.create(outPath, html);

			new Notice(
				`Exported "${outPath}". Open it in a browser and use Print → Save as PDF.`
			);
		} catch (err) {
			console.error("BrewVault export failed", err);
			new Notice("BrewVault export failed — see console for details.");
		}
	}

	/** Generate a PDF with Obsidian's bundled Chromium and write it directly. */
	async exportFileAsPdf(file: TFile, themeOverride?: BrewTheme): Promise<void> {
		try {
			const theme = themeOverride ?? this.settings.theme;
			const exportFolder = await this.ensureExportFolder();
			const source = await this.app.vault.cachedRead(file);
			const renderedPages = renderBrewMarkdown(source);
			const pages = await paginateBrewPages(renderedPages, {
				theme,
				pageWidthPx: this.settings.pageWidthPx,
				pageHeightPx: this.settings.pageHeightPx,
			});

			const html = buildStandaloneHtml(
				pages,
				theme,
				BUNDLED_THEME_CSS,
				file.basename,
				this.settings.pageWidthPx,
				this.settings.pageHeightPx
			);

			const pdf = await this.pdfExporter.renderHtmlToPdf(html);
			const outPath = this.allocateExportPath(exportFolder, file.basename, ".pdf");
			await this.app.vault.createBinary(outPath, pdf);

			new Notice(`Exported to ${outPath}`);
		} catch (err) {
			console.error("BrewVault PDF export failed", err);
			new Notice("BrewVault PDF export failed — see console for details.");
		}
	}

	onunload(): void {
		this.pdfExporter.dispose();
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Record<string, unknown> | null;
		const normalized = normalizeStoredSettings(stored);
		this.settings = normalized.settings;

		// Persist normalized defaults on first install (and repair invalid legacy
		// data) so preview rendering never receives an undefined/unknown theme.
		if (normalized.shouldPersist) {
			await this.saveData(this.settings);
		}
	}

	private async ensureExportFolder(): Promise<string> {
		const configured = this.settings.exportFolder.trim() || DEFAULT_SETTINGS.exportFolder;
		const normalized = normalizePath(configured)
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");

		if (!normalized || normalized === "." || normalized.startsWith("../")) {
			throw new Error("BrewVault export folder must be a vault-relative folder path.");
		}

		let current = "";
		for (const segment of normalized.split("/").filter(Boolean)) {
			current = current ? `${current}/${segment}` : segment;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				await this.app.vault.createFolder(current);
			} else if (!(existing instanceof TFolder)) {
				throw new Error(`BrewVault export path is not a folder: ${current}`);
			}
		}

		if (this.settings.exportFolder !== normalized) {
			this.settings.exportFolder = normalized;
			await this.saveSettings();
		}

		return normalized;
	}

	private allocateExportPath(folder: string, basename: string, suffix: string): string {
		return allocateExportPath(
			folder,
			basename,
			suffix,
			(path) => this.app.vault.getAbstractFileByPath(path) !== null
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Re-render every open Homebrewery preview leaf (e.g. after a settings change). */
	refreshAllViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HOMEBREWERY_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof HomebreweryView) {
				view.renderNow();
			}
		}
	}

	/** Opens (or reveals) the Homebrewery Preview view in a new right-hand leaf. */
	async activateView(): Promise<HomebreweryView> {
		const existing = this.app.workspace.getLeavesOfType(HOMEBREWERY_VIEW_TYPE);
		let leaf: WorkspaceLeaf;

		if (existing.length > 0) {
			leaf = existing[0];
		} else {
			leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
			await leaf.setViewState({ type: HOMEBREWERY_VIEW_TYPE, active: true });
		}

		this.app.workspace.revealLeaf(leaf);
		return leaf.view as HomebreweryView;
	}
}
