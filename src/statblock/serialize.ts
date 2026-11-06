import type { Edition } from "../snippets/catalog";
import {
	ABILITIES,
	abilityModifier,
	challengeExperience,
	parseChallengeRating,
	proficiencyBonus,
	type Ability,
	type StatBlock,
	type StatEntry,
} from "./model";

/** Zero-width space entity: stops a line from being read as layout syntax. */
const DEFUSE = "&#8203;";
const LAYOUT_LINE = /^(\}\}|\{\{[a-zA-Z]|\\page\b|\\column\b)/;

/**
 * Prints a stat block as Homebrewery monster markup in the chosen edition. The
 * markup goes through the same renderer as hand-written blocks, so themes,
 * framing, pagination and PDF export all treat it identically.
 *
 * User text is kept as Markdown (descriptions may use emphasis) but cannot
 * close the surrounding `{{monster}}` container or start a page or column.
 */
export function serializeStatBlock(block: StatBlock, edition: Edition): string {
	const lines: string[] = ["{{monster,frame", `## ${singleLine(block.name)}`];
	const subtitle = subtitleLine(block, edition);
	if (subtitle) lines.push(`*${subtitle}*`);
	lines.push("___");

	if (edition === "2024") pushCore2024(lines, block);
	else pushCore2014(lines, block);

	lines.push("___");
	pushEntrySections(lines, block, edition);
	lines.push("}}", "");
	return lines.join("\n");
}

function pushCore2014(lines: string[], block: StatBlock): void {
	lines.push(
		field("Armor Class", block.ac),
		field("Hit Points", block.hitDice ? `${block.hp} (${block.hitDice})` : block.hp),
		field("Speed", block.speed),
		"___",
		"|  STR  |  DEX  |  CON  |  INT  |  WIS  |  CHA  |",
		"|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|",
		`|${block.scores.map((score) => `${score} (${formatModifier(abilityModifier(score), "2014")})`).join("|")}|`,
		"___"
	);

	const saves = block.saves.map(
		(save) => `${capitalize(save.ability)} ${formatModifier(save.bonus, "2014")}`
	);
	const skills = block.skills.map((skill) => `${skill.name} ${formatModifier(skill.bonus, "2014")}`);
	pushOptional(lines, "Saving Throws", saves.join(", "));
	pushOptional(lines, "Skills", skills.join(", "));
	pushOptional(lines, "Damage Vulnerabilities", block.damageVulnerabilities);
	pushOptional(lines, "Damage Resistances", block.damageResistances);
	pushOptional(lines, "Damage Immunities", block.damageImmunities);
	pushOptional(lines, "Condition Immunities", block.conditionImmunities);
	pushOptional(lines, "Senses", block.senses);
	lines.push(field("Languages", block.languages || "—"));

	const cr = parseChallengeRating(block.cr);
	const xp = cr === null ? null : challengeExperience(cr);
	lines.push(
		cr !== null && xp !== null
			? `**Challenge** :: ${singleLine(block.cr)} (${formatNumber(xp)} XP) {{bonus **Proficiency Bonus** +${proficiencyBonus(cr)}}}`
			: field("Challenge", block.cr)
	);
}

function pushCore2024(lines: string[], block: StatBlock): void {
	const dexModifier = abilityModifier(block.scores[1]);
	lines.push(
		`**AC** :: ${singleLine(block.ac)} {{bonus **Initiative** ${formatModifier(dexModifier, "2024")} (${10 + dexModifier})}}`,
		field("HP", block.hitDice ? `${block.hp} (${block.hitDice})` : block.hp),
		field("Speed", block.speed),
		"___",
		"|     |    | MOD | SAVE |     |    | MOD | SAVE |     |    | MOD | SAVE |",
		"|:----|:--:|:---:|:----:|:----|:--:|:---:|:----:|:----|:--:|:---:|:----:|"
	);
	for (const row of [ABILITIES.slice(0, 3), ABILITIES.slice(3)]) {
		lines.push(`| ${row.map((ability) => abilityCells2024(block, ability)).join(" | ")} |`);
	}
	lines.push("___");

	const skills = block.skills.map((skill) => `${skill.name} ${formatModifier(skill.bonus, "2024")}`);
	const immunities = [block.damageImmunities, block.conditionImmunities].filter(Boolean).join("; ");
	pushOptional(lines, "Skills", skills.join(", "));
	pushOptional(lines, "Resistances", block.damageResistances);
	pushOptional(lines, "Vulnerabilities", block.damageVulnerabilities);
	pushOptional(lines, "Immunities", immunities);
	pushOptional(lines, "Senses", block.senses);
	lines.push(field("Languages", block.languages || "None"));

	const cr = parseChallengeRating(block.cr);
	const xp = cr === null ? null : challengeExperience(cr);
	lines.push(
		cr !== null && xp !== null
			? field("CR", `${block.cr} (XP ${formatNumber(xp)}; PB +${proficiencyBonus(cr)})`)
			: field("CR", block.cr)
	);
}

function abilityCells2024(block: StatBlock, ability: Ability): string {
	const score = block.scores[ABILITIES.indexOf(ability)];
	const modifier = abilityModifier(score);
	const save = block.saves.find((candidate) => candidate.ability === ability);
	const modifierText = formatModifier(modifier, "2024");
	const saveText = formatModifier(save ? save.bonus : modifier, "2024");
	return `${capitalize(ability)} | ${score} | ${modifierText} | ${saveText}`;
}

function pushEntrySections(lines: string[], block: StatBlock, edition: Edition): void {
	const untitledTraits = [...block.traits, ...block.spells];
	// 2014 prints traits straight after the stat bar; 2024 gives them a heading.
	pushSection(lines, edition === "2024" ? "Traits" : null, untitledTraits);
	pushSection(lines, "Actions", block.actions);
	pushSection(lines, "Bonus Actions", block.bonusActions);
	pushSection(lines, "Reactions", block.reactions);

	const legendaryIntro = block.legendaryDescription ? [defuse(block.legendaryDescription)] : [];
	pushSection(lines, "Legendary Actions", block.legendaryActions, legendaryIntro);
	pushSection(lines, "Lair Actions", block.lairActions);
}

function pushSection(
	lines: string[],
	heading: string | null,
	entries: readonly StatEntry[],
	intro: readonly string[] = []
): void {
	if (entries.length === 0 && intro.length === 0) return;
	if (heading) lines.push(`### ${heading}`);
	lines.push(...intro);
	entries.forEach((entry, index) => {
		if (index > 0 || intro.length > 0) lines.push(":");
		lines.push(formatEntry(entry));
	});
}

function formatEntry(entry: StatEntry): string {
	const desc = defuse(entry.desc);
	const name = singleLine(entry.name);
	if (!name) return desc;
	const title = /[.!?]$/.test(name) ? name : `${name}.`;
	return desc ? `***${title}*** ${desc}` : `***${title}***`;
}

function subtitleLine(block: StatBlock, edition: Edition): string {
	const form = edition === "2024" ? titleCase : (value: string) => value.toLowerCase();
	const type = block.subtype
		? `${form(block.type)} (${form(block.subtype)})`
		: form(block.type);
	const kind = [singleLine(block.size), singleLine(type)].filter(Boolean).join(" ");
	const alignment = singleLine(form(block.alignment));
	return [kind, alignment].filter(Boolean).join(", ");
}

const LOWERCASE_WORDS = new Set(["or", "and", "of", "any"]);

function titleCase(value: string): string {
	return value
		.split(/(\s+)/)
		.map((part, index) =>
			index > 0 && LOWERCASE_WORDS.has(part.toLowerCase())
				? part.toLowerCase()
				: part.replace(/^./, (first) => first.toUpperCase())
		)
		.join("");
}

function capitalize(value: string): string {
	return value.replace(/^./, (first) => first.toUpperCase());
}

function formatModifier(value: number, edition: Edition): string {
	if (value >= 0) return `+${value}`;
	return `${edition === "2024" ? "−" : "-"}${Math.abs(value)}`;
}

function formatNumber(value: number): string {
	return value.toLocaleString("en-US");
}

function field(label: string, value: string): string {
	return `**${label}** :: ${singleLine(value) || "—"}`;
}

function pushOptional(lines: string[], label: string, value: string): void {
	if (value.trim()) lines.push(field(label, value));
}

/** Collapses whitespace so a value stays on one Markdown line. */
function singleLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

/** Keeps paragraphs, but stops any line acting as a container or page marker. */
function defuse(value: string): string {
	return value
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.map((line) => (LAYOUT_LINE.test(line.trim()) ? `${DEFUSE}${line}` : line))
		.join("\n")
		.trim();
}
