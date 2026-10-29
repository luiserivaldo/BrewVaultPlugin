/**
 * Insertable Homebrewery V3 snippets, adapted from the MIT-licensed
 * Homebrewery snippet menus (themes/V3/Blank and themes/V3/5ePHB).
 *
 * Upstream generators randomize names and numbers on every insertion; these
 * bodies are fixed so inserted Markdown is predictable and testable. Each
 * entry keeps Homebrewery's markup structure and block classes, and only uses
 * syntax that BrewVault's renderer and bundled theme CSS already support.
 * Snippets that need unsupported renderer features or remote assets are
 * tracked in MILESTONES.md (P7a) rather than shipped half-working.
 *
 * Edition-sensitive blocks come in 2014 and 2024 variants sharing a family.
 * The 2024 field order and labels follow the SRD 5.2.1 layouts recorded in
 * docs/DND_BLOCK_FORMATS.md; names and prose are original placeholders, never
 * copied rules text.
 */

export type SnippetGroup = "text" | "phb" | "tables";

export type Edition = "2014" | "2024";
export const EDITIONS: readonly Edition[] = ["2014", "2024"];

export function isEdition(value: unknown): value is Edition {
	return value === "2014" || value === "2024";
}

export interface BrewSnippet {
	/** Stable identifier; never reuse an id for different content. */
	id: string;
	group: SnippetGroup;
	/** Menu label, matching Homebrewery's wording. */
	name: string;
	/** Obsidian (Lucide) icon id shown in the picker. */
	icon: string;
	/** Markdown inserted at the cursor. Always starts and ends on a line boundary. */
	body: string;
	/** Rules edition this layout follows; absent for edition-neutral blocks. */
	edition?: Edition;
	/**
	 * Shared by a block's 2014 and 2024 variants, so a default-edition command
	 * can pick the right one. Set exactly when `edition` is set.
	 */
	family?: string;
}

export const SNIPPET_GROUP_LABELS: Readonly<Record<SnippetGroup, string>> = {
	text: "Text editor",
	phb: "PHB",
	tables: "Tables",
};

const MONSTER_BODY = (classes: string): string => `{{${classes}
## Cave Lurker
*Medium monstrosity, unaligned*
___
**Armor Class** :: 13 (natural armor)
**Hit Points**  :: 27 (5d8 + 5)
**Speed**       :: 30 ft., climb 30 ft.
___
|  STR  |  DEX  |  CON  |  INT  |  WIS  |  CHA  |
|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
|14 (+2)|15 (+2)|12 (+1)| 3 (-4)|12 (+1)| 6 (-2)|
___
**Skills**    :: Stealth +4
**Senses**    :: darkvision 60 ft., passive Perception 11
**Languages** :: —
**Challenge** :: 1 (200 XP) {{bonus **Proficiency Bonus** +2}}
___
***Spider Climb.*** The lurker can climb difficult surfaces, including ceilings, without needing to make an ability check.
:
***Ambusher.*** In the first round of combat, the lurker has advantage on attack rolls against any creature it surprised.
### Actions
***Bite.*** *Melee Weapon Attack:* +4 to hit, reach 5 ft., one target. *Hit:* 6 (1d8 + 2) piercing damage.
}}
`;

const MARTIAL_CLASS_TABLE_BODY = (classes: string): string => `{{${classes}
##### The Wayfarer
| Level | Proficiency Bonus | Features              | Trail Dice |
|:-----:|:-----------------:|:----------------------|:----------:|
|  1st  |  +2  | Trailcraft, Keen Eye   |     2     |
|  2nd  |  +2  | Quick Step             |     2     |
|  3rd  |  +2  | Wayfarer Path          |     3     |
|  4th  |  +2  | Ability Score Increase |     3     |
|  5th  |  +3  | Extra Attack           |     3     |
|  6th  |  +3  | Path Feature           |     4     |
|  7th  |  +3  | Evasion                |     4     |
|  8th  |  +3  | Ability Score Increase |     4     |
|  9th  |  +4  | Long Stride            |     4     |
| 10th  |  +4  | Path Feature           |     4     |
| 11th  |  +4  | Relentless             |     4     |
| 12th  |  +4  | Ability Score Increase |     5     |
| 13th  |  +5  | Unerring Path          |     5     |
| 14th  |  +5  | Path Feature           |     5     |
| 15th  |  +5  | Tireless               |     5     |
| 16th  |  +5  | Ability Score Increase |     5     |
| 17th  |  +6  | Master Wayfarer        |     6     |
| 18th  |  +6  | Path Feature           |     6     |
| 19th  |  +6  | Ability Score Increase |     6     |
| 20th  |  +6  | Endless Road           | unlimited |
}}
`;

