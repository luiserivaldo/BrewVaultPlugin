import type { IncludeAttribute } from "./manifest";

/** What a book needs to know about a note to select and order it. */
export interface BookNoteFacts {
	/** Vault-relative path, for example `Llynwych/Titans/Humbaba.md`. */
	readonly path: string;
	/** File name without the extension. */
	readonly name: string;
	readonly frontmatter: Readonly<Record<string, unknown>>;
}

export interface SortKey {
	readonly by: "name" | "path";
	readonly descending: boolean;
}

export interface IncludeQuery {
	/** Folder whose notes are included, without slashes at either end; "" is the vault root. */
	readonly folder: string;
	readonly recursive: boolean;
	/** Subfolders, note names, or relative paths to leave out. */
	readonly exclude: readonly string[];
	readonly sort: readonly SortKey[];
}

const DEFAULT_SORT: readonly SortKey[] = [{ by: "name", descending: false }];
const KNOWN_ATTRIBUTES = new Set(["folder", "exclude", "sort", "recursive"]);

/** Numeric collation, so `Session 2` sorts before `Session 10` and `01` before `10`. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Turns `{{bv:include …}}` attributes into a query, collecting problems.
 * Returns a null query when there is no folder to include.
 */
export function parseIncludeQuery(attributes: readonly IncludeAttribute[]): {
	query: IncludeQuery | null;
	problems: string[];
} {
	const problems: string[] = [];
	const single = (name: string): string | null => {
		const values = attributes.filter((attribute) => attribute.name === name);
		if (values.length > 1) problems.push(`"${name}" is set more than once; the first value is used.`);
		return values[0]?.value.trim() ?? null;
	};

	for (const attribute of attributes) {
		if (!KNOWN_ATTRIBUTES.has(attribute.name)) {
			problems.push(`Unknown include setting "${attribute.name}". Use folder, exclude, sort, or recursive.`);
		}
	}

	const folderValue = single("folder");
	if (folderValue === null) {
		problems.push('An include needs a folder, for example {{bv:include folder="SRD"}}.');
		return { query: null, problems };
	}

	const recursiveValue = single("recursive");
	const exclude = attributes
		.filter((attribute) => attribute.name === "exclude")
		.flatMap((attribute) => attribute.value.split(","))
		.map((value) => trimSlashes(value.trim()))
		.filter(Boolean);

	return {
		query: {
			folder: trimSlashes(folderValue),
			recursive: recursiveValue === null || !/^(false|no|off)$/i.test(recursiveValue),
			exclude,
			sort: parseSortKeys(single("sort"), problems),
		},
		problems,
	};
}

function parseSortKeys(value: string | null, problems: string[]): readonly SortKey[] {
	if (value === null || value === "") return DEFAULT_SORT;
	const keys: SortKey[] = [];
	for (const raw of value.split(",")) {
		const word = raw.trim();
		if (!word) continue;
		const descending = word.startsWith("-");
		const name = (descending ? word.slice(1) : word).trim().toLowerCase();
		if (name === "name" || name === "path") keys.push({ by: name, descending });
		else problems.push(`Unknown sort "${word}". Use name or path, with - in front to reverse.`);
	}
	return keys.length > 0 ? keys : DEFAULT_SORT;
}

/** The notes an include adds, in order. */
export function resolveInclude(
	notes: readonly BookNoteFacts[],
	query: IncludeQuery
): BookNoteFacts[] {
	return sortNotes(
		notes.filter((note) => inFolder(note.path, query.folder, query.recursive) && !isExcluded(note, query)),
		query.sort
	);
}

/** Stable multi-key sort. */
export function sortNotes(
	notes: readonly BookNoteFacts[],
	keys: readonly SortKey[]
): BookNoteFacts[] {
	return notes
		.map((note, index) => ({ note, index }))
		.sort((a, b) => {
			for (const key of keys) {
				const order = collator.compare(a.note[key.by], b.note[key.by]);
				if (order !== 0) return key.descending ? -order : order;
			}
			return a.index - b.index;
		})
		.map(({ note }) => note);
}

function inFolder(path: string, folder: string, recursive: boolean): boolean {
	const parent = parentFolder(path);
	if (folder === "") return recursive || parent === "";
	if (parent.toLowerCase() === folder.toLowerCase()) return true;
	return recursive && parent.toLowerCase().startsWith(`${folder.toLowerCase()}/`);
}

function isExcluded(note: BookNoteFacts, query: IncludeQuery): boolean {
	if (query.exclude.length === 0) return false;
	const base = query.folder;
	const relative =
		base && note.path.toLowerCase().startsWith(`${base.toLowerCase()}/`)
			? note.path.slice(base.length + 1)
			: note.path;
	const lowerRelative = relative.toLowerCase();
	const lowerPath = note.path.toLowerCase();
	return query.exclude.some((entry) => {
		const lower = entry.toLowerCase().replace(/\.md$/, "");
		return (
			note.name.toLowerCase() === lower ||
			lowerRelative === `${lower}.md` ||
			lowerPath === `${lower}.md` ||
			lowerRelative.startsWith(`${lower}/`) ||
			lowerPath.startsWith(`${lower}/`)
		);
	});
}

function parentFolder(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
}

function trimSlashes(value: string): string {
	return value.replace(/^\/+|\/+$/g, "");
}
