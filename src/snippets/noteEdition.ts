import { isEdition, type Edition } from "./catalog";

/** Frontmatter key that sets the default rules edition for one note. */
export const NOTE_EDITION_PROPERTY = "bv_edition";

export type NoteEditionResolution =
	| { kind: "none" }
	| { kind: "edition"; edition: Edition }
	| { kind: "invalid"; value: string };

/**
 * Reads `bv_edition` from untrusted frontmatter. YAML reads `2024` as a
 * number, so numbers and text are both accepted.
 */
export function resolveNoteEdition(frontmatter: unknown): NoteEditionResolution {
	if (typeof frontmatter !== "object" || frontmatter === null) return { kind: "none" };
	const value = (frontmatter as Record<string, unknown>)[NOTE_EDITION_PROPERTY];
	if (value === undefined || value === null) return { kind: "none" };

	const text = typeof value === "number" ? String(value) : value;
	if (typeof text === "string") {
		const trimmed = text.trim();
		if (!trimmed) return { kind: "none" };
		if (isEdition(trimmed)) return { kind: "edition", edition: trimmed };
		return { kind: "invalid", value: trimmed };
	}
	return { kind: "invalid", value: JSON.stringify(value) };
}