const MONSTER_2024_BODY = (classes: string): string => `{{${classes}
## Cave Lurker
*Medium Monstrosity, Unaligned*
___
**AC**    :: 13 {{bonus **Initiative** +2 (12)}}
**HP**    :: 27 (5d8 + 5)
**Speed** :: 30 ft., Climb 30 ft.
___
|     |    | MOD | SAVE |     |    | MOD | SAVE |     |    | MOD | SAVE |
|:----|:--:|:---:|:----:|:----|:--:|:---:|:----:|:----|:--:|:---:|:----:|
| Str | 14 | +2  |  +2  | Dex | 15 | +2  |  +4  | Con | 12 | +1  |  +1  |
| Int |  3 | −4  |  −4  | Wis | 12 | +1  |  +1  | Cha |  6 | −2  |  −2  |
___
**Skills**    :: Stealth +6
**Senses**    :: Darkvision 60 ft.; Passive Perception 11
**Languages** :: None
**CR**        :: 1 (XP 200; PB +2)
___
### Traits
***Spider Climb.*** The lurker can climb difficult surfaces, including along ceilings, without needing to make an ability check.
:
***Ambusher.*** The lurker has Advantage on attack rolls against any creature that hasn't taken a turn yet in the current combat.
### Actions
***Multiattack.*** The lurker makes two Bite attacks.
:
***Bite.*** *Melee Attack Roll:* +4, reach 5 ft. *Hit:* 6 (1d8 + 2) Piercing damage.
:
***Web Spray (Recharge 5–6).*** *Dexterity Saving Throw:* DC 12, one creature the lurker can see within 30 feet. *Failure:* The target has the Restrained condition until it escapes (escape DC 12). *Success:* Nothing happens.
### Bonus Actions
***Skitter.*** The lurker takes the Disengage action.
}}
`;

const MARTIAL_CLASS_TABLE_2024_BODY = (classes: string): string => `{{${classes}
##### Wayfarer Features
| Level | Proficiency Bonus | Class Features             | Trail Dice | Weapon Mastery |
|:-----:|:-----------------:|:---------------------------|:----------:|:--------------:|
|   1   |        +2         | Trailcraft, Weapon Mastery |     2      |       2        |
|   2   |        +2         | Keen Eye, Quick Step       |     2      |       2        |
|   3   |        +2         | Wayfarer Subclass          |     3      |       2        |
|   4   |        +2         | Ability Score Improvement  |     3      |       3        |
|   5   |        +3         | Extra Attack               |     3      |       3        |
|   6   |        +3         | Subclass Feature           |     4      |       3        |
|   7   |        +3         | Evasion                    |     4      |       3        |
|   8   |        +3         | Ability Score Improvement  |     4      |       3        |
|   9   |        +4         | Long Stride                |     4      |       3        |
|  10   |        +4         | Subclass Feature           |     4      |       4        |
|  11   |        +4         | Relentless                 |     4      |       4        |
|  12   |        +4         | Ability Score Improvement  |     5      |       4        |
|  13   |        +5         | Unerring Path              |     5      |       4        |
|  14   |        +5         | Subclass Feature           |     5      |       4        |
|  15   |        +5         | Tireless                   |     5      |       4        |
|  16   |        +5         | Ability Score Improvement  |     5      |       4        |
|  17   |        +6         | Master Wayfarer            |     6      |       4        |
|  18   |        +6         | Subclass Feature           |     6      |       4        |
|  19   |        +6         | Epic Boon                  |     6      |       4        |
|  20   |        +6         | Endless Road               | unlimited  |       4        |
}}
`;

