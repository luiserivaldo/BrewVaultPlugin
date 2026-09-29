import type { Content, Style, TDocumentDefinitions } from "pdfmake/interfaces";
import {
	DMG_BACKGROUND,
	PHB_PARCHMENT_BACKGROUND,
} from "virtual:brewvault-native-pdf-assets";
import type { BasicPdfProfile } from "./types";

const SRD_PAGE_MARGINS: [number, number, number, number] = [46, 54, 46, 46];
const SRD_COLUMN_GAP = 16;
const SRD_COLUMN_WIDTH = (612 - SRD_PAGE_MARGINS[0] - SRD_PAGE_MARGINS[2] - SRD_COLUMN_GAP) / 2;
// The prior conservative planner left a visibly oversized blank strip at the
// bottom of each page. This remains below the usable Letter height while
// allowing the second column to carry more real content.
const SRD_COLUMN_HEIGHT = 660;

export const SRD_PDF_DEFAULT_STYLES: Readonly<Record<string, Style>> = {
	h1: { fontSize: 22, bold: true, color: "#58180D", margin: [0, 0, 0, 10] },
	h2: { fontSize: 16, bold: true, color: "#58180D", margin: [0, 10, 0, 6] },
	h3: { fontSize: 13, bold: true, color: "#58180D", margin: [0, 8, 0, 5] },
	h4: { fontSize: 11, bold: true, color: "#58180D", margin: [0, 7, 0, 4] },
	h5: { fontSize: 10, bold: true, color: "#58180D", margin: [0, 6, 0, 3] },
	h6: { fontSize: 9, bold: true, color: "#58180D", margin: [0, 5, 0, 3] },
	p: { margin: [0, 0, 0, 6] },
	blockquote: { margin: [0, 4, 0, 8], italics: true, color: "#3D3328" },
	ul: { margin: [10, 0, 0, 5] },
	ol: { margin: [10, 0, 0, 5] },
	table: { margin: [0, 4, 0, 8] },
	th: { bold: true, color: "#FFFFFF", fillColor: "#58180D" },
	a: { color: "#1C4C7A", decoration: "underline" },
};

type ThemedPdfProfile = Exclude<BasicPdfProfile, "basic">;

interface ThemePalette {
	readonly label: string;
	readonly headingColor: string;
	readonly headerColor: string;
	readonly textColor: string;
	readonly bodyFont: string;
	readonly headingFont: string;
	readonly headingRuleLevels: readonly number[];
	readonly background?: string;
	readonly quoteFill: string;
	readonly tableAltFill: string;
	readonly tableBodyFill: string;
}

const THEME_PALETTES: Readonly<Record<ThemedPdfProfile, ThemePalette>> = {
	blank: {
		label: "BLANK THEME",
		headingColor: "#2A2A2A",
		headerColor: "#555555",
		textColor: "#222222",
		bodyFont: "Roboto",
		headingFont: "Roboto",
		headingRuleLevels: [],
		quoteFill: "#F1F1F1",
		tableAltFill: "#F2F2F2",
		tableBodyFill: "#FFFFFF",
	},
	phb: {
		label: "PLAYER'S HANDBOOK THEME",
		headingColor: "#9C1C10",
		headerColor: "#6E1808",
		textColor: "#1A1005",
		bodyFont: "BookInsanity",
		// pdfmake on Android does not reliably render the bundled Mr Eaves WOFF2.
		// Book Insanity is bundled alongside it and produces selectable, visible
		// heading glyphs on the target device.
		headingFont: "BookInsanity",
		headingRuleLevels: [2, 3],
		background: PHB_PARCHMENT_BACKGROUND,
		quoteFill: "#F6E5BD",
		tableAltFill: "#F5E8C9",
		tableBodyFill: "#FFF9EC",
	},
	dmg: {
		label: "DUNGEON MASTER'S GUIDE THEME",
		headingColor: "#1F6579",
		headerColor: "#1D3A48",
		textColor: "#171717",
		bodyFont: "BookInsanity",
		headingFont: "BookInsanity",
		headingRuleLevels: [2, 3],
		background: DMG_BACKGROUND,
		quoteFill: "#DCE9E6",
		tableAltFill: "#E2EFEC",
		tableBodyFill: "#F8FCFB",
	},
	srd: {
		label: "SRD / UNEARTHED ARCANA THEME",
		headingColor: "#58180D",
		headerColor: "#58180D",
		textColor: "#282018",
		bodyFont: "Roboto",
		headingFont: "Roboto",
		headingRuleLevels: [2, 3],
		quoteFill: "#F1E7CE",
		tableAltFill: "#F1E7CE",
		tableBodyFill: "#FBF8EF",
	},
};

