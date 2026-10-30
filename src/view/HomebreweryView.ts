import { ItemView, Keymap, MarkdownView, TFile, WorkspaceLeaf, type PaneType } from "obsidian";
import { EXPORT_OPTION_KEYS, pageDimensions } from "../exportOptions/options";
import type { ResolvedExportOptions } from "../exportOptions/resolve";
import { describeSource, themeDisplayName } from "../exportOptions/describe";
import { PAGE_FOOTER_CLASS, pageFooterText, pageNumberText } from "../export/pageFurniture";
import { paginateBrewPages } from "../renderer/paginateDom";
import type BrewVaultPlugin from "../main";
import { ALL_THEME_CLASS_NAMES, getThemeClassNames } from "../themes/registry";
import { appendRenderedHtml } from "../renderer/renderedHtml";
import { calculatePreviewViewportLayout } from "../ui/previewViewport";
import type { PlannedBook } from "../obsidian/renderNotePages";
import { openTocTarget } from "../obsidian/tocNavigation";

export const HOMEBREWERY_VIEW_TYPE = "brewvault-preview";
/** Each preview page's 1-based index, the target of `#p<index>` links. */
const PAGE_INDEX_ATTRIBUTE = "data-brewvault-page";

export class HomebreweryView extends ItemView {
	plugin: BrewVaultPlugin;
	private trackedFile: TFile | null = null;
	private rootEl!: HTMLElement;
	private pagesContainer!: HTMLElement;
	private captionEl!: HTMLElement;
	private debounceHandle: number | null = null;
	private viewportObserver: ResizeObserver | null = null;
	/** Members and images of the shown note; their changes re-render it. */
	private dependencyPaths = new Set<string>();
	private isBook = false;
	/** Page size of the note currently shown; set on every render. */
	private pageSize: { pageWidthPx: number; pageHeightPx: number };

	constructor(leaf: WorkspaceLeaf, plugin: BrewVaultPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.pageSize = pageDimensions("settings", plugin.settings);
	}

	getViewType(): string {
		return HOMEBREWERY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.trackedFile ? `Brew: ${this.trackedFile.basename}` : "BrewVault Preview";
	}

	getIcon(): string {
		return "scroll";
	}

