[BrewVault guide](./README.md) › Commands

# Commands

Open the Command Palette with `Ctrl/Cmd + P` to run these commands. The preview
can also be opened using BrewVault's scroll icon in the ribbon.

## Preview and export

| Command | Effect |
| --- | --- |
| **Open preview** | Opens or reveals a live BrewVault preview of the active Markdown note. |
| **Show export options** | Lists the active note's export options, such as theme, footer, and page size, and where each one comes from. See [Note properties](./properties.md#checking-a-notes-options). |
| **Export current file as HTML** | Creates a self-contained `.brew.html` file using the note's [`bv_theme`](./properties.md) or else the selected theme. |
| **Export current file as BrewVault PDF** | Creates a direct PDF on desktop, or uses the mobile PDF method from settings, with the note's [`bv_theme`](./properties.md) or else the selected theme. |
| **Export current file as BrewVault PDF in PHB style** | Uses the Player's Handbook parchment theme. |
| **Export current file as BrewVault PDF in DMG style** | Uses the Dungeon Master's Guide theme. |
| **Export current file as BrewVault PDF in SRD style** | Uses the SRD / Unearthed Arcana theme. |
| **Export current file as BrewVault PDF in Blank style** | Uses the plain Blank theme. |
| **Export current file as BrewVault PDF via browser** | Mobile only. Saves a `.brew.html` file and opens the browser handoff, whatever the setting says. |
| **Export current file as BrewVault PDF directly (image pages)** | Mobile only. Writes a PDF of image pages inside Obsidian, whatever the setting says. |

Theme-specific PDF commands do not change the saved preview theme. On mobile,
the generic and theme-specific PDF commands follow the **Mobile PDF export**
setting; see [Mobile support](./mobile.md#choosing-a-method).

## Compiling notes

| Command | Effect |
| --- | --- |
| **Insert book content block** | Inserts a `{{bookContent}}` block: links and includes inside it add notes to the active note's preview and PDF. |
| **Insert folder include…** | Picks a folder and inserts an include line that adds all of its notes. |
| **Expand include into links** | With the cursor on an include line, replaces it with the `- [[link]]` list it adds, ready to reorder by hand. |
| **Show included notes** | Lists the notes a `{{bookContent}}` block includes, in order, with any problems and ignored properties. |

See [Compiling notes](./books.md).

## Table of contents

| Command | Effect |
| --- | --- |
| **Generate table of contents** | Writes or refreshes a `{{toc` block listing the note's `#`, `##`, and `###` headings with their page numbers. |

See [Table of contents](./table-of-contents.md).

## Inserting blocks

| Command | Effect |
| --- | --- |
| **Insert block…** | Opens a searchable picker of Homebrewery-style blocks in the default edition. |
| **Insert 2014 block…** / **Insert 2024 block…** | Opens the picker for one edition, regardless of the default. |
| **Insert *Group*: *Block*** | Inserts one block directly. Edition-sensitive blocks, such as **Insert PHB: Monster stat block**, follow the default edition. |
| **Insert *Group* 2014: *Block*** / **Insert *Group* 2024: *Block*** | Inserts that edition's variant, for example **Insert Tables 2014: Full caster class table**. Each block is its own command, so it can be given a hotkey. |

The insert commands cover the Homebrewery V3 snippets that BrewVault renders
today: column and page breaks, vertical spacing, wide blocks, spells, class
features, quotes, notes, descriptive boxes, monster stat blocks, magic items,
and standard, wide, and class tables. They need a note open in editing mode
and work even when a sidebar has focus.

Edition-sensitive blocks ship in 2014 and 2024 variants: monster stat blocks,
spells, class features, martial and full-caster class tables, feats,
backgrounds, species, and magic items. **Default edition** in BrewVault
settings (2024 unless changed) decides which variant the picker and the
non-edition commands insert. A note's
[`bv_edition`](./properties.md#bv_edition-rules-edition-for-inserted-blocks)
property overrides it for that note. The 2024 layouts follow the SRD 5.2.1 (Initiative,
MOD/SAVE ability table, CR with XP and PB, core class traits); every name and
sentence in either edition is an original placeholder.

See [Markdown syntax](./syntax.md) for what the inserted blocks contain.

## Export file names

Desktop exports are written directly to the configured folder without opening
a print or save dialog. For a note named `Alchemist.md`, BrewVault creates:

```text
BrewVault-Exports/Alchemist.pdf
```

If that file already exists, the next exports are named:

```text
BrewVault-Exports/Alchemist_1.pdf
BrewVault-Exports/Alchemist_2.pdf
```

HTML exports use the same policy with names such as `Alchemist.brew.html` and
`Alchemist_1.brew.html`.

Mobile direct PDFs use the same names. Mobile browser handoff saves a
`.brew.html` file instead; see [Mobile support](./mobile.md).

A note's [`bv_file_name`](./properties.md#bv_file_name-export-file-name)
property replaces the note name in these file names.