/**
 * pdfmake has columns but not continuous CSS-style column flow. This keeps
 * top-level semantic blocks together and conservatively distributes them into
 * paired columns so a block moves before it can be clipped at a page edge.
 */
export function buildSrdPdfDefinition(content: Content, title: string): TDocumentDefinitions {
	return buildThemedPdfDefinition(content, title, "srd");
}

/**
 * The native backend maps BrewVault's bundled themes to faithful semantic
 * palettes. It deliberately does not execute arbitrary Homebrewery CSS.
 */
export function buildThemedPdfDefinition(
	content: Content,
	title: string,
	profile: ThemedPdfProfile
): TDocumentDefinitions {
	const palette = THEME_PALETTES[profile];
	const backgroundImage = palette.background;
	return {
		content: flowIntoSrdColumns(applySrdTreatments(content, palette)),
		pageSize: "LETTER",
		pageMargins: SRD_PAGE_MARGINS,
		defaultStyle: {
			font: palette.bodyFont,
			fontSize: 9.5,
			lineHeight: 1.18,
			color: palette.textColor,
		},
		styles: createThemeStyles(palette),
		info: {
			title,
			creator: "BrewVault",
			producer: "BrewVault native themed PDF exporter (experimental)",
		},
		background: backgroundImage
			? () => ({ image: backgroundImage, width: 612, height: 792 })
			: undefined,
	};
}

function createThemeStyles(palette: ThemePalette): Readonly<Record<string, Style>> {
	return {
		...SRD_PDF_DEFAULT_STYLES,
		h1: { ...SRD_PDF_DEFAULT_STYLES.h1, color: palette.headingColor, font: palette.headingFont },
		h2: { ...SRD_PDF_DEFAULT_STYLES.h2, color: palette.headingColor, font: palette.headingFont },
		h3: { ...SRD_PDF_DEFAULT_STYLES.h3, color: palette.headingColor, font: palette.headingFont },
		h4: { ...SRD_PDF_DEFAULT_STYLES.h4, color: palette.headingColor, font: palette.headingFont },
		h5: { ...SRD_PDF_DEFAULT_STYLES.h5, color: palette.headingColor, font: palette.headingFont },
		h6: { ...SRD_PDF_DEFAULT_STYLES.h6, color: palette.headingColor, font: palette.headingFont },
		th: { ...SRD_PDF_DEFAULT_STYLES.th, fillColor: palette.headerColor },
	};
}

