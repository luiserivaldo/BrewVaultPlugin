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
	type MobilePdfMethod,
	normalizeStoredSettings,
} from "./settings/types";
import { BrewVaultSettingTab } from "./settings/SettingTab";
import { HomebreweryView, HOMEBREWERY_VIEW_TYPE } from "./view/HomebreweryView";
import { renderBrewMarkdown } from "./renderer";
import { paginateBrewPages } from "./renderer/paginateDom";
import { buildStandaloneHtml } from "./export/buildStandaloneHtml";
import { allocateExportPath, toExportBasename } from "./export/allocateExportPath";
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
import { registerInsertSnippetCommands } from "./commands/insertSnippet";
import type { Edition } from "./snippets/catalog";
import { NOTE_EDITION_PROPERTY, resolveNoteEdition } from "./snippets/noteEdition";
import { readNoteFrontmatter } from "./obsidian/readNoteFrontmatter";
import {
	pageDimensions,
	type ExportOptions,
	type PartialExportOptions,
} from "./exportOptions/options";
import {
	formatInvalidPropertiesMessage,
	parseNoteExportOptions,
	type InvalidNoteProperty,
} from "./exportOptions/noteProperties";
import { resolveExportOptions, type ResolvedExportOptions } from "./exportOptions/resolve";

interface RenderedExportDocument {
	readonly html: string;
	readonly options: ExportOptions;
	/** Safe export file name derived from the title. */
	readonly basename: string;
	readonly pageWidthPx: number;
	readonly pageHeightPx: number;
}

/** Persistent notice shown only while a backend renders pages one by one. */
class ExportProgressNotice {
	private notice: Notice | null = null;

	update(rendered: number, total: number): void {
		const message = `Rendering PDF page ${rendered} of ${total}…`;
		if (this.notice) this.notice.setMessage(message);
		else this.notice = new Notice(message, 0);
	}

