import {
	Notice,
	normalizePath,
	Platform,
	Plugin,
	TFile,
	TFolder,
	WorkspaceLeaf,
} from "obsidian";
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
import { BUNDLED_THEME_CSS as UNCHECKED_THEME_CSS } from "virtual:brewvault-theme-css";
import { homebreweryTagPreviewExtension } from "./editor/homebreweryTagPreview";
import { detectPlatform } from "./platform/detectPlatform";
import { createBackendProvider } from "./platform/createBackendProvider";
import type { ExportBackendProvider } from "./platform/ExportBackendProvider";
import { MobilePdfHandoffModal } from "./ui/MobilePdfHandoffModal";
import { resolveVaultImageEmbeds } from "./obsidian/resolveVaultImageEmbeds";
import type { BrewPage } from "./renderer/types";
import {
	createCustomStyleSubmission,
	findCustomStyle,
	type CustomStyleDefinition,
} from "./themes/customStyles";

// The community reviewer analyzes source without running BrewVault's esbuild
// virtual-module loader. Narrow through `unknown` so both that environment and
// the production bundle have a verified string at every renderer call site.
const uncheckedThemeCss: unknown = UNCHECKED_THEME_CSS;
if (typeof uncheckedThemeCss !== "string") {
	throw new TypeError("BrewVault's bundled theme CSS is not a string.");
}
const BUNDLED_THEME_CSS: string = uncheckedThemeCss;

export default class BrewVaultPlugin extends Plugin {
	settings: BrewVaultSettings = DEFAULT_SETTINGS;
	private exportBackendProvider: ExportBackendProvider | null = null;
	private customStyleSheet: CSSStyleSheet | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.installCustomStyleSheet();
		this.exportBackendProvider = createBackendProvider(detectPlatform(Platform));
		this.registerEditorExtension(homebreweryTagPreviewExtension);

		this.registerView(HOMEBREWERY_VIEW_TYPE, (leaf) => new HomebreweryView(leaf, this));

		this.addRibbonIcon("scroll", "Open preview", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-homebrewery-preview",
			name: "Open preview",
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new BrewVaultSettingTab(this.app, this));

