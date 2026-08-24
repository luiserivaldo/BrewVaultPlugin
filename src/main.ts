import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BrewVaultSettings, DEFAULT_SETTINGS } from "./settings/types";
import { BrewVaultSettingTab } from "./settings/SettingTab";
import { HomebreweryView, HOMEBREWERY_VIEW_TYPE } from "./view/HomebreweryView";
import { renderBrewMarkdown } from "./renderer";
import { paginateBrewPages } from "./renderer/paginateDom";
import { buildStandaloneHtml } from "./export/buildStandaloneHtml";
import { BUNDLED_THEME_CSS } from "./generated/themeCss";

export default class BrewVaultPlugin extends Plugin {
	settings: BrewVaultSettings = DEFAULT_SETTINGS;

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

		// --- Milestone 5: print to PDF without leaving Obsidian ---
		this.addCommand({
			id: "export-current-file-as-pdf",
			name: "Export current file as Homebrewery PDF",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const canRun = !!file && file.extension === "md";
				if (canRun && !checking) {
					this.exportFileAsPdf(file as TFile);
				}
				return canRun;
			},
		});
	}

	/**
	 * Renders `file` the same way the live preview does, then writes a
	 * self-contained HTML file (theme CSS inlined) next to it in the vault,
	 * named "<note-name>.brew.html". See ARCHITECTURE.md §8/§9.1.
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

			const outPath = file.path.replace(/\.md$/, "") + ".brew.html";
			const existing = this.app.vault.getAbstractFileByPath(outPath);
			if (existing instanceof TFile) {
				await this.app.vault.modify(existing, html);
			} else {
				await this.app.vault.create(outPath, html);
			}

			new Notice(
				`Exported "${outPath}". Open it in a browser and use Print → Save as PDF.`
			);
		} catch (err) {
			console.error("BrewVault export failed", err);
			new Notice("BrewVault export failed — see console for details.");
		}
	}

	/**
	 * Builds the same standalone HTML as exportFileAsHtml(), but instead of
	 * writing it to disk, loads it into a hidden off-screen <iframe> and
	 * calls that iframe's own window.print() once it finishes loading. This
	 * opens the normal OS/Electron print dialog (with "Save as PDF" as a
	 * printer option) without requiring a save-then-reopen-in-browser
	 * round trip. See ARCHITECTURE.md §9.4.
	 *
	 * NOTE: this relies on Electron's Chromium-standard iframe print
	 * behavior and has not been exercised against a real Obsidian install
	 * in this environment — see PROGRESS.md's verification notes. If it
	 * doesn't work on your system, "Export current file as HTML" is the reliable fallback.
	 */
	async exportFileAsPdf(file: TFile): Promise<void> {
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

			const iframe = document.createElement("iframe");
			iframe.style.cssText = "position:fixed; right:0; bottom:0; width:0; height:0; border:0;";
			document.body.appendChild(iframe);

			const cleanup = () => {
				window.setTimeout(() => iframe.remove(), 1000);
			};

			iframe.addEventListener("load", () => {
				const win = iframe.contentWindow;
				if (!win) {
					new Notice("BrewVault: couldn't access the print preview window.");
					cleanup();
					return;
				}
				win.addEventListener("afterprint", cleanup);
				win.focus();
				win.print();
				// Fallback cleanup in case the browser never fires "afterprint"
				// (some print-to-PDF flows don't).
				window.setTimeout(cleanup, 30000);
			});

			iframe.srcdoc = html;
		} catch (err) {
			console.error("BrewVault PDF export failed", err);
			new Notice("BrewVault PDF export failed — see console for details.");
		}
	}

	onunload(): void {
		// Views are cleaned up by Obsidian's workspace; nothing else to tear down.
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as
			| (Partial<BrewVaultSettings> & { theme?: BrewVaultSettings["theme"] | "journal" })
			| null;
		const normalized = { ...(stored ?? {}) };

		// M6 renamed the old local "journal" approximation to the SRD/UA theme.
		// Migrate existing plugin data so upgraded vaults do not end up with a
		// theme class that no longer exists.
		if (normalized.theme === "journal") {
			normalized.theme = "srd";
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, normalized) as BrewVaultSettings;
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
