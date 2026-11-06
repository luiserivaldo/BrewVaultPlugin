# Stat blocks

## Homebrewery monster blocks in the note

A `{{monster,frame ... }}` block (see [Markdown syntax](./syntax.md)) is drawn as
its rendered stat block right in the note, in Live Preview and Reading view,
without the preview pane. The source stays plain Homebrewery Markdown, so it
still pastes into Homebrewery and exports as before; BrewVault never rewrites it.

- **Live Preview:** the block is drawn while the cursor is outside it. Click it
  to see and edit the source; move away to see it drawn again. Source mode
  always shows the text.
- **Reading view:** the block is drawn once, as a card.
- **Edition:** the block is already written in one edition (the 2014 and 2024
  block inserts differ), so it prints as written.
- **Theme:** the note's `bv_theme`, else the theme setting. Add `wide` to the
  classes (`{{monster,frame,wide`) for a two-column card.
- **Setting:** **Monster blocks in notes** (on by default; reload Obsidian after
  changing it).

The rest of this page covers the optional YAML format.

## YAML stat blocks

BrewVault draws a ` ```statblock ` code block as a framed monster block right
inside the note, in Reading view and Live Preview, without the preview pane.
The same block prints in HTML and PDF exports, in the note's theme.

## Writing a block

The block is YAML. These keys are read; anything else, such as `layout` and
`image`, is ignored.

````markdown
```statblock
name: "Cave Lurker"
size: Medium
type: Monstrosity
subtype:
alignment: Unaligned
ac: 13 (natural armor)
hp: 27
hit_dice: 5d8 + 5
speed: "30 ft., climb 30 ft."
stats: [14, 15, 12, 3, 12, 6]
saves:
  - dexterity: 4
skillsaves:
  - stealth: 6
damage_resistances: "Poison"
condition_immunities: "Poisoned"
senses: "darkvision 60 ft., passive Perception 11"
languages: "—"
cr: 1
traits:
  - name: "Spider Climb"
    desc: "The lurker can climb difficult surfaces."
actions:
  - name: "Bite"
    desc: "*Melee Weapon Attack:* +4 to hit, reach 5 ft., one target. *Hit:* 6 (1d8 + 2) piercing damage."
```
````

| Key | Meaning |
| --- | --- |
| `name`, `size`, `type`, `subtype`, `alignment` | The heading and the line under it. |
| `ac`, `hp`, `hit_dice`, `speed` | Core statistics. `hp` and `hit_dice` print as `27 (5d8 + 5)`. |
| `stats` | Six scores in STR, DEX, CON, INT, WIS, CHA order. Modifiers are computed. |
| `saves`, `skillsaves` | Lists of `ability: total bonus` and `skill: total bonus`. |
| `damage_vulnerabilities`, `damage_resistances`, `damage_immunities`, `condition_immunities` | Free text. |
| `senses`, `languages` | Free text. |
| `cr` | Challenge rating such as `1/2` or `16`. XP and proficiency bonus are computed. |
| `traits`, `spells`, `actions`, `bonus_actions`, `reactions`, `legendary_actions`, `lair_actions` | Lists of `name` and `desc`. Descriptions may use Markdown emphasis. Blank `-` items are skipped. |
| `legendary_description` | Text shown above the legendary actions. |
| `edition` | Optional: `2014` or `2024` for this block only. |

Bonuses in `saves` and `skillsaves` are the final numbers, as in
existing Fantasy Statblocks notes, not proficiency adjustments. Your existing blocks work unchanged.

## 2014 and 2024

The YAML holds the creature's data, not a layout, so one block prints in either
edition:

| | 2014 | 2024 |
| --- | --- | --- |
| Header | *Medium monstrosity, unaligned* | *Medium Monstrosity, Unaligned* |
| Core | Armor Class, Hit Points, Speed | AC with Initiative, HP, Speed |
| Abilities | One row of six: `14 (+2)` | Two rows with MOD and SAVE columns |
| Saving throws | A *Saving Throws* line | Folded into the SAVE column |
| Defenses | Separate damage and condition lines | Resistances, Vulnerabilities, Immunities |
| Challenge | `1 (200 XP)` and Proficiency Bonus | `1 (XP 200; PB +2)` |
| Traits | Unheaded | Under a *Traits* heading |

Description text prints as you wrote it. BrewVault changes the structure, not
your prose, so a description that says *Melee Weapon Attack* stays that way in
the 2024 layout.

The edition is the first of:

1. The block's own `edition:` key.
2. The note's `bv_edition` property.
3. **Default edition** in the plugin settings.

Hover a rendered block to show a **2014 / 2024** switch. It previews the other
layout for that block until Obsidian reloads and never edits the note. To keep an edition, set one of the three sources above.

## Problems

A block that cannot be read shows a red message listing what to fix instead of
raw YAML: invalid YAML, `stats` that is not six numbers, an unknown ability in
`saves`, and similar.

## Fantasy Statblocks

BrewVault reads the same YAML keys, but it is a separate implementation and is
not affiliated with Fantasy Statblocks. Both plugins draw the `statblock` fence,
so if you keep Fantasy Statblocks enabled, turn **Stat blocks in notes** off in
BrewVault's settings and reload Obsidian. Exports still render the block either
way. BrewVault does not read creature bestiaries or custom Fantasy Statblocks
layouts.