	async onOpen(): Promise<void> {
		this.rootEl = this.containerEl.children[1] as HTMLElement;
		this.rootEl.empty();
		this.rootEl.addClass("brewvault-root");

		this.captionEl = this.rootEl.createDiv({ cls: "brewvault-preview-caption" });
		this.captionEl.setAttr("role", "button");
		this.captionEl.setAttr("tabindex", "0");
		this.captionEl.setAttr("aria-label", "Show export options");
		const openOptions = () => {
			if (!this.trackedFile) return;
			if (this.isBook) this.plugin.openBookContents(this.trackedFile);
			else this.plugin.openExportOptions(this.trackedFile);
		};
		this.registerDomEvent(this.captionEl, "click", openOptions);
		this.registerDomEvent(this.captionEl, "keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openOptions();
			}
		});

		this.pagesContainer = this.rootEl.createDiv({
			cls: "brewvault-pages brewvault-preview-pages",
		});
		this.startViewportObservation();
		// Table of contents rows link to #p<page>, like Homebrewery and the
		// export, and name their heading in the title: scroll to the page, then
		// open the heading in the editor like a wikilink.
		this.registerDomEvent(this.pagesContainer, "click", (event) => {
			const link = event.target instanceof Element ? event.target.closest("a[href^='#p']") : null;
			const index = /^#p(\d+)$/.exec(link?.getAttribute("href") ?? "")?.[1];
			if (!link || !index) return;
			event.preventDefault();
			this.pagesContainer.querySelector(`[${PAGE_INDEX_ATTRIBUTE}="${index}"]`)?.scrollIntoView({ block: "start" });
			const target = link.getAttribute("title");
			const file = this.trackedFile;
			if (target && file) {
				void openTocTarget(this.app, target, file.path, this.editorLeafFor(file, Keymap.isModEvent(event)));
			}
		});

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (
					file instanceof TFile &&
					(file === this.trackedFile || this.dependencyPaths.has(file.path))
				) {
					this.scheduleRender();
				}
			})
		);

		// Frontmatter (and so `bv_theme`) is parsed after `modify` fires.
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) => {
				if (file === this.trackedFile || this.dependencyPaths.has(file.path)) {
					this.scheduleRender();
				}
			})
		);

		// A book's folder includes change when notes are added, removed, or moved.
		const rerenderBook = () => {
			if (this.isBook) this.scheduleRender();
		};
		this.registerEvent(this.app.vault.on("create", rerenderBook));
		this.registerEvent(this.app.vault.on("delete", rerenderBook));
		this.registerEvent(this.app.vault.on("rename", rerenderBook));

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
		this.viewportObserver?.disconnect();
		this.viewportObserver = null;
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
			void this.renderNow();
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

		const file = this.trackedFile;
		const options = this.plugin.resolveNoteExportOptions(file);
		this.pageSize = pageDimensions(options.resolved.values.pageSize, this.plugin.settings);
		const { pageWidthPx, pageHeightPx } = this.pageSize;
		const { theme } = options.resolved.values;
		this.plugin.syncCustomStyleSheet(theme);
		const rendered = await this.plugin.renderNotePages(file, (pages) =>
			paginateBrewPages(pages, { theme, pageWidthPx, pageHeightPx })
		);
		// A newer render may have started while this one was paginating.
		if (file !== this.trackedFile) return;
		this.dependencyPaths = new Set(rendered.dependencyPaths);
		this.isBook = rendered.book !== null;
		this.updateCaption(options.resolved, options.invalid.length, rendered.book);
		const furniture = options.resolved.values;
		const pages = rendered.pages;

		this.pagesContainer.empty();
		this.pagesContainer.setCssProps({
			"--brew-page-width": `${pageWidthPx}px`,
			"--brew-page-height": `${pageHeightPx}px`,
		});
		this.updateViewportLayout();
		this.pagesContainer.removeClass(...ALL_THEME_CLASS_NAMES);
		this.pagesContainer.addClass(...getThemeClassNames(theme));

		for (const page of pages) {
			const pageEl = this.pagesContainer.createDiv({
				cls: "page brewPage",
				attr: { [PAGE_INDEX_ATTRIBUTE]: page.index },
			});
			appendRenderedHtml(pageEl, page.html);
			const footer = pageFooterText(furniture);
			if (footer) pageEl.createDiv({ cls: PAGE_FOOTER_CLASS, text: footer });
			const pageNumber = pageNumberText(page.index, furniture);
			if (pageNumber !== null) {
				pageEl.createDiv({ cls: "pageNumber brewPageNumber", text: pageNumber });
			}
		}

		this.flagOverflowingPages();
	}

	/**
	 * The editor to open a contents row in: a new tab on Mod-click, else the
	 * editor already showing the previewed note, so the preview stays open.
	 */
	private editorLeafFor(file: TFile, paneType: PaneType | boolean): WorkspaceLeaf {
		if (paneType) return this.app.workspace.getLeaf(paneType === true ? "tab" : paneType);
		const editor = this.app.workspace
			.getLeavesOfType("markdown")
			.find((leaf) => leaf.view instanceof MarkdownView && leaf.view.file === file);
		return editor ?? this.app.workspace.getLeaf("tab");
	}

	/**
	 * Shows the theme and option sources above the pages. Invalid properties
	 * are flagged here rather than with a notice: the Properties panel saves
	 * on every keystroke, so a half-typed value would otherwise raise a notice
	 * per letter. Exports still show a notice.
	 */
	private updateCaption(
		resolved: ResolvedExportOptions,
		invalidCount: number,
		book: PlannedBook | null
	): void {
		const warnings =
			invalidCount +
			(book?.plan.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length ?? 0);
		const bookText = book
			? ` · ${book.plan.memberCount} included ${book.plan.memberCount === 1 ? "note" : "notes"}`
			: "";
		this.captionEl.setText(
			previewCaption(resolved, warnings, this.plugin.settings.customStyles, bookText)
		);
		this.captionEl.toggleClass("brewvault-preview-caption-warning", warnings > 0);
		this.captionEl.setAttr("aria-label", book ? "Show included notes" : "Show export options");
	}

	private startViewportObservation(): void {
		this.updateViewportLayout();
		this.registerDomEvent(window, "resize", () => this.updateViewportLayout());
		if (typeof ResizeObserver === "undefined") return;

		this.viewportObserver = new ResizeObserver(() => {
			this.updateViewportLayout();
		});
		this.viewportObserver.observe(this.rootEl);
	}

	private updateViewportLayout(): void {
		if (!this.rootEl || !this.pagesContainer) return;
		const { pageWidthPx } = this.pageSize;
		const isPortrait = this.rootEl.clientWidth <= this.rootEl.clientHeight;
		const isCompact = this.rootEl.clientWidth < pageWidthPx + 48;
		this.rootEl.toggleClass("brewvault-preview-is-compact", isCompact);
		this.rootEl.toggleClass("brewvault-preview-is-portrait", isPortrait);
		this.rootEl.toggleClass("brewvault-preview-is-landscape", !isPortrait);

		const styles = window.getComputedStyle(this.rootEl);
		const availableWidth =
			this.rootEl.clientWidth -
			parseCssPixels(styles.paddingLeft) -
			parseCssPixels(styles.paddingRight);
		const availableHeight =
			this.rootEl.clientHeight -
			parseCssPixels(styles.paddingTop) -
			parseCssPixels(styles.paddingBottom);
		this.applyViewportLayout(availableWidth, availableHeight);
	}

	private applyViewportLayout(availableWidth: number, availableHeight: number): void {
		const { pageWidthPx, pageHeightPx } = this.pageSize;
		const layout = calculatePreviewViewportLayout(
			availableWidth,
			availableHeight,
			pageWidthPx,
			pageHeightPx
		);

		this.rootEl.toggleClass("brewvault-preview-is-scaled", layout.scale < 1);
		this.pagesContainer.setCssProps({
			"--brew-preview-scale": String(layout.scale),
			"--brew-preview-inline-offset": `${layout.inlineOffsetPx}px`,
			"--brew-preview-block-offset": `${layout.blockOffsetPx}px`,
		});
	}

	/**
	 * Automatic pagination handles normal top-level block overflow before the
	 * preview is mounted. This final check is the fallback for an indivisible
	 * block (for example, one very tall table) that is itself larger than a
	 * physical page and therefore cannot be moved to a later page intact.
	 * Deferred a frame so layout has settled before measuring.
	 */
	private flagOverflowingPages(): void {
		window.requestAnimationFrame(() => {
			const pageEls = this.pagesContainer.querySelectorAll<HTMLElement>(".brewPage");
			pageEls.forEach((pageEl) => {
				pageEl.removeClass("brewPageOverflow");
				pageEl.querySelector(".brewPageOverflowBadge")?.remove();

				const isOverflowing =
					pageEl.scrollHeight > pageEl.clientHeight + 1 ||
					pageEl.scrollWidth > pageEl.clientWidth + 1;
				if (isOverflowing) {
					pageEl.addClass("brewPageOverflow");
					const badge = pageEl.createDiv({ cls: "brewPageOverflowBadge" });
					badge.setText("Block is too large for one page");
				}
			});
		});
	}
}

function parseCssPixels(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/** Short caption above the pages: the theme, its source, and other properties. */
function previewCaption(
	resolved: ResolvedExportOptions,
	warningCount: number,
	customStyles: Parameters<typeof themeDisplayName>[1],
	bookText: string
): string {
	const theme = themeDisplayName(resolved.values.theme, customStyles);
	const themeSource = describeSource(resolved.sources.theme, "theme");
	const otherNoteOptions = EXPORT_OPTION_KEYS.filter(
		(key) => key !== "theme" && resolved.sources[key] === "note"
	).length;
	const extra =
		otherNoteOptions === 0
			? ""
			: ` · ${otherNoteOptions} more note ${otherNoteOptions === 1 ? "property" : "properties"}`;
	const warning =
		warningCount === 0
			? ""
			: ` · ⚠ ${warningCount} ${warningCount === 1 ? "problem" : "problems"}`;
	return `${theme} · ${themeSource}${bookText}${extra}${warning}`;
}
