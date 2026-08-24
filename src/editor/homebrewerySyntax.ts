export type HomebrewerySyntaxKind =
	| "block-open"
	| "block-close"
	| "page-break"
	| "column-break";

export interface HomebrewerySyntaxConstruct {
	kind: HomebrewerySyntaxKind;
	from: number;
	to: number;
	lineFrom: number;
	lineTo: number;
	label: string;
}

export interface EditorSelectionRange {
	from: number;
	to: number;
}

interface PendingBlock {
	construct: HomebrewerySyntaxConstruct;
	label: string;
}

interface FenceState {
	character: "`" | "~";
	length: number;
}

const BLOCK_OPEN_RE = /^\{\{([a-zA-Z][a-zA-Z0-9_,\-\s]*)\s*$/;
const BLOCK_CLOSE_RE = /^\}\}\s*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Finds source ranges that are structural in BrewVault's Markdown dialect.
 * Only matched block-container delimiters are returned, so unfinished authoring
 * remains visible and editable. Fenced examples are deliberately ignored.
 */
export function findHomebrewerySyntax(source: string): HomebrewerySyntaxConstruct[] {
	const constructs: HomebrewerySyntaxConstruct[] = [];
	const blockStack: PendingBlock[] = [];
	let fence: FenceState | null = null;
	let lineFrom = 0;

	while (lineFrom <= source.length) {
		const newline = source.indexOf("\n", lineFrom);
		const rawLineTo = newline === -1 ? source.length : newline;
		const lineTo = rawLineTo > lineFrom && source[rawLineTo - 1] === "\r"
			? rawLineTo - 1
			: rawLineTo;
		const line = source.slice(lineFrom, lineTo);
		const trimmed = line.trim();
		const contentOffset = line.search(/\S|$/);
		const contentFrom = lineFrom + contentOffset;
		const contentTo = lineFrom + line.length;
		const fenceMatch = FENCE_RE.exec(line);

		if (fenceMatch) {
			const marker = fenceMatch[1];
			const markerState: FenceState = {
				character: marker[0] as "`" | "~",
				length: marker.length,
			};
			if (!fence) {
				fence = markerState;
			} else if (
				markerState.character === fence.character &&
				markerState.length >= fence.length
			) {
				fence = null;
			}
		} else if (!fence && trimmed.length > 0) {
			const openMatch = BLOCK_OPEN_RE.exec(trimmed);
			if (openMatch) {
				const label = formatBlockLabel(openMatch[1]);
				blockStack.push({
					label,
					construct: {
						kind: "block-open",
						from: contentFrom,
						to: contentTo,
						lineFrom,
						lineTo,
						label,
					},
				});
			} else if (BLOCK_CLOSE_RE.test(trimmed) && blockStack.length > 0) {
				const opener = blockStack.pop();
				if (opener) {
					constructs.push(opener.construct, {
						kind: "block-close",
						from: contentFrom,
						to: contentTo,
						lineFrom,
						lineTo,
						label: opener.label,
					});
				}
			} else if (trimmed === "\\page" || trimmed === "\\column") {
				constructs.push({
					kind: trimmed === "\\page" ? "page-break" : "column-break",
					from: contentFrom,
					to: contentTo,
					lineFrom,
					lineTo,
					label: trimmed === "\\page" ? "Page break" : "Column break",
				});
			}
		}

		if (newline === -1) break;
		lineFrom = newline + 1;
	}

	return constructs.sort((a, b) => a.from - b.from || a.to - b.to);
}

export function selectionTouchesConstruct(
	selections: readonly EditorSelectionRange[],
	construct: HomebrewerySyntaxConstruct
): boolean {
	return selections.some(
		(selection) => selection.from <= construct.to && selection.to >= construct.from
	);
}

export function formatBlockLabel(classSource: string): string {
	return classSource
		.split(/[,\s]+/)
		.map((name) => name.trim())
		.filter(Boolean)
		.map((name) =>
			name
				.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
				.replace(/[-_]+/g, " ")
				.replace(/\b\w/g, (letter) => letter.toUpperCase())
		)
		.join(" · ");
}