	hide(): void {
		this.notice?.hide();
		this.notice = null;
	}
}

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
	private customStyleSheetTheme: BrewTheme = DEFAULT_SETTINGS.theme;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.installCustomStyleSheet();
		const platform = detectPlatform(Platform);
		this.exportBackendProvider = createBackendProvider(platform, {
			getMobilePdfMethod: () => this.settings.mobilePdfMethod,
		});
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
		registerInsertSnippetCommands(this, () => this.getActiveNoteEdition());

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

		// Curated theme-specific commands are intentionally limited to the four
		// baseline styles. Besides being convenient in the command palette, the
		// stable command IDs are suitable for Obsidian CLI invocation.
		this.addPdfExportCommand(
			"export-current-file-as-pdf-phb",
			"Export current file as BrewVault PDF in PHB style",
			"phb"
		);
		this.addPdfExportCommand(
			"export-current-file-as-pdf-dmg",
			"Export current file as BrewVault PDF in DMG style",
			"dmg"
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

		// Mobile-only commands choose the PDF method for one export, so either
		// method stays one command away regardless of the saved setting.
		if (platform === "mobile") {
			this.addPdfExportCommand(
				"export-current-file-as-pdf-mobile-browser",
				"Export current file as BrewVault PDF via browser",
				undefined,
				"browser"
			);
			this.addPdfExportCommand(
				"export-current-file-as-pdf-mobile-direct",
				"Export current file as BrewVault PDF directly (image pages)",
				undefined,
				"native"
			);
		}
	}

	private addPdfExportCommand(
		id: string,
		name: string,
		theme?: BrewTheme,
		mobilePdfMethod?: MobilePdfMethod
	): void {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = file instanceof TFile && file.extension === "md";
				if (canRun && !checking) {
					void this.exportFileAsPdf(file, theme, mobilePdfMethod);
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
			const { html, basename, options } = await this.renderExportDocument(file);

			const exportFolder = await this.ensureExportFolder(options.exportSubfolder);
			const outPath = this.allocateExportPath(exportFolder, basename, ".brew.html");
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
	async exportFileAsPdf(
		file: TFile,
		themeOverride?: BrewTheme,
		mobilePdfMethod?: MobilePdfMethod
	): Promise<void> {
		try {
			const backend = await this.getExportBackendProvider().getBackend();
			const rendered = await this.renderExportDocument(file, { theme: themeOverride });
			const { html, basename, pageWidthPx, pageHeightPx } = rendered;
			const exportFolder = await this.ensureExportFolder(rendered.options.exportSubfolder);

			const progress = new ExportProgressNotice();
			let result;
			try {
				result = await backend.export({
					html,
					basename,
					pageWidthPx,
					pageHeightPx,
					mobilePdfMethod,
					onProgress: (rendered, total) => progress.update(rendered, total),
				});
			} finally {
				progress.hide();
			}
			if (result.kind === "html-handoff") {
				const outPath = this.allocateExportPath(exportFolder, basename, ".brew.html");
				await this.app.vault.create(outPath, result.html);

				new MobilePdfHandoffModal(this.app, outPath).open();
				return;
			}

			if (result.kind === "unsupported") {
				new Notice(result.reason);
				return;
			}

			const outPath = this.allocateExportPath(exportFolder, basename, ".pdf");
			await this.app.vault.createBinary(outPath, result.bytes);

			new Notice(`Exported to ${outPath}`);
		} catch (err) {
			console.error("BrewVault PDF export failed", err);
			new Notice("BrewVault PDF export failed — see console for details.");
		}
	}

	/**
	 * Resolves a note's export options from the command, the note's `bv_*`
	 * properties, and settings, in that order. Invalid properties are listed
	 * so the caller can tell the user.
	 */
	resolveNoteExportOptions(
		file: TFile,
		command?: PartialExportOptions
	): { resolved: ResolvedExportOptions; invalid: readonly InvalidNoteProperty[] } {
		const note = parseNoteExportOptions(readNoteFrontmatter(file, this.app.metadataCache), {
			customStyles: this.settings.customStyles,
		});
		const resolved = resolveExportOptions({
			command,
			note: note.options,
			defaults: this.getDefaultExportOptions(file),
		});
		return { resolved, invalid: note.invalid };
	}

	/**
	 * Edition for insert commands that don't name one: the active note's
	 * `bv_edition`, else the default edition from settings.
	 */
	private getActiveNoteEdition(): Edition {
		const file = this.app.workspace.getActiveFile();
		if (!file) return this.settings.defaultEdition;
		const note = resolveNoteEdition(readNoteFrontmatter(file, this.app.metadataCache));
		if (note.kind === "edition") return note.edition;
		if (note.kind === "invalid") {
			new Notice(
				`BrewVault ignored invalid ${NOTE_EDITION_PROPERTY} "${note.value}" in "${file.basename}" and used the default edition.`
			);
		}
		return this.settings.defaultEdition;
	}

	private getDefaultExportOptions(file: TFile): ExportOptions {
		return {
			theme: this.settings.theme,
			footer: "",
			showPageNumbers: true,
			firstPageNumber: 1,
			pageSize: "settings",
			title: file.basename,
			exportSubfolder: "",
		};
	}

	/**
	 * Renders `file` into one self-contained HTML document with its resolved
	 * export options. Both HTML and PDF export start here, so they always
	 * agree with each other.
	 */
	private async renderExportDocument(
		file: TFile,
		command?: PartialExportOptions
	): Promise<RenderedExportDocument> {
		const { resolved, invalid } = this.resolveNoteExportOptions(file, command);
		if (invalid.length > 0) new Notice(formatInvalidPropertiesMessage(file.basename, invalid));
		const options = resolved.values;

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
		const { pageWidthPx, pageHeightPx } = pageDimensions(options.pageSize, this.settings);
		const pages = await this.paginateWithTheme(renderedPages, options.theme, {
			pageWidthPx,
			pageHeightPx,
		});

		const html = buildStandaloneHtml(
			pages,
			options.theme,
			this.getThemeCss(options.theme),
			options.title,
			pageWidthPx,
			pageHeightPx,
			options
		);
		const basename = toExportBasename(options.title, file.basename);
		return { html, options, basename, pageWidthPx, pageHeightPx };
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

	/**
	 * Creates the export folder, plus an optional `bv_export_folder`
	 * subfolder inside it, and returns the folder to write into. The
	 * subfolder was already validated by normalizeExportSubfolder().
	 */
	private async ensureExportFolder(subfolder = ""): Promise<string> {
		const configured = this.settings.exportFolder.trim() || DEFAULT_SETTINGS.exportFolder;
		const normalized = normalizePath(configured)
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");

		if (!normalized || normalized === "." || normalized.startsWith("../")) {
			throw new Error("BrewVault export folder must be a vault-relative folder path.");
		}

		const target = subfolder ? `${normalized}/${subfolder}` : normalized;
		let current = "";
		for (const segment of target.split("/").filter(Boolean)) {
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

		return target;
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

	/**
	 * Loads `theme`'s custom CSS into the shared document stylesheet. The
	 * preview calls this so a note's custom `bv_theme` styles what it shows.
	 */
	syncCustomStyleSheet(theme: BrewTheme): void {
		this.customStyleSheetTheme = theme;
		this.customStyleSheet?.replaceSync(this.getCustomCssForTheme(theme));
	}

	private async paginateWithTheme(
		pages: BrewPage[],
		theme: BrewTheme,
		size: { pageWidthPx: number; pageHeightPx: number }
	): Promise<BrewPage[]> {
		const selectedTheme = this.customStyleSheetTheme;
		this.syncCustomStyleSheet(theme);
		try {
			return await paginateBrewPages(pages, {
				theme,
				pageWidthPx: size.pageWidthPx,
				pageHeightPx: size.pageHeightPx,
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
