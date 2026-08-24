export interface HomebreweryTagRange {
	kind: "open" | "close";
	from: number;
	to: number;
	label: string;
}

export interface EditorSelectionRange {
	from: number;
	to: number;
}

interface PendingTag {
	range: HomebreweryTagRange;
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
 * Finds matched Homebrewery block delimiters without parsing or decorating the
 * document body. Unfinished tags and fenced examples remain ordinary source.
 */
export function findHomebreweryTagRanges(source: string): HomebreweryTagRange[] {
	const ranges: HomebreweryTagRange[] = [];
	const stack: PendingTag[] = [];
	let fence: FenceState | null = null;
	let lineFrom = 0;

	while (lineFrom <= source.length) {
		const newline = source.indexOf("\n", lineFrom);
		const rawLineTo = newline === -1 ? source.length : newline;
		const lineTo =
			rawLineTo > lineFrom && source[rawLineTo - 1] === "\r"
				? rawLineTo - 1
				: rawLineTo;
		const line = source.slice(lineFrom, lineTo);
		const trimmed = line.trim();
		const contentFrom = lineFrom + line.search(/\S|$/);
		const contentTo = lineFrom + line.length;
		const fenceMatch = FENCE_RE.exec(line);

		if (fenceMatch) {
			const marker = fenceMatch[1];
			const nextFence: FenceState = {
				character: marker[0] as "`" | "~",
				length: marker.length,
			};
			if (!fence) {
				fence = nextFence;
			} else if (
				nextFence.character === fence.character &&
				nextFence.length >= fence.length
			) {
				fence = null;
			}
		} else if (!fence && trimmed.length > 0) {
			const opener = BLOCK_OPEN_RE.exec(trimmed);
			if (opener) {
				const label = formatHomebreweryTagLabel(opener[1]);
				stack.push({
					label,
					range: { kind: "open", from: contentFrom, to: contentTo, label },
				});
			} else if (BLOCK_CLOSE_RE.test(trimmed) && stack.length > 0) {
				const matched = stack.pop();
				if (matched) {
					ranges.push(matched.range, {
						kind: "close",
						from: contentFrom,
						to: contentTo,
						label: matched.label,
					});
				}
			}
		}

		if (newline === -1) break;
		lineFrom = newline + 1;
	}

	return ranges.sort((a, b) => a.from - b.from || a.to - b.to);
}

export function selectionTouchesTag(
	selections: readonly EditorSelectionRange[],
	tag: HomebreweryTagRange
): boolean {
	return selections.some((selection) => selection.from <= tag.to && selection.to >= tag.from);
}

export function formatHomebreweryTagLabel(classSource: string): string {
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