const CASTER_SLOT_ROWS_2014 = [
	"| 1st  | +2 | Spellcasting, Arcane Focus | 3 | 2 | — | — | — | — | — | — | — | — |",
	"| 2nd  | +2 | Mystic Tradition           | 3 | 3 | — | — | — | — | — | — | — | — |",
	"| 3rd  | +2 | —                          | 3 | 4 | 2 | — | — | — | — | — | — | — |",
	"| 4th  | +2 | Ability Score Improvement  | 4 | 4 | 3 | — | — | — | — | — | — | — |",
	"| 5th  | +3 | —                          | 4 | 4 | 3 | 2 | — | — | — | — | — | — |",
	"| 6th  | +3 | Tradition Feature          | 4 | 4 | 3 | 3 | — | — | — | — | — | — |",
	"| 7th  | +3 | —                          | 4 | 4 | 3 | 3 | 1 | — | — | — | — | — |",
	"| 8th  | +3 | Ability Score Improvement  | 4 | 4 | 3 | 3 | 2 | — | — | — | — | — |",
	"| 9th  | +4 | —                          | 4 | 4 | 3 | 3 | 3 | 1 | — | — | — | — |",
	"| 10th | +4 | Tradition Feature          | 5 | 4 | 3 | 3 | 3 | 2 | — | — | — | — |",
	"| 11th | +4 | —                          | 5 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |",
	"| 12th | +4 | Ability Score Improvement  | 5 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |",
	"| 13th | +5 | —                          | 5 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |",
	"| 14th | +5 | Tradition Feature          | 5 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |",
	"| 15th | +5 | —                          | 5 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |",
	"| 16th | +5 | Ability Score Improvement  | 5 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |",
	"| 17th | +6 | —                          | 5 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | 1 |",
	"| 18th | +6 | Mind Unbound               | 5 | 4 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 |",
	"| 19th | +6 | Ability Score Improvement  | 5 | 4 | 3 | 3 | 3 | 3 | 2 | 1 | 1 | 1 |",
	"| 20th | +6 | Mystic Apotheosis          | 5 | 4 | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |",
].join("\n");

const CASTER_SLOT_ROWS_2024 = [
	"| 1  | +2 | Spellcasting, Arcane Focus     | 3 | 4  | 2 | — | — | — | — | — | — | — | — |",
	"| 2  | +2 | Mystic Insight                 | 3 | 5  | 3 | — | — | — | — | — | — | — | — |",
	"| 3  | +2 | Mystic Subclass                | 3 | 6  | 4 | 2 | — | — | — | — | — | — | — |",
	"| 4  | +2 | Ability Score Improvement      | 4 | 7  | 4 | 3 | — | — | — | — | — | — | — |",
	"| 5  | +3 | Recollection                   | 4 | 9  | 4 | 3 | 2 | — | — | — | — | — | — |",
	"| 6  | +3 | Subclass Feature               | 4 | 10 | 4 | 3 | 3 | — | — | — | — | — | — |",
	"| 7  | +3 | —                              | 4 | 11 | 4 | 3 | 3 | 1 | — | — | — | — | — |",
	"| 8  | +3 | Ability Score Improvement      | 4 | 12 | 4 | 3 | 3 | 2 | — | — | — | — | — |",
	"| 9  | +4 | —                              | 4 | 14 | 4 | 3 | 3 | 3 | 1 | — | — | — | — |",
	"| 10 | +4 | Subclass Feature               | 5 | 15 | 4 | 3 | 3 | 3 | 2 | — | — | — | — |",
	"| 11 | +4 | —                              | 5 | 16 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |",
	"| 12 | +4 | Ability Score Improvement      | 5 | 16 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |",
	"| 13 | +5 | —                              | 5 | 17 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |",
	"| 14 | +5 | Subclass Feature               | 5 | 18 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |",
	"| 15 | +5 | —                              | 5 | 19 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |",
	"| 16 | +5 | Ability Score Improvement      | 5 | 21 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |",
	"| 17 | +6 | —                              | 5 | 22 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | 1 |",
	"| 18 | +6 | Mind Unbound                   | 5 | 23 | 4 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 |",
	"| 19 | +6 | Epic Boon                      | 5 | 24 | 4 | 3 | 3 | 3 | 3 | 2 | 1 | 1 | 1 |",
	"| 20 | +6 | Mystic Apotheosis              | 5 | 25 | 4 | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |",
].join("\n");