export function flowIntoSrdColumns(content: Content): Content[] {
	const blocks = groupHeadingsWithFollowingBlock(
		splitOversizedTextBlocks(
			expandUnorderedLists(Array.isArray(content) ? content : [content])
		)
	);
	const pages: Content[] = [];
	let left: Content[] = [];
	let right: Content[] = [];
	let usedLeft = 0;
	let usedRight = 0;
	let fillingRight = false;

	const appendPage = (): void => {
		if (left.length === 0 && right.length === 0) return;
		pages.push({
			columns: [
				{ width: SRD_COLUMN_WIDTH, stack: left },
				{ width: SRD_COLUMN_WIDTH, stack: right },
			],
			columnGap: SRD_COLUMN_GAP,
			pageBreak: pages.length === 0 ? undefined : "before",
		});
		left = [];
		right = [];
		usedLeft = 0;
		usedRight = 0;
		fillingRight = false;
	};

	for (const block of blocks) {
		if (isForcedPageBreak(block)) {
			appendPage();
			continue;
		}
		const height = estimateHeight(block);
		// pdfmake can split an oversized stack across physical pages, but when it
		// begins in the right column that continuation leaves an empty left column
		// on the next page. Begin such a block in a fresh left column instead.
		if (height > SRD_COLUMN_HEIGHT && (left.length > 0 || right.length > 0)) {
			appendPage();
		}
		if (
			!fillingRight &&
			(left.length === 0 || usedLeft + height <= SRD_COLUMN_HEIGHT)
		) {
			left.push(block);
			usedLeft += height;
			continue;
		}
		if (usedRight + height <= SRD_COLUMN_HEIGHT) {
			right.push(block);
			usedRight += height;
			fillingRight = true;
			continue;
		}
		appendPage();
		left.push(block);
		usedLeft = height;
	}
	appendPage();
	return pages;
}

/**
 * html-to-pdfmake emits one `ul` content node for a whole list. Large lists
 * can then overflow a planned column before pdfmake gives control back to this
 * paginator. Give each bullet its own top-level packing unit instead.
 */
function expandUnorderedLists(blocks: Content[]): Content[] {
	const expanded: Content[] = [];
	for (const block of blocks) {
		if (!isRecord(block) || !Array.isArray(block.ul) || block.ul.length < 2) {
			expanded.push(block);
			continue;
		}
		const listBlock = block as unknown as Record<string, unknown>;
		for (const [index, item] of (block.ul as unknown[]).entries()) {
			expanded.push(
				{
					...listBlock,
					ul: [item],
					// Keep the list's leading margin but do not repeat its bottom gap after
					// every individual bullet.
					margin: index === 0 ? listBlock.margin : [10, 0, 0, 0],
				} as unknown as Content
			);
		}
	}
	return expanded;
}

/**
 * A single very long plain paragraph cannot be balanced by pdfmake's column
 * primitive. Split only plain text at word boundaries; rich inline content is
 * left intact rather than risking semantic loss.
 */
function splitOversizedTextBlocks(blocks: Content[]): Content[] {
	const split: Content[] = [];
	for (const block of blocks) {
		if (!isRecord(block) || typeof block.text !== "string" || estimateHeight(block) <= SRD_COLUMN_HEIGHT) {
			split.push(block);
			continue;
		}
		const textBlock = block as unknown as Record<string, unknown>;
		for (const text of splitTextAtWordBoundaries(block.text, 1400)) {
			split.push({ ...textBlock, text });
		}
	}
	return split;
}

function splitTextAtWordBoundaries(text: string, maximumLength: number): string[] {
	const chunks: string[] = [];
	let remaining = text.trim();
	while (remaining.length > maximumLength) {
		const boundary = remaining.lastIndexOf(" ", maximumLength);
		const splitAt = boundary > 0 ? boundary : maximumLength;
		chunks.push(remaining.slice(0, splitAt));
		remaining = remaining.slice(splitAt).trimStart();
	}
	if (remaining) chunks.push(remaining);
	return chunks;
}

/** Keeps a section label from becoming a stranded last line in a column. */
function groupHeadingsWithFollowingBlock(blocks: Content[]): Content[] {
	const grouped: Content[] = [];
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		const following = blocks[index + 1];
		if (isHeading(block) && following !== undefined && !isForcedPageBreak(following)) {
			grouped.push({ stack: [block, following] });
			index += 1;
		} else {
			grouped.push(block);
		}
	}
	return grouped;
}

function applySrdTreatments(value: Content, palette: ThemePalette): Content {
	return transformValue(value, palette) as Content;
}

