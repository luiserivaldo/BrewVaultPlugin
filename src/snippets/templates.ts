/**
 * Plain-text snippet templates inserted at the cursor by editor commands.
 * Kept as simple exported strings so adding a new snippet is a one-line
 * addition here plus one addCommand() call in main.ts — no other plumbing.
 */

export const MONSTER_STAT_BLOCK_SNIPPET = `{{monster,wide
## Goblin
*Small humanoid (goblinoid), neutral evil*

- **Armor Class** 15 (leather armor, shield)
- **Hit Points** 7 (2d6)
- **Speed** 30 ft.

|STR|DEX|CON|INT|WIS|CHA|
|:---:|:---:|:---:|:---:|:---:|:---:|
|8 (-1)|14 (+2)|10 (+0)|10 (+0)|8 (-1)|8 (-1)|

- **Skills** Stealth +6
- **Senses** Darkvision 60 ft., passive Perception 9
- **Languages** Common, Goblin
- **Challenge** 1/4 (50 XP)

***Nimble Escape.*** The goblin can take the Disengage or Hide action as
a bonus action on each of its turns.

### Actions

***Scimitar.*** *Melee Weapon Attack:* +4 to hit, reach 5 ft., one
target. *Hit:* 5 (1d6 + 2) slashing damage.
}}
`;

export const NOTE_SNIPPET = `{{note
**Tip.** Replace this with a callout, GM tip, or sidebar note.
}}
`;

export const DESCRIPTIVE_SNIPPET = `{{descriptive
Replace this with read-aloud / flavor text for the players.
}}
`;
