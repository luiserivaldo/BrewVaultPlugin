import { EXPORT_OPTION_PROPERTIES } from "../exportOptions/options";
import { parseIncludeQuery, resolveInclude, type BookNoteFacts } from "./include";
import type { ManifestItem } from "./manifest";

/** A piece of the compiled document, in reading order. */
export type BookSegment =
	| { readonly kind: "text"; readonly markdown: string }
	| {
			readonly kind: "member";
			readonly note: BookNoteFacts;
			/** Line of the include that added this note, or null for a `[[link]]`. */
			readonly includeLine: number | null;
	  };

export interface BookDiagnostic {
	readonly severity: "warning" | "info";
	readonly message: string;
}

export interface BookPlan {
	readonly segments: readonly BookSegment[];
	readonly diagnostics: readonly BookDiagnostic[];
	readonly memberCount: number;
}

export interface BookSources {
	readonly bookPath: string;
	/**
	 * Resolves a `[[link]]` from the book note: the note, "not-note" for an
	 * existing file that isn't Markdown (an image, a PDF), or null.
	 */
	readonly resolveLink: (linkpath: string) => BookNoteFacts | "not-note" | null;
	/** Every Markdown note in the vault, for includes. */
	readonly allNotes: () => readonly BookNoteFacts[];
}

/**
 * Orders the notes a book pulls in and checks for problems, without reading
 * any files. `[[links]]` keep their written order. Includes add a folder's
 * notes, skipping any that are linked anywhere in the book.
 */
export function planBook(items: readonly ManifestItem[], sources: BookSources): BookPlan {
	const segments: BookSegment[] = [];
	const diagnostics: BookDiagnostic[] = [];
	const warn = (message: string) => diagnostics.push({ severity: "warning", message });
	const seen = new Set<string>([sources.bookPath]);
	let memberCount = 0;

	// Links win over includes wherever they appear in the book.
	const listedPaths = new Set<string>();
	for (const item of items) {
		if (item.kind !== "member") continue;
		const note = sources.resolveLink(item.linkpath);
		if (note && note !== "not-note") listedPaths.add(note.path);
	}

	const addMember = (note: BookNoteFacts, includeLine: number | null) => {
		segments.push({ kind: "member", note, includeLine });
		seen.add(note.path);
		memberCount++;
		const ignored = Object.values(EXPORT_OPTION_PROPERTIES).filter(
			(property) => note.frontmatter[property] !== undefined && note.frontmatter[property] !== null
		);
		if (ignored.length > 0) {
			diagnostics.push({
				severity: "info",
				message: `${note.name}: ${ignored.join(", ")} ignored; this note's settings apply.`,
			});
		}
	};

	let allNotes: readonly BookNoteFacts[] | null = null;
	for (const item of items) {
		switch (item.kind) {
			case "text":
				segments.push(item);
				break;
			case "problem":
				warn(item.message);
				break;
			case "member": {
				const note = sources.resolveLink(item.linkpath);
				if (!note) {
					warn(`Line ${item.line}: [[${item.linkpath}]] does not match any note.`);
				} else if (note === "not-note") {
					warn(
						`Line ${item.line}: [[${item.linkpath}]] is not a note. Use ![[${item.linkpath}]] to show it as an image.`
					);
				} else if (note.path === sources.bookPath) {
					warn(`Line ${item.line}: the note links to itself; skipped.`);
				} else if (seen.has(note.path)) {
					warn(`Line ${item.line}: ${note.name} is already included; this copy is skipped.`);
				} else {
					addMember(note, null);
				}
				break;
			}
			case "include": {
				const { query, problems } = parseIncludeQuery(item.attributes);
				for (const problem of problems) warn(`Line ${item.line}: ${problem}`);
				if (query === null) break;

				allNotes ??= sources.allNotes();
				const notes = resolveInclude(
					allNotes.filter((note) => !seen.has(note.path) && !listedPaths.has(note.path)),
					query
				);
				if (notes.length === 0) warn(`Line ${item.line}: ${item.raw} matched no notes.`);
				for (const note of notes) addMember(note, item.line);
				break;
			}
		}
	}

	if (memberCount === 0) {
		warn("No notes are included yet. Add - [[Note]] or {{bv:include …}} lines inside the {{bookContent}} block.");
	}
	return { segments, diagnostics, memberCount };
}