function transformValue(value: unknown, palette: ThemePalette): unknown {
	if (Array.isArray(value)) return value.map((entry) => transformValue(entry, palette));
	if (!isRecord(value)) return value;

	const transformed = Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, transformValue(entry, palette)])
	);
	if (typeof transformed.image === "string") {
		// The basic profile bounds images to the full Letter content width. This
		// profile packs content into narrower columns, so clamp again here before
		// pdfmake lays out the paired column stacks.
		return {
			...transformed,
			fit: [SRD_COLUMN_WIDTH, 300],
			margin: transformed.margin ?? [0, 3, 0, 10],
		};
	}
	const heading = themedHeadingProperties(transformed, palette);
	if (heading) {
		return {
			...transformed,
			...heading,
			text: applyHeadingInlineTheme(transformed.text, palette),
		};
	}
	if (isBlockquote(transformed)) {
		return {
			columns: [
				{
					width: 12,
					text: "◆",
					fontSize: 8,
					color: palette.headingColor,
					margin: [0, 2, 0, 0],
				},
				{
					width: "*",
					stack: [{ ...transformed, fillColor: palette.quoteFill, margin: [0, 0, 0, 0] }],
				},
			],
			columnGap: 3,
			margin: [0, 2, 0, 4],
		};
	}
	if (isTable(transformed)) return styleSrdTable(transformed, palette);
	return transformed;
}

/**
 * html-to-pdfmake keeps its internal `html-h*` style names in the converted
 * content. Preserve them (they carry its tested block semantics) and layer
 * BrewVault's selected theme directly onto each heading instead.
 */
function themedHeadingProperties(
	value: Record<string, unknown>,
	palette: ThemePalette
): Readonly<Record<string, unknown>> | undefined {
	const style = readStyle(value.style);
	const match = /^(?:html-)?h([1-6])$/.exec(style ?? "");
	if (!match) return undefined;
	const level = Number(match[1]);
	const headingStyle = SRD_PDF_DEFAULT_STYLES[`h${level}`];
	return {
		font: palette.headingFont,
		fontSize: headingStyle?.fontSize,
		bold: true,
		color: palette.headingColor,
		margin: headingMargin(level, palette.headingRuleLevels.includes(level)),
		decoration: palette.headingRuleLevels.includes(level) ? "underline" : undefined,
		decorationColor: palette.headingRuleLevels.includes(level) ? palette.headingColor : undefined,
		decorationStyle: palette.headingRuleLevels.includes(level) ? "solid" : undefined,
	};
}

function headingMargin(level: number, hasRule: boolean): [number, number, number, number] {
	if (hasRule) return level === 2 ? [0, 10, 0, 1] : [0, 7, 0, 1];
	const defaultMargin = SRD_PDF_DEFAULT_STYLES[`h${level}`]?.margin;
	return Array.isArray(defaultMargin)
		? [defaultMargin[0] ?? 0, defaultMargin[1] ?? 0, defaultMargin[2] ?? 0, defaultMargin[3] ?? 0]
		: [0, 0, 0, 0];
}

/** html-to-pdfmake puts the visible heading glyphs in inline text nodes. */
function applyHeadingInlineTheme(value: unknown, palette: ThemePalette): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => applyHeadingInlineTheme(entry, palette));
	}
	if (!isRecord(value)) return value;
	return {
		...value,
		font: palette.headingFont,
		bold: true,
		color: palette.headingColor,
		text: applyHeadingInlineTheme(value.text, palette),
	};
}

function styleSrdTable(table: Record<string, unknown>, palette: ThemePalette): Record<string, unknown> {
	const tableValue = table.table;
	if (!isRecord(tableValue) || !Array.isArray(tableValue.body)) return table;
	const body = (tableValue.body as unknown[]).map((row, index) => {
		if (!Array.isArray(row)) return row;
		return row.map((cell) => styleSrdTableCell(cell, index, palette));
	});
	return {
		...table,
		table: { ...tableValue, body, dontBreakRows: true },
		layout: "noBorders",
	};
}

