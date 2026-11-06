import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewMarkdown } from "../src/renderer";
import { renderStatBlockHtml } from "../src/statblock/html";
import { abilityModifier, challengeExperience, proficiencyBonus } from "../src/statblock/model";
import { parseStatBlock } from "../src/statblock/parse";
import { serializeStatBlock } from "../src/statblock/serialize";

const TAOTIE = `layout: Basic 5e Layout
image:
name: "Taotie"
size: Huge
type: Construct
subtype:
alignment: "Lawful Evil or Neutral Evil"
ac: 13
hp: 160
hit_dice: 14d12 + 70
speed: "40 ft."
stats: [24, 9, 21, 3, 11, 12]
saves:
  - constitution: 8
skillsaves:
  - perception: 3
  - stealth: -1
damage_resistances: "Bludgeoning, Piercing, and Slashing"
condition_immunities: "Charmed"
senses: "darkvision 60 ft., passive Perception 10"
languages: "—"
cr: 7
traits:
  - name: "Hunger Aura"
    desc: "Creatures nearby are drained."
actions:
  - name: "Gore"
    desc: "Melee Weapon Attack: +10 to hit. Hit: 25 (4d8 + 7) Piercing damage."
  - name: "Stomp."
    desc: "Melee Weapon Attack: +10 to hit."
bonus_actions:
  -
reactions:
legendary_description: "The taotie can take 2 Legendary Actions."
legendary_actions:
  - name: "Stomp"
    desc: "The taotie makes one Stomp attack."
`;

function parseOk(source: string) {
	const result = parseStatBlock(source);
	assert.equal(result.ok, true, result.ok ? "" : result.errors.join("; "));
	if (!result.ok) throw new Error("unreachable");
	return result;
}

void test("derived values follow the 5e tables", () => {
	assert.equal(abilityModifier(24), 7);
	assert.equal(abilityModifier(9), -1);
	assert.equal(abilityModifier(3), -4);
	assert.equal(proficiencyBonus(0), 2);
	assert.equal(proficiencyBonus(4), 2);
	assert.equal(proficiencyBonus(5), 3);
	assert.equal(proficiencyBonus(16), 5);
	assert.equal(proficiencyBonus(30), 9);
	assert.equal(challengeExperience(0.5), 100);
	assert.equal(challengeExperience(7), 2900);
	assert.equal(challengeExperience(31), null);
});

void test("parses a Fantasy Statblocks style block and ignores layout keys", () => {
	const { block, edition } = parseOk(TAOTIE);
	assert.equal(block.name, "Taotie");
	assert.deepEqual(block.scores, [24, 9, 21, 3, 11, 12]);
	assert.deepEqual(block.saves, [{ ability: "con", bonus: 8 }]);
	assert.deepEqual(block.skills, [
		{ name: "Perception", bonus: 3 },
		{ name: "Stealth", bonus: -1 },
	]);
	assert.equal(block.cr, "7");
	assert.equal(block.actions.length, 2);
	assert.equal(block.bonusActions.length, 0, "blank list items are dropped");
	assert.equal(block.reactions.length, 0, "an empty key means no entries");
	assert.equal(edition, null);
});

void test("fractional challenge ratings keep their written form", () => {
	assert.equal(parseOk("name: A\ncr: 0.5").block.cr, "1/2");
	assert.equal(parseOk("name: A\ncr: 0.125").block.cr, "1/8");
	assert.equal(parseOk('name: A\ncr: "1/4"').block.cr, "1/4");
});

