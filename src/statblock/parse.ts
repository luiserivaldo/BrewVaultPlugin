import { parse as parseYaml } from "yaml";
import { isEdition, type Edition } from "../snippets/catalog";
import {
	ABILITIES,
	type Ability,
	type StatBlock,
	type StatEntry,
	type StatSkill,
} from "./model";

/** Largest `statblock` source accepted; real stat blocks are a few KB. */
export const MAX_STATBLOCK_SOURCE_LENGTH = 100_000;

export type StatBlockParseResult =
	| {
			readonly ok: true;
			readonly block: StatBlock;
			/** Edition the block asks for with an `edition` key, if any. */
			readonly edition: Edition | null;
			readonly warnings: readonly string[];
	  }
	| { readonly ok: false; readonly errors: readonly string[] };

/**
 * Parses the YAML inside a `statblock` code block. The input is untrusted note
 * text, so every field is checked here and unknown keys (such as Fantasy
 * Statblocks' `layout` and `image`) are ignored rather than rejected.
 */
export function parseStatBlock(source: string): StatBlockParseResult {
	if (source.length > MAX_STATBLOCK_SOURCE_LENGTH) {
		return { ok: false, errors: ["The stat block is too large to render."] };
	}

	let raw: unknown;
	try {
		// Aliases are never needed here and are how YAML bombs expand.
		raw = parseYaml(source, { maxAliasCount: 0 });
	} catch (error) {
		const message = error instanceof Error ? error.message.split("\n")[0] : "Invalid YAML.";
		return { ok: false, errors: [`Invalid YAML: ${message}`] };
	}
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return { ok: false, errors: ["A stat block must be a list of `key: value` fields."] };
	}

	const data = raw as Record<string, unknown>;
	const errors: string[] = [];
	const warnings: string[] = [];

	const text = (key: string, fallback = ""): string => {
		const value = data[key];
		if (value === undefined || value === null) return fallback;
		if (typeof value === "string") return value.trim();
		if (typeof value === "number" || typeof value === "boolean") return String(value);
		errors.push(`\`${key}\` must be text or a number.`);
		return fallback;
	};

	const entries = (key: string): StatEntry[] => readEntries(data[key], key, errors);

	const block: StatBlock = {
		name: text("name") || "Unnamed creature",
		size: text("size"),
		type: text("type"),
		subtype: text("subtype"),
		alignment: text("alignment"),
		ac: text("ac", "—"),
		hp: text("hp", "—"),
		hitDice: text("hit_dice"),
		speed: text("speed", "—"),
		scores: readScores(data.stats, errors),
		saves: readSaves(data.saves, errors),
		skills: readSkills(data.skillsaves, errors),
		damageVulnerabilities: text("damage_vulnerabilities"),
		damageResistances: text("damage_resistances"),
		damageImmunities: text("damage_immunities"),
		conditionImmunities: text("condition_immunities"),
		senses: text("senses"),
		languages: text("languages"),
		cr: readChallengeRating(data.cr, errors),
		traits: entries("traits"),
		spells: entries("spells"),
		actions: entries("actions"),
		bonusActions: entries("bonus_actions"),
		reactions: entries("reactions"),
		legendaryDescription: text("legendary_description"),
		legendaryActions: entries("legendary_actions"),
		lairActions: entries("lair_actions"),
	};

	if (errors.length > 0) return { ok: false, errors };

	let edition: Edition | null = null;
	const rawEdition = data.edition;
	if (rawEdition !== undefined && rawEdition !== null) {
		const candidate = scalarText(rawEdition) ?? "";
		if (isEdition(candidate)) edition = candidate;
		else warnings.push(`Ignored \`edition: ${candidate}\`; use 2014 or 2024.`);
	}

	return { ok: true, block, edition, warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalarText(value: unknown): string | null {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return null;
}

function toNumber(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) return Number(value.trim());
	return null;
}