function styleSrdTableCell(cell: unknown, rowIndex: number, palette: ThemePalette): unknown {
	const fillColor = rowIndex === 0 ? palette.headerColor : rowIndex % 2 === 0 ? palette.tableAltFill : palette.tableBodyFill;
	if (isRecord(cell)) {
		return {
			...cell,
			fillColor: rowIndex === 0 ? palette.headerColor : cell.fillColor ?? fillColor,
			color: rowIndex === 0 ? "#FFFFFF" : cell.color,
			bold: rowIndex === 0 ? true : cell.bold,
			margin: cell.margin ?? [3, 3, 3, 3],
		};
	}
	return {
		text:
			cell === null || cell === undefined
				? ""
				: typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean"
					? String(cell)
					: "",
		fillColor,
		color: rowIndex === 0 ? "#FFFFFF" : undefined,
		bold: rowIndex === 0,
		margin: [3, 3, 3, 3],
	};
}

function estimateHeight(value: unknown): number {
	if (Array.isArray(value)) {
		return (value as unknown[]).reduce<number>(
			(total, entry) => total + estimateHeight(entry),
			0
		);
	}
	if (!isRecord(value)) return 14;
	if (typeof value.image === "string") return imageHeight(value);
	if (isTable(value)) return tableHeight(value);
	if (Array.isArray(value.stack)) return estimateHeight(value.stack);
	if (Array.isArray(value.ul) || Array.isArray(value.ol)) {
		const items = (Array.isArray(value.ul) ? value.ul : value.ol) as unknown[];
		return Math.max(
			18,
			items.reduce<number>((total, item) => total + estimateHeight(item), 0) + 6
		);
	}
	const text = textLength(value.text);
	const style = readStyle(value.style);
	const fontSize = style === "h1" ? 22 : style === "h2" ? 16 : style === "h3" ? 13 : style === "h4" ? 11 : 9.5;
	const lineWidth = Math.max(20, Math.floor(SRD_COLUMN_WIDTH / (fontSize * 0.52)));
	const lines = Math.max(1, Math.ceil(text / lineWidth));
	const margin = readBottomMargin(value.margin);
	return Math.ceil(lines * fontSize * 1.25 + margin + 3);
}

function imageHeight(value: Record<string, unknown>): number {
	if (Array.isArray(value.fit) && typeof value.fit[1] === "number") {
		return Math.min(value.fit[1], 220) + 8;
	}
	return 180;
}

function tableHeight(value: Record<string, unknown>): number {
	const table = value.table;
	if (!isRecord(table) || !Array.isArray(table.body)) return 48;
	return Math.max(28, table.body.length * 24 + 8);
}

function textLength(value: unknown): number {
	if (typeof value === "string") return value.length;
	if (Array.isArray(value)) {
		return (value as unknown[]).reduce<number>(
			(sum, entry) => sum + textLength(entry),
			0
		);
	}
	if (!isRecord(value)) return 0;
	return textLength(value.text) + textLength(value.stack) + textLength(value.ul) + textLength(value.ol);
}

function readStyle(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		const styles = value.filter((entry): entry is string => typeof entry === "string");
		return styles.find((style) => /^(?:html-)?(?:h[1-6]|blockquote|ul|ol|table|th|a)$/.test(style))
			?? styles[0];
	}
	return undefined;
}

function readBottomMargin(value: unknown): number {
	return Array.isArray(value) && typeof value[3] === "number" ? value[3] : 0;
}

function isForcedPageBreak(value: Content): boolean {
	return isRecord(value) && value.pageBreak === "before";
}

function isBlockquote(value: Record<string, unknown>): boolean {
	const style = readStyle(value.style);
	return style === "blockquote" || style === "html-blockquote";
}

function isHeading(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const style = readStyle(value.style);
	if (style !== undefined && /^(?:html-)?h[1-6]$/.test(style)) return true;
	return Array.isArray(value.stack) && value.stack.length > 0 && isHeading(value.stack[0]);
}

function isTable(value: Record<string, unknown>): boolean {
	return isRecord(value.table);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
