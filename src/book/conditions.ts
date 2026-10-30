/**
 * Property conditions for `{{bv:include where="…" unless="…"}}`, matched
 * against a note's frontmatter. A condition is `key: value`, `key: a | b`
 * (either value), or a bare `key` (the property is set and not false).
 */
export interface PropertyCondition {
	/** The condition as written, for messages. */
	readonly source: string;
	readonly key: string;
	/** Accepted values, normalized; empty means "is set". */
	readonly values: readonly string[];
}

const TAG_KEYS = new Set(["tags", "tag"]);
const WIKILINK = /^\[\[([^\]|#^]+)(?:[#^|][^\]]*)?\]\]$/;

/** Parses one `where` or `unless` value: conditions separated by commas. */
export function parseConditions(
	setting: string,
	value: string,
	problems: string[]
): PropertyCondition[] {
	const conditions: PropertyCondition[] = [];
	for (const raw of value.split(",")) {
		const source = raw.trim();
		if (!source) continue;
		const separator = source.search(/[:=]/);
		const key = (separator === -1 ? source : source.slice(0, separator)).trim();
		if (!key) {
			problems.push(`${setting} condition "${source}" has no property name. Write it as property: value.`);
			continue;
		}
		const values =
			separator === -1
				? []
				: source
						.slice(separator + 1)
						.split("|")
						.map((part) => normalizeValue(key, part))
						.filter(Boolean);
		conditions.push({ source, key, values });
	}
	return conditions;
}

/** True when the note's frontmatter satisfies the condition. */
export function matchesCondition(
	frontmatter: Readonly<Record<string, unknown>>,
	condition: PropertyCondition
): boolean {
	const actual = propertyValues(frontmatter, condition.key);
	if (condition.values.length === 0) return actual.some((value) => value !== "false");
	return actual.some((value) => condition.values.some((wanted) => valueMatches(condition.key, value, wanted)));
}

/** A property's values as normalized strings; lists give one entry per item. */
function propertyValues(frontmatter: Readonly<Record<string, unknown>>, key: string): string[] {
	const lowerKey = key.toLowerCase();
	const actualKey = Object.keys(frontmatter).find((candidate) => candidate.toLowerCase() === lowerKey);
	if (actualKey === undefined) return [];
	const isTags = TAG_KEYS.has(lowerKey);
	return flatten(frontmatter[actualKey])
		.flatMap((value) => (isTags ? value.split(/[,\s]+/) : [value]))
		.map((value) => normalizeValue(key, value))
		.filter(Boolean);
}

function flatten(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(flatten);
	if (typeof value === "string") return [value];
	if (typeof value === "number" || typeof value === "boolean") return [String(value)];
	return [];
}

/**
 * Case-insensitive, with links reduced to their target and yes/no/on/off read
 * as true/false. Tags lose their leading `#`.
 */
function normalizeValue(key: string, value: string): string {
	let normalized = value.trim();
	const link = WIKILINK.exec(normalized);
	if (link) normalized = link[1].trim();
	normalized = normalized.toLowerCase();
	if (TAG_KEYS.has(key.toLowerCase())) normalized = normalized.replace(/^#/, "");
	if (/^(true|yes|on)$/.test(normalized)) return "true";
	if (/^(false|no|off)$/.test(normalized)) return "false";
	return normalized;
}

/**
 * Exact match, plus: a nested tag matches its parent (`llynwych/monster`
 * matches `llynwych`), and a link with a folder matches its note name.
 */
function valueMatches(key: string, actual: string, wanted: string): boolean {
	if (actual === wanted) return true;
	if (TAG_KEYS.has(key.toLowerCase())) return actual.startsWith(`${wanted}/`);
	return !wanted.includes("/") && actual.endsWith(`/${wanted}`);
}