void test("the same data prints in the 2014 layout", () => {
	const markdown = serializeStatBlock(parseOk(TAOTIE).block, "2014");

	assert.match(markdown, /^\{\{monster,frame\n## Taotie\n\*Huge construct, lawful evil or neutral evil\*\n___/);
	assert.match(markdown, /\*\*Armor Class\*\* :: 13\n\*\*Hit Points\*\* :: 160 \(14d12 \+ 70\)/);
	assert.match(markdown, /\|[ ]{2}STR[ ]{2}\|/);
	assert.match(markdown, /\|24 \(\+7\)\|9 \(-1\)\|21 \(\+5\)\|3 \(-4\)\|11 \(\+0\)\|12 \(\+1\)\|/);
	assert.match(markdown, /\*\*Saving Throws\*\* :: Con \+8/);
	assert.match(markdown, /\*\*Skills\*\* :: Perception \+3, Stealth -1/);
	assert.match(markdown, /\*\*Challenge\*\* :: 7 \(2,900 XP\) \{\{bonus \*\*Proficiency Bonus\*\* \+3\}\}/);
	assert.doesNotMatch(markdown, /### Traits/, "2014 traits are unheaded");
	assert.match(markdown, /### Actions\n\*\*\*Gore\.\*\*\* Melee Weapon Attack/);
	assert.match(markdown, /\*\*\*Stomp\.\*\*\*/, "a name already ending in a period gets no second one");
	assert.match(markdown, /### Legendary Actions\nThe taotie can take 2 Legendary Actions\.\n:\n\*\*\*Stomp\.\*\*\*/);
	assert.doesNotMatch(markdown, /### Bonus Actions|### Reactions/, "empty sections are omitted");
});

void test("the same data prints in the 2024 layout", () => {
	const markdown = serializeStatBlock(parseOk(TAOTIE).block, "2024");

	assert.match(markdown, /\n\*Huge Construct, Lawful Evil or Neutral Evil\*\n/);
	assert.match(markdown, /\*\*AC\*\* :: 13 \{\{bonus \*\*Initiative\*\* −1 \(9\)\}\}/);
	assert.match(markdown, /\*\*HP\*\* :: 160 \(14d12 \+ 70\)/);
	assert.match(markdown, /\| Str \| 24 \| \+7 \| \+7 \| Dex \| 9 \| −1 \| −1 \| Con \| 21 \| \+5 \| \+8 \|/);
	assert.match(markdown, /\| Int \| 3 \| −4 \| −4 \| Wis \| 11 \| \+0 \| \+0 \| Cha \| 12 \| \+1 \| \+1 \|/);
	assert.doesNotMatch(markdown, /Saving Throws/, "2024 folds saves into the table");
	assert.match(markdown, /\*\*Resistances\*\* :: Bludgeoning/);
	assert.match(markdown, /\*\*Immunities\*\* :: Charmed/);
	assert.match(markdown, /\*\*CR\*\* :: 7 \(XP 2,900; PB \+3\)/);
	assert.match(markdown, /### Traits\n\*\*\*Hunger Aura\.\*\*\*/);
});

void test("2024 joins damage and condition immunities", () => {
	const { block } = parseOk("name: A\ncr: 1\ndamage_immunities: Poison\ncondition_immunities: Charmed");
	assert.match(serializeStatBlock(block, "2024"), /\*\*Immunities\*\* :: Poison; Charmed/);
	const old = serializeStatBlock(block, "2014");
	assert.match(old, /\*\*Damage Immunities\*\* :: Poison/);
	assert.match(old, /\*\*Condition Immunities\*\* :: Charmed/);
});

void test("an edition key in the block overrides the default edition", () => {
	const source = `${TAOTIE}edition: 2014\n`;
	assert.equal(parseOk(source).edition, "2014");

	const render = (markdown: string): string => markdown;
	assert.match(renderStatBlockHtml(source, "2024", render).html, /\*\*Armor Class\*\*/);
	assert.match(renderStatBlockHtml(TAOTIE, "2024", render).html, /\*\*AC\*\*/);
	assert.match(renderStatBlockHtml(source, "2024", render, "2024").html, /\*\*AC\*\*/, "the toggle wins");
});

void test("an unknown edition is ignored with a warning", () => {
	const result = parseOk("name: A\ncr: 1\nedition: 5");
	assert.equal(result.edition, null);
	assert.equal(result.warnings.length, 1);
});

void test("invalid blocks report problems instead of throwing", () => {
	for (const source of [
		"name: [unclosed",
		"- just\n- a list",
		"name: A\nstats: [1, 2, 3]",
		"name: A\nstats: [10, 10, 10, 10, 10, abc]",
		"name: A\nsaves:\n  - luck: 3",
		"name: A\nactions: not-a-list",
		"name: A\ncr: -3",
	]) {
		const result = parseStatBlock(source);
		assert.equal(result.ok, false, source);
		if (!result.ok) assert.ok(result.errors.length > 0);
	}
	assert.equal(parseStatBlock("x".repeat(200_000)).ok, false);
	assert.equal(parseStatBlock("a: &x [1]\nb: *x").ok, false, "aliases are refused");
});

void test("a description cannot close the monster block or start a new page", () => {
	const { block } = parseOk(
		['name: A', 'cr: 1', 'actions:', '  - name: Trick', '    desc: |', '      First line.', '      }}', '      \\page', '      {{note', '      Last line.'].join("\n")
	);
	const markdown = serializeStatBlock(block, "2014");
	const lines = markdown.split("\n");
	assert.equal(lines.filter((line) => line.trim() === "}}").length, 1, "only the final close remains");
	assert.ok(!lines.some((line) => line.trim() === "\\page"));
	assert.ok(!lines.some((line) => /^\{\{[a-z]+$/.test(line.trim()) && line.trim() !== "{{monster,frame"));

	const pages = renderBrewMarkdown(`\`\`\`statblock\n${["name: A", "cr: 1", "actions:", "  - name: Trick", "    desc: |", "      }}", "      \\page"].join("\n")}\n\`\`\``);
	assert.equal(pages.length, 1);
});

void test("statblock fences render as monster blocks in the note's edition", () => {
	const note = `# Bestiary\n\n\`\`\`statblock\n${TAOTIE}\`\`\`\n\nAfter.`;
	const html2014 = renderBrewMarkdown(note, { statblockEdition: "2014" }).map((page) => page.html).join("");
	const html2024 = renderBrewMarkdown(note, { statblockEdition: "2024" }).map((page) => page.html).join("");

	for (const html of [html2014, html2024]) {
		assert.match(html, /class="brewBlock monster brew-monster frame brew-frame"/);
		assert.match(html, /<h2>Taotie<\/h2>/);
		assert.match(html, /<p>After\.<\/p>/);
		assert.doesNotMatch(html, /<code|<pre|layout: Basic/);
	}
	assert.match(html2014, /Armor Class/);
	assert.match(html2024, /<strong>AC<\/strong>/);
	assert.match(html2024, /Initiative/);
});

void test("statblock errors render as a visible message, never raw YAML", () => {
	const html = renderBrewMarkdown("```statblock\nname: A\nstats: [1]\n```")
		.map((page) => page.html)
		.join("");
	assert.match(html, /class="brewvault-statblock-error"/);
	assert.match(html, /six ability scores/);
	assert.doesNotMatch(html, /<script|<img/);
});

void test("other code fences are left alone", () => {
	const html = renderBrewMarkdown("```js\nconst a = 1;\n```\n\n```\nplain\n```")
		.map((page) => page.html)
		.join("");
	assert.match(html, /<pre><code class="language-js">const a = 1;/);
	assert.match(html, /<pre><code>plain/);
});

void test("markup in names and descriptions is escaped by the renderer", () => {
	const html = renderBrewMarkdown('```statblock\nname: "<img src=x onerror=1>"\ncr: 1\n```')
		.map((page) => page.html)
		.join("");
	assert.doesNotMatch(html, /<img/);
});