		// --- Milestone 4: export ---
		this.addCommand({
			id: "export-current-file-as-html",
			name: "Export current file as HTML",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = file instanceof TFile && file.extension === "md";
				if (canRun && !checking) {
					void this.exportFileAsHtml(file);
				}
				return canRun;
			},
		});

		// Default PDF export uses the theme selected in BrewVault settings.
		this.addPdfExportCommand(
			"export-current-file-as-pdf",
			"Export current file as BrewVault PDF"
		);

		// Curated theme-specific commands are intentionally limited to the three
		// baseline styles. Besides being convenient in the command palette, the
		// stable command IDs are suitable for Obsidian CLI invocation.
		this.addPdfExportCommand(
			"export-current-file-as-pdf-phb",
			"Export current file as BrewVault PDF in PHB style",
			"phb"
		);
		this.addPdfExportCommand(
			"export-current-file-as-pdf-srd",
			"Export current file as BrewVault PDF in SRD style",
			"srd"
		);
		this.addPdfExportCommand(
			"export-current-file-as-pdf-blank",
			"Export current file as BrewVault PDF in Blank style",
			"blank"
		);
	}

	private addPdfExportCommand(id: string, name: string, theme?: BrewTheme): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = file instanceof TFile && file.extension === "md";
				if (canRun && !checking) {
					void this.exportFileAsPdf(file, theme);
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
			const resolvedImages = await resolveVaultImageEmbeds(
				source,
				file,
				this.app.vault,
				this.app.metadataCache
			);
			const renderedPages = renderBrewMarkdown(source, {
				imageEmbeds: resolvedImages.imageEmbeds,
			});
			const pages = await this.paginateWithTheme(renderedPages, this.settings.theme);

			const html = buildStandaloneHtml(
				pages,
				this.settings.theme,
				this.getThemeCss(this.settings.theme),
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

	/** Export directly on desktop or preserve and hand off HTML on mobile. */
	async exportFileAsPdf(file: TFile, themeOverride?: BrewTheme): Promise<void> {
		try {
			const backend = await this.getExportBackendProvider().getBackend();
			const theme = themeOverride ?? this.settings.theme;
			const exportFolder = await this.ensureExportFolder();
			const source = await this.app.vault.cachedRead(file);
			const resolvedImages = await resolveVaultImageEmbeds(
				source,
				file,
				this.app.vault,
				this.app.metadataCache
			);
			const renderedPages = renderBrewMarkdown(source, {
				imageEmbeds: resolvedImages.imageEmbeds,
			});
			const pages = await this.paginateWithTheme(renderedPages, theme);

			const html = buildStandaloneHtml(
				pages,
				theme,
				this.getThemeCss(theme),
				file.basename,
				this.settings.pageWidthPx,
				this.settings.pageHeightPx
			);

			const result = await backend.export({ html, basename: file.basename });
			if (result.kind === "html-handoff") {
				const outPath = this.allocateExportPath(
					exportFolder,
					file.basename,
					".brew.html"
				);
				await this.app.vault.create(outPath, result.html);

				new MobilePdfHandoffModal(this.app, outPath).open();
				return;
			}

			if (result.kind === "unsupported") {
				new Notice(result.reason);
				return;
			}

			const outPath = this.allocateExportPath(exportFolder, file.basename, ".pdf");
			await this.app.vault.createBinary(outPath, result.bytes);

			new Notice(`Exported to ${outPath}`);
		} catch (err) {
			console.error("BrewVault PDF export failed", err);
			new Notice("BrewVault PDF export failed — see console for details.");
		}
	}

	onunload(): void {
		this.exportBackendProvider?.dispose();
		this.exportBackendProvider = null;
	}

	private getExportBackendProvider(): ExportBackendProvider {
		if (!this.exportBackendProvider) {
			throw new Error("BrewVault export backends have not been initialized.");
		}
		return this.exportBackendProvider;
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
		this.syncCustomStyleSheet(this.settings.theme);
	}

	async submitCustomStyle(css: string): Promise<CustomStyleDefinition> {
		if (!this.customStyleSheet) {
			throw new Error("This Obsidian runtime does not support custom stylesheets.");
		}
		const submission = createCustomStyleSubmission(
			css,
			this.settings.customStyles,
			this.settings.nextCustomStyleNumber
		);
		this.settings.customStyles = [...this.settings.customStyles, submission.style];
		this.settings.nextCustomStyleNumber = submission.nextCustomStyleNumber;
		await this.saveSettings();
		return submission.style;
	}

	async removeCustomStyle(theme: BrewTheme): Promise<void> {
		const remaining = this.settings.customStyles.filter((style) => style.id !== theme);
		if (remaining.length === this.settings.customStyles.length) return;

		this.settings.customStyles = remaining;
		if (this.settings.theme === theme) this.settings.theme = DEFAULT_SETTINGS.theme;
		await this.saveSettings();
		this.refreshAllViews();
	}

	getCustomCssForTheme(theme: BrewTheme): string {
		return findCustomStyle(theme, this.settings.customStyles)?.css ?? "";
	}

	private getThemeCss(theme: BrewTheme): string {
		const customCss = this.getCustomCssForTheme(theme);
		return customCss ? `${BUNDLED_THEME_CSS}\n${customCss}` : BUNDLED_THEME_CSS;
	}

	private installCustomStyleSheet(): void {
		if (typeof CSSStyleSheet === "undefined" || !("adoptedStyleSheets" in document)) return;
		const sheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
		this.customStyleSheet = sheet;
		this.syncCustomStyleSheet(this.settings.theme);
		this.register(() => {
			document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
				(candidate) => candidate !== sheet
			);
			if (this.customStyleSheet === sheet) this.customStyleSheet = null;
		});
	}

	private syncCustomStyleSheet(theme: BrewTheme): void {
		this.customStyleSheet?.replaceSync(this.getCustomCssForTheme(theme));
	}

	private async paginateWithTheme(pages: BrewPage[], theme: BrewTheme): Promise<BrewPage[]> {
		const selectedTheme = this.settings.theme;
		this.syncCustomStyleSheet(theme);
		try {
			return await paginateBrewPages(pages, {
				theme,
				pageWidthPx: this.settings.pageWidthPx,
				pageHeightPx: this.settings.pageHeightPx,
			});
		} finally {
			this.syncCustomStyleSheet(selectedTheme);
		}
	}

	/** Re-render every open BrewVault preview leaf (e.g. after a settings change). */
	refreshAllViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(HOMEBREWERY_VIEW_TYPE)) {
			const view = leaf.view;
			if (view instanceof HomebreweryView) {
				void view.renderNow();
			}
		}
	}

	/** Opens (or reveals) the BrewVault preview view in a new right-hand leaf. */
	async activateView(): Promise<HomebreweryView> {
		const existing = this.app.workspace.getLeavesOfType(HOMEBREWERY_VIEW_TYPE);
		let leaf: WorkspaceLeaf;

		if (existing.length > 0) {
			leaf = existing[0];
		} else {
			leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
			await leaf.setViewState({ type: HOMEBREWERY_VIEW_TYPE, active: true });
		}

		await this.app.workspace.revealLeaf(leaf);
		return leaf.view as HomebreweryView;
	}
}