function readEntries(value: unknown, key: string, errors: string[]): StatEntry[] {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) {
		errors.push(`\`${key}\` must be a list.`);
		return [];
	}
	const result: StatEntry[] = [];
	for (const item of value as unknown[]) {
		// Blank list items (`-`) are how the empty template marks unused rows.
		if (item === null || item === undefined) continue;
		if (isRecord(item)) {
			const name = scalarText(item.name) ?? "";
			const desc = scalarText(item.desc) ?? "";
			if (name || desc) result.push({ name, desc });
			continue;
		}
		const asText = scalarText(item);
		if (asText === null) {
			errors.push(`\`${key}\` has an item that is not text or a name/desc pair.`);
		} else if (asText) {
			result.push({ name: "", desc: asText });
		}
	}
	return result;
}

function readScores(value: unknown, errors: string[]): StatBlock["scores"] {
	if (value === undefined || value === null) return [10, 10, 10, 10, 10, 10];
	if (!Array.isArray(value) || value.length !== 6) {
		errors.push("`stats` must be six ability scores: [STR, DEX, CON, INT, WIS, CHA].");
		return [10, 10, 10, 10, 10, 10];
	}
	const numbers = (value as unknown[]).map(toNumber);
	if (numbers.some((score) => score === null || score < 0 || score > 99)) {
		errors.push("`stats` scores must be whole numbers from 0 to 99.");
		return [10, 10, 10, 10, 10, 10];
	}
	const [str, dex, con, int, wis, cha] = numbers as number[];
	return [str, dex, con, int, wis, cha];
}

/** Single-key maps (`- dexterity: 5`) or one map, flattened to pairs. */
function readPairs(value: unknown, key: string, errors: string[]): [string, unknown][] {
	if (value === undefined || value === null) return [];
	const items = Array.isArray(value) ? (value as unknown[]) : [value];
	const pairs: [string, unknown][] = [];
	for (const item of items) {
		if (item === null || item === undefined) continue;
		if (!isRecord(item)) {
			errors.push(`\`${key}\` must be a list of \`name: bonus\` pairs.`);
			return [];
		}
		pairs.push(...Object.entries(item));
	}
	return pairs;
}

function readSaves(value: unknown, errors: string[]): StatBlock["saves"] {
	const saves: { ability: Ability; bonus: number }[] = [];
	for (const [name, rawBonus] of readPairs(value, "saves", errors)) {
		const ability = ABILITIES.find((candidate) => candidate === name.trim().slice(0, 3).toLowerCase());
		const bonus = toNumber(rawBonus);
		if (!ability || bonus === null) {
			errors.push(`\`saves\` entry "${name}" needs an ability name and a whole-number bonus.`);
			continue;
		}
		saves.push({ ability, bonus });
	}
	return saves;
}

function readSkills(value: unknown, errors: string[]): StatSkill[] {
	const skills: StatSkill[] = [];
	for (const [name, rawBonus] of readPairs(value, "skillsaves", errors)) {
		const bonus = toNumber(rawBonus);
		if (!name.trim() || bonus === null) {
			errors.push(`\`skillsaves\` entry "${name}" needs a skill name and a whole-number bonus.`);
			continue;
		}
		skills.push({ name: name.trim().replace(/^./, (first) => first.toUpperCase()), bonus });
	}
	return skills;
}

const FRACTIONAL_CR: Readonly<Record<string, string>> = { "0.125": "1/8", "0.25": "1/4", "0.5": "1/2" };

function readChallengeRating(value: unknown, errors: string[]): string {
	if (value === undefined || value === null) return "0";
	if (typeof value === "number") {
		if (!Number.isFinite(value) || value < 0) {
			errors.push("`cr` must be a challenge rating such as 1/2 or 16.");
			return "0";
		}
		return FRACTIONAL_CR[String(value)] ?? String(value);
	}
	if (typeof value === "string") return value.trim() || "0";
	errors.push("`cr` must be a challenge rating such as 1/2 or 16.");
	return "0";
}
