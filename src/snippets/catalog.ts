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
 */

export type SnippetGroup = "text" | "phb" | "tables";

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
		name: "Class feature",
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
		name: "Monster stat block (unframed)",
		icon: "paw-print",
		body: MONSTER_BODY("monster"),
	},
	{
		id: "monster",
		group: "phb",
		name: "Monster stat block",
		icon: "bug",
		body: MONSTER_BODY("monster,frame"),
	},
	{
		id: "monster-wide",
		group: "phb",
		name: "Wide monster stat block",
		icon: "rectangle-horizontal",
		body: MONSTER_BODY("monster,frame,wide"),
	},
	{
		id: "magic-item",
		group: "phb",
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
		name: "Martial class table",
		icon: "table-properties",
		body: MARTIAL_CLASS_TABLE_BODY("classTable,frame,decoration"),
	},
	{
		id: "martial-class-table-unframed",
		group: "tables",
		name: "Martial class table (unframed)",
		icon: "table-2",
		body: MARTIAL_CLASS_TABLE_BODY("classTable"),
	},
];
