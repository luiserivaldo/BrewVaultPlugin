import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { renderBrewMarkdown } from "../renderer";
import type BrewVaultPlugin from "../main";

export const HOMEBREWERY_VIEW_TYPE = "brewvault-preview";

export class HomebreweryView extends ItemView {
	plugin: BrewVaultPlugin;
	private trackedFile: TFile | null = null;
	private pagesContainer!: HTMLElement;
	private debounceHandle: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: BrewVaultPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return HOMEBREWERY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.trackedFile ? `Brew: ${this.trackedFile.basename}` : "Homebrewery Preview";
	}

	getIcon(): string {
		return "scroll";
	}

	async onOpen(): Promise<void> {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("brewvault-root");

		this.pagesContainer = root.createDiv({ cls: "brewvault-pages" });

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file === this.trackedFile) {
					this.scheduleRender();
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.followActiveFile();
			})
		);

		this.followActiveFile();
	}

	async onClose(): Promise<void> {
		if (this.debounceHandle !== null) {
			window.clearTimeout(this.debounceHandle);
		}
	}

	/** Point this view at whatever Markdown file is currently active, if any. */
	followActiveFile(): void {
		const active = this.app.workspace.getActiveFile();
		if (active && active.extension === "md" && active !== this.trackedFile) {
			this.trackedFile = active;
			this.scheduleRender(true);
		}
	}

	/** Explicitly pin this view to a given file (used by the open command). */
	async setFile(file: TFile): Promise<void> {
		this.trackedFile = file;
		await this.renderNow();
	}

	private scheduleRender(immediate = false): void {
		if (this.debounceHandle !== null) {
			window.clearTimeout(this.debounceHandle);
			this.debounceHandle = null;
		}
		const delay = immediate ? 0 : this.plugin.settings.debounceMs;
		this.debounceHandle = window.setTimeout(() => {
			this.renderNow();
		}, delay);
	}

	async renderNow(): Promise<void> {
		if (!this.pagesContainer) return;

		if (!this.trackedFile) {
			this.pagesContainer.empty();
			this.pagesContainer.createDiv({
				cls: "brewvault-empty",
				text: "Open a Markdown note to preview it here.",
			});
			return;
		}

		const source = await this.app.vault.cachedRead(this.trackedFile);
		const pages = renderBrewMarkdown(source);
		const { theme, pageWidthPx, pageHeightPx } = this.plugin.settings;

		this.pagesContainer.empty();
		this.pagesContainer.style.setProperty("--brew-page-width", `${pageWidthPx}px`);
		this.pagesContainer.style.setProperty("--brew-page-height", `${pageHeightPx}px`);
		this.pagesContainer.removeClass(
			"brewvault-theme-phb",
			"brewvault-theme-blank",
			"brewvault-theme-journal"
		);
		this.pagesContainer.addClass(`brewvault-theme-${theme}`);

		for (const page of pages) {
			const pageEl = this.pagesContainer.createDiv({ cls: "brewPage" });
			pageEl.innerHTML = page.html;
			pageEl.createDiv({ cls: "brewPageNumber", text: String(page.index) });
		}
	}
}