export const SNIPPET_CATALOG: readonly BrewSnippet[] = [
	// --- Text editor ---
	{ id: "column-break", group: "text", name: "Column break", icon: "columns-2", body: "\\column\n" },
	{ id: "new-page", group: "text", name: "New page", icon: "file-plus", body: "\\page\n" },
	{ id: "vertical-spacing", group: "text", name: "Vertical spacing", icon: "move-vertical", body: "::::\n" },
	{
		id: "wide-block",
		group: "text",
		name: "Wide block",
		icon: "rectangle-horizontal",
		body: `{{wide
Everything in here spans both columns. Tables, text, everything!
You may need a manual \`\\column\` break to make surrounding text flow
around this block the way you want.
}}
`,
	},

	// --- PHB ---
	{
		id: "spell",
		group: "phb",
		edition: "2014",
		family: "spell",
		name: "Spell",
		icon: "wand-sparkles",
		body: `#### Lantern Ward
*2nd-level abjuration*

**Casting Time:** :: 1 action
**Range:**        :: Touch
**Components:**   :: V, S, M (a pinch of candle ash)
**Duration:**     :: Concentration, up to 10 minutes

A pale lantern-light surrounds the creature you touch. Replace this text with
the spell's effect, its saving throw, and what happens at higher levels.
`,
	},
	{
		id: "class-feature",
		group: "phb",
		edition: "2014",
		family: "class-feature",
		name: "Class features",
		icon: "drama",
		body: `## Class Features

As a wayfarer, you gain the following class features.

#### Hit Points
**Hit Dice:**                    :: 1d10 per wayfarer level
**Hit Points at 1st Level:**     :: 10 + your Constitution modifier
**Hit Points at Higher Levels:** :: 1d10 (or 6) + your Constitution modifier per wayfarer level after 1st

#### Proficiencies
**Armor:**   :: Light armor, medium armor, shields
**Weapons:** :: Simple weapons, martial weapons
**Tools:**   :: Cartographer's tools

**Saving Throws:** :: Strength, Wisdom
**Skills:**        :: Choose two from Athletics, Insight, Nature, Perception, Stealth, and Survival

#### Equipment
You start with the following equipment, in addition to the equipment granted by your background:
- (*a*) a martial weapon and a shield or (*b*) two martial weapons
- (*a*) five javelins or (*b*) any simple melee weapon
- an explorer's pack
`,
	},
	{
		id: "quote",
		group: "phb",
		name: "Quote",
		icon: "quote",
		body: `{{quote
The road bent north into the fog, and the old map said nothing at all about
what waited there.

{{attribution Unknown, *Notes from the Long Road*}}
}}
`,
	},
	{
		id: "note",
		group: "phb",
		name: "Note",
		icon: "sticky-note",
		body: `{{note
##### Time to Drop Knowledge
Use notes to point out some interesting information.

**Tables and lists** both work within a note.
}}
`,
	},
	{
		id: "descriptive",
		group: "phb",
		name: "Descriptive text box",
		icon: "message-square",
		body: `{{descriptive
##### Time to Drop Knowledge
Use descriptive boxes to highlight text that should be read aloud.

**Tables and lists** both work within a descriptive box.
}}
`,
	},
	{
		id: "monster-unframed",
		group: "phb",
		edition: "2014",
		family: "monster-unframed",
		name: "Monster stat block (unframed)",
		icon: "paw-print",
		body: MONSTER_BODY("monster"),
	},
	{
		id: "monster",
		group: "phb",
		edition: "2014",
		family: "monster",
		name: "Monster stat block",
		icon: "bug",
		body: MONSTER_BODY("monster,frame"),
	},
	{
		id: "monster-wide",
		group: "phb",
		edition: "2014",
		family: "monster-wide",
		name: "Wide monster stat block",
		icon: "rectangle-horizontal",
		body: MONSTER_BODY("monster,frame,wide"),
	},
	{
		id: "magic-item",
		group: "phb",
		edition: "2014",
		family: "magic-item",
		name: "Magic item",
		icon: "gem",
		body: `#### Compass of Second Chances
*Wondrous item, uncommon (requires attunement)*
:
While attuned to this compass, you can use an action to learn the direction
of the last place you rested. Replace this text with the item's properties.
`,
	},

	// --- Tables ---
	{
		id: "table",
		group: "tables",
		name: "Table",
		icon: "table",
		body: `##### Character Advancement
| Experience Points | Level | Proficiency Bonus |
|:------------------|:-----:|:-----------------:|
| 0                 | 1     | +2                |
| 300               | 2     | +2                |
| 900               | 3     | +2                |
| 2,700             | 4     | +2                |
| 6,500             | 5     | +3                |
| 14,000            | 6     | +3                |
`,
	},
	{
		id: "wide-table",
		group: "tables",
		name: "Wide table",
		icon: "sheet",
		body: `{{wide
##### Weapons
| Name                    | Cost  | Damage          | Weight  | Properties |
|:------------------------|:-----:|:----------------|--------:|:-----------|
| *Simple Melee Weapons*  |       |                 |         |            |
| &emsp; Club             | 1 sp  | 1d4 bludgeoning | 2 lb.   | Light      |
| &emsp; Dagger           | 2 gp  | 1d4 piercing    | 1 lb.   | Finesse    |
| &emsp; Spear            | 1 gp  | 1d6 piercing    | 3 lb.   | Thrown     |
| *Simple Ranged Weapons* |       |                 |         |            |
| &emsp; Dart             | 5 cp  | 1d4 piercing    | 1/4 lb. | Finesse    |
| &emsp; Shortbow         | 25 gp | 1d6 piercing    | 2 lb.   | Ammunition |
| &emsp; Sling            | 1 sp  | 1d4 bludgeoning | &mdash; | Ammunition |
}}
`,
	},
	{
		id: "martial-class-table",
		group: "tables",
		edition: "2014",
		family: "martial-class-table",
		name: "Martial class table",
		icon: "table-properties",
		body: MARTIAL_CLASS_TABLE_BODY("classTable,frame,decoration"),
	},
	{
		id: "martial-class-table-unframed",
		group: "tables",
		edition: "2014",
		family: "martial-class-table-unframed",
		name: "Martial class table (unframed)",
		icon: "table-2",
		body: MARTIAL_CLASS_TABLE_BODY("classTable"),
	},

	{
		id: "caster-class-table",
		group: "tables",
		edition: "2014",
		family: "caster-class-table",
		name: "Full caster class table",
		icon: "sparkles",
		body: `{{classTable,frame,decoration,wide
##### The Mystic
| Level | Proficiency Bonus | Features | Cantrips Known | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
|:-----:|:-----------------:|:---------|:--------------:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
${CASTER_SLOT_ROWS_2014}
}}
`,
	},
	{
		id: "feat",
		group: "phb",
		edition: "2014",
		family: "feat",
		name: "Feat",
		icon: "award",
		body: `#### Trailblazer
*Prerequisite: Wisdom 13 or higher*

You have spent years finding the way where others see none. You gain the
following benefits:

- Increase your Dexterity or Wisdom score by 1, to a maximum of 20.
- Replace this text with the feat's first benefit.
- Replace this text with the feat's second benefit.
`,
	},
	{
		id: "background",
		group: "phb",
		edition: "2014",
		family: "background",
		name: "Background",
		icon: "scroll-text",
		body: `## Wayfinder
Replace this text with a short description of the life this background
represents.

**Skill Proficiencies:** :: Nature, Survival
**Tool Proficiencies:**  :: Cartographer's tools
**Languages:**           :: One of your choice
**Equipment:**           :: A set of cartographer's tools, a set of traveler's clothes, a lantern, and a belt pouch containing 10 gp

#### Feature: Trail Sense
Replace this text with the background feature's benefit.
`,
	},
	{
		id: "race",
		group: "phb",
		edition: "2014",
		family: "species",
		name: "Species",
		icon: "users",
		body: `#### Thornkin Traits
Your thornkin character has the following traits.

***Ability Score Increase.*** Your Constitution score increases by 2, and your Wisdom score increases by 1.
:
***Age.*** Replace this text with how thornkin age.
:
***Alignment.*** Replace this text with typical thornkin outlooks.
:
***Size.*** Thornkin stand between 4 and 5 feet tall. Your size is Medium.
:
***Speed.*** Your base walking speed is 30 feet.
:
***Barbed Hide.*** Replace this text with the race's first trait.
:
***Languages.*** You can speak, read, and write Common and one other language of your choice.
`,
	},

	// --- 2024 variants (SRD 5.2.1 layouts; see docs/DND_BLOCK_FORMATS.md) ---
	{
		id: "monster-2024",
		group: "phb",
		edition: "2024",
		family: "monster",
		name: "Monster stat block",
		icon: "bug",
		body: MONSTER_2024_BODY("monster,frame"),
	},
	{
		id: "monster-2024-wide",
		group: "phb",
		edition: "2024",
		family: "monster-wide",
		name: "Wide monster stat block",
		icon: "rectangle-horizontal",
		body: MONSTER_2024_BODY("monster,frame,wide"),
	},
	{
		id: "monster-2024-unframed",
		group: "phb",
		edition: "2024",
		family: "monster-unframed",
		name: "Monster stat block (unframed)",
		icon: "paw-print",
		body: MONSTER_2024_BODY("monster"),
	},
	{
		id: "spell-2024",
		group: "phb",
		edition: "2024",
		family: "spell",
		name: "Spell",
		icon: "wand-sparkles",
		body: `#### Lantern Ward
*Level 2 Abjuration (Cleric, Wizard)*

**Casting Time:** :: Action
**Range:**        :: Touch
**Components:**   :: V, S, M (a pinch of candle ash)
**Duration:**     :: Concentration, up to 10 minutes

A pale lantern-light surrounds a willing creature you touch. Replace this
text with the spell's effect, including any saving throw and its outcome.

***Using a Higher-Level Spell Slot.*** The duration increases by 10 minutes
for each spell slot level above 2.
`,
	},
	{
		id: "core-class-traits-2024",
		group: "phb",
		edition: "2024",
		family: "class-feature",
		name: "Class features",
		icon: "shield",
		body: `| Core Wayfarer Traits           |                                                   |
|:-------------------------------|:--------------------------------------------------|
| **Primary Ability**            | Dexterity and Wisdom                              |
| **Hit Point Die**              | D10 per Wayfarer level                            |
| **Saving Throw Proficiencies** | Strength and Dexterity                            |
| **Skill Proficiencies**        | *Choose 2:* Athletics, Insight, Nature, Perception, Stealth, or Survival |
| **Weapon Proficiencies**       | Simple and Martial weapons                        |
| **Tool Proficiencies**         | Cartographer's Tools                              |
| **Armor Training**             | Light and Medium armor and Shields                |
| **Starting Equipment**         | *Choose A or B:* (A) Scale Mail, Longsword, Shield, 4 Javelins, Explorer's Pack, and 10 GP; or (B) 150 GP |
`,
	},
	{
		id: "class-table-2024",
		group: "tables",
		edition: "2024",
		family: "martial-class-table",
		name: "Martial class table",
		icon: "table-properties",
		body: MARTIAL_CLASS_TABLE_2024_BODY("classTable,frame,decoration"),
	},
	{
		id: "class-table-2024-unframed",
		group: "tables",
		edition: "2024",
		family: "martial-class-table-unframed",
		name: "Martial class table (unframed)",
		icon: "table-2",
		body: MARTIAL_CLASS_TABLE_2024_BODY("classTable"),
	},
	{
		id: "caster-class-table-2024",
		group: "tables",
		edition: "2024",
		family: "caster-class-table",
		name: "Full caster class table",
		icon: "sparkles",
		body: `{{classTable,frame,decoration,wide
##### Mystic Features
| Level | Proficiency Bonus | Class Features | Cantrips | Prepared Spells | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|:-----:|:-----------------:|:---------------|:--------:|:---------------:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
${CASTER_SLOT_ROWS_2024}
}}
`,
	},
	{
		id: "feat-2024",
		group: "phb",
		edition: "2024",
		family: "feat",
		name: "Feat",
		icon: "award",
		body: `#### Trailblazer
*General Feat (Prerequisite: Level 4+)*

You gain the following benefits.

***Ability Score Increase.*** Increase your Dexterity or Wisdom score by 1,
to a maximum of 20.
:
***Pathfinder.*** Replace this text with the feat's first benefit.
:
***Quick Camp.*** Replace this text with the feat's second benefit.
`,
	},
	{
		id: "background-2024",
		group: "phb",
		edition: "2024",
		family: "background",
		name: "Background",
		icon: "scroll-text",
		body: `#### Wayfinder
**Ability Scores:**       :: Dexterity, Constitution, Wisdom
**Feat:**                 :: Alert (see "Feats")
**Skill Proficiencies:**  :: Nature and Survival
**Tool Proficiency:**     :: Cartographer's Tools
**Equipment:**            :: *Choose A or B:* (A) Cartographer's Tools, Traveler's Clothes, Bedroll, Lantern, 2 Pouches, and 16 GP; or (B) 50 GP

Replace this text with a short description of the life this background
represents.
`,
	},
	{
		id: "species-2024",
		group: "phb",
		edition: "2024",
		family: "species",
		name: "Species",
		icon: "users",
		body: `#### Thornkin Traits
**Creature Type:** :: Humanoid
**Size:**          :: Small (about 3–4 feet tall) or Medium (about 4–6 feet tall), chosen when you select this species
**Speed:**         :: 30 feet

As a Thornkin, you have these special traits.

***Barbed Hide.*** Replace this text with the species' first trait.
:
***Rooted.*** Replace this text with the species' second trait.
`,
	},
	{
		id: "magic-item-2024",
		group: "phb",
		edition: "2024",
		family: "magic-item",
		name: "Magic item",
		icon: "gem",
		body: `#### Compass of Second Chances
*Wondrous Item, Uncommon (Requires Attunement)*
:
While attuned to this compass, you can take a Magic action to learn the
direction of the last place you finished a Long Rest. Replace this text with
the item's properties.
`,
	},
];

/** Edition-neutral blocks plus the variants that follow `edition`. */
export function snippetsForEdition(edition: Edition): BrewSnippet[] {
	return SNIPPET_CATALOG.filter((snippet) => !snippet.edition || snippet.edition === edition);
}

/** Every edition family, in catalog order of first appearance. */
export const SNIPPET_FAMILIES: readonly string[] = [
	...new Set(SNIPPET_CATALOG.flatMap((snippet) => (snippet.family ? [snippet.family] : []))),
];

/** The `edition` variant of a family; every family ships both editions. */
export function resolveSnippetFamily(family: string, edition: Edition): BrewSnippet | undefined {
	return SNIPPET_CATALOG.find((snippet) => snippet.family === family && snippet.edition === edition);
}

/** Picker and command label, e.g. "PHB 2024: Monster stat block". */
export function snippetLabel(snippet: BrewSnippet, showEdition = true): string {
	const group = SNIPPET_GROUP_LABELS[snippet.group];
	return showEdition && snippet.edition
		? `${group} ${snippet.edition}: ${snippet.name}`
		: `${group}: ${snippet.name}`;
}
