import type { Content, Style, TDocumentDefinitions } from "pdfmake/interfaces";

const SRD_PAGE_MARGINS: [number, number, number, number] = [46, 54, 46, 46];
const SRD_COLUMN_GAP = 16;
const SRD_COLUMN_WIDTH = (612 - SRD_PAGE_MARGINS[0] - SRD_PAGE_MARGINS[2] - SRD_COLUMN_GAP) / 2;
const SRD_COLUMN_HEIGHT = 625;

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

/**
 * pdfmake has columns but not continuous CSS-style column flow. This keeps
 * top-level semantic blocks together and conservatively distributes them into
 * paired columns so a block moves before it can be clipped at a page edge.
 */
export function buildSrdPdfDefinition(content: Content, title: string): TDocumentDefinitions {
	return {
		content: flowIntoSrdColumns(applySrdTreatments(content)),
		pageSize: "LETTER",
		pageMargins: SRD_PAGE_MARGINS,
		defaultStyle: {
			font: "Roboto",
			fontSize: 9.5,
			lineHeight: 1.18,
			color: "#282018",
		},
		styles: SRD_PDF_DEFAULT_STYLES,
		info: {
			title,
			creator: "BrewVault",
			producer: "BrewVault plain PDF exporter (experimental)",
		},
		header: () => ({
			text: "BREWVAULT  |  SRD / UNEARTHED ARCANA EXPERIMENT",
			fontSize: 7,
			color: "#6B5A47",
			margin: [46, 22, 46, 0],
			characterSpacing: 0.5,
		}),
		footer: (currentPage, pageCount) => ({
			columns: [
				{ text: title, alignment: "left" },
				{ text: `${currentPage} / ${pageCount}`, alignment: "right" },
			],
			fontSize: 7,
			color: "#6B5A47",
			margin: [46, 0, 46, 18],
		}),
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

function applySrdTreatments(value: Content): Content {
	return transformValue(value) as Content;
}

function transformValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(transformValue);
	if (!isRecord(value)) return value;

	const transformed = Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, transformValue(entry)])
	);
	if (typeof transformed.image === "string") {
		// The basic profile bounds images to the full Letter content width. This
		// profile packs content into narrower columns, so clamp again here before
		// pdfmake lays out the paired column stacks.
		return { ...transformed, fit: [SRD_COLUMN_WIDTH, 300] };
	}
	if (isBlockquote(transformed)) {
		return {
			...transformed,
			fillColor: "#F1E7CE",
			margin: [0, 4, 0, 8],
		};
	}
	if (isTable(transformed)) return styleSrdTable(transformed);
	return transformed;
}

function styleSrdTable(table: Record<string, unknown>): Record<string, unknown> {
	const tableValue = table.table;
	if (!isRecord(tableValue) || !Array.isArray(tableValue.body)) return table;
	const body = (tableValue.body as unknown[]).map((row, index) => {
		if (!Array.isArray(row)) return row;
		return row.map((cell) => styleSrdTableCell(cell, index));
	});
	return {
		...table,
		table: { ...tableValue, body, dontBreakRows: true },
		layout: "noBorders",
	};
}

function styleSrdTableCell(cell: unknown, rowIndex: number): unknown {
	const fillColor = rowIndex === 0 ? "#58180D" : rowIndex % 2 === 0 ? "#F1E7CE" : "#FBF8EF";
	if (isRecord(cell)) {
		return {
			...cell,
			fillColor: rowIndex === 0 ? "#58180D" : cell.fillColor ?? fillColor,
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
	if (Array.isArray(value)) return value.find((entry): entry is string => typeof entry === "string");
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
	return style === "blockquote";
}

function isHeading(value: Content): boolean {
	if (!isRecord(value)) return false;
	const style = readStyle(value.style);
	return style !== undefined && /^h[1-6]$/.test(style);
}

function isTable(value: Record<string, unknown>): boolean {
	return isRecord(value.table);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
