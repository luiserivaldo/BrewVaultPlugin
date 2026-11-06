/**
 * Edition-neutral monster data. A `statblock` code block is parsed into this
 * model once; the 2014 and 2024 layouts are only two ways of printing it, so
 * switching edition never needs a different source format.
 */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_NAMES: Readonly<Record<Ability, string>> = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

/** One named ability, such as a trait or an action. */
export interface StatEntry {
	readonly name: string;
	readonly desc: string;
}

export interface StatSkill {
	readonly name: string;
	readonly bonus: number;
}

export interface StatBlock {
	readonly name: string;
	readonly size: string;
	readonly type: string;
	readonly subtype: string;
	readonly alignment: string;
	readonly ac: string;
	readonly hp: string;
	readonly hitDice: string;
	readonly speed: string;
	/** Ability scores in STR, DEX, CON, INT, WIS, CHA order. */
	readonly scores: readonly [number, number, number, number, number, number];
	/** Total saving throw bonuses of proficient abilities, in source order. */
	readonly saves: readonly { readonly ability: Ability; readonly bonus: number }[];
	readonly skills: readonly StatSkill[];
	readonly damageVulnerabilities: string;
	readonly damageResistances: string;
	readonly damageImmunities: string;
	readonly conditionImmunities: string;
	readonly senses: string;
	readonly languages: string;
	/** Challenge rating as written, such as `1/2` or `16`. */
	readonly cr: string;
	readonly traits: readonly StatEntry[];
	readonly spells: readonly StatEntry[];
	readonly actions: readonly StatEntry[];
	readonly bonusActions: readonly StatEntry[];
	readonly reactions: readonly StatEntry[];
	readonly legendaryDescription: string;
	readonly legendaryActions: readonly StatEntry[];
	readonly lairActions: readonly StatEntry[];
}

export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/** Challenge rating to a number, or `null` for text that is not a rating. */
export function parseChallengeRating(cr: string): number | null {
	const text = cr.trim();
	const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
	if (fraction) {
		const denominator = Number(fraction[2]);
		return denominator === 0 ? null : Number(fraction[1]) / denominator;
	}
	if (!/^\d+(\.\d+)?$/.test(text)) return null;
	return Number(text);
}

const XP_BY_CR: Readonly<Record<string, number>> = {
	"0": 10, "0.125": 25, "0.25": 50, "0.5": 100,
	"1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900,
	"8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000,
	"14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000,
	"19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
	"24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000,
	"29": 135000, "30": 155000,
};

/** Experience points for a challenge rating, or `null` outside the 0–30 table. */
export function challengeExperience(cr: number): number | null {
	return XP_BY_CR[String(cr)] ?? null;
}

export function proficiencyBonus(cr: number): number {
	return Math.max(2, Math.ceil(cr / 4) + 1);
}
