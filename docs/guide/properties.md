[BrewVault guide](./README.md) › Note properties

# Note properties

BrewVault reads a few **properties** from a note's frontmatter: the YAML block
between `---` lines at the very top of the note. In Obsidian these appear in
the **Properties** panel above the note.

Properties are not `#tags`. A tag says what a note is about. A BrewVault
property tells BrewVault how to render the note. BrewVault never edits your
properties or your note.

| Property | What it does |
| --- | --- |
| [`bv_theme`](#bv_theme-theme-for-one-note) | Picks the theme for one note. |
| [`bv_footer`](#bv_footer-running-footer) | Prints a running footer on every page. |
| [`bv_page_numbers`](#bv_page_numbers-show-or-hide-page-numbers) | Shows or hides page numbers. |
| [`bv_page_start`](#bv_page_start-first-page-number) | Sets the number printed on the first page. |
| [`bv_page_size`](#bv_page_size-letter-or-a4) | Uses US Letter or A4 paper. |
| [`bv_file_name`](#bv_file_name-export-file-name) | Sets the export file name. |
| [`bv_export_folder`](#bv_export_folder-export-subfolder) | Saves exports in a subfolder of the export folder. |
| [`bv_edition`](#bv_edition-rules-edition-for-inserted-blocks) | Picks 2014 or 2024 blocks for **Insert block…** in this note. |

## Checking a note's options

Run **Show export options** from the Command Palette, or click the caption
above the pages in the preview. A table lists every option for the active
note, its value, and whether it came from a note property or from settings.
Invalid properties are listed underneath.

The caption itself shows the theme and its source, for example
`5e DMG · Note property bv_theme · 2 more note properties`.

## `bv_theme`: theme for one note

### Add it

Pick either way:

- **Properties panel.** Open the note, run **Add file property**
  (`Ctrl/Cmd + ;`), type `bv_theme` as the name and `phb` as the value.
- **Type it.** Put this at the very top of the note, starting on line 1:

  ```yaml
  ---
  bv_theme: phb
  ---
  ```

If the note already has properties, add the `bv_theme:` line inside the
existing block. Don't add a second `---` block.

### Values

Case doesn't matter.

| Theme | Write any of |
| --- | --- |
| Player's Handbook | `phb`, `5e PHB`, `Player's Handbook` |
| Dungeon Master's Guide | `dmg`, `5e DMG`, `Dungeon Master's Guide` |
| SRD / Unearthed Arcana | `srd`, `ua`, `Unearthed Arcana` |
| Blank | `blank` |
| One of your custom styles | its name as shown in **Settings → BrewVault → Choose theme**, or its `custom:N` id |

### Which theme wins

1. A theme-specific command such as **Export current file as BrewVault PDF in
   PHB style** always uses its own theme.
2. Otherwise, the note's `bv_theme`.
3. Otherwise, the theme chosen in **Settings → BrewVault → Choose theme**.

`bv_theme` applies to the live preview, **Export current file as HTML**, and
**Export current file as BrewVault PDF** on desktop and mobile.

### When the value is wrong

A notice says something like:

> Unknown bv_theme "parchment" in "My Note". Using the theme from settings.

The note still renders, using the settings theme. The preview shows this
notice once per value rather than on every keystroke. Deleting the property, or
leaving its value empty, also uses the settings theme, with no notice.

### Giving many notes the same theme

Every `bv_*` property belongs to one note. Notes without a property use the
value from settings, so set properties only on notes that should differ.
Applying options to every note with a tag, property value, or folder is
planned as **export rules** in a later release.

## `bv_footer`: running footer

Prints the same text at the bottom of every page, like the chapter footers in
official D&D books. PHB and DMG place it beside the page number, in their small
uppercase footer style; other themes place it at the bottom right.

```yaml
---
bv_footer: Llynwych | Monsters
---
```

- Any text works. Numbers are printed as written.
- The footer stays on one line. Text longer than about 60% of the page
  width is cut off with "…".
- `bv_footer: false` turns the footer off.
- An empty value, or no `bv_footer`, prints no footer.

## `bv_page_numbers`: show or hide page numbers

Hide page numbers for handouts, one-page monsters, and maps:

```yaml
---
bv_page_numbers: false
---
```

- `false`, `no`, `off`, or `hide` hides them.
- `true`, `yes`, `on`, or `show` shows them, which is the default.

## `bv_page_start`: first page number

Starts page numbering at a chosen number, so chapters exported as separate
PDFs line up when printed together:

```yaml
---
bv_page_start: 23
---
```

- Any whole number from 1 to 9999. The default is 1.
- PHB, DMG, and Blank put page numbers on the right of the first page and
  alternate from there. Start chapters on odd numbers so every number lands
  on the side a printed book would use.

## `bv_page_size`: Letter or A4

Uses a standard paper size for this note, in the preview and in exports:

```yaml
---
bv_page_size: a4
---
```

| Value | Size |
| --- | --- |
| `letter` or `US Letter` | 8.5 × 11 in (816 × 1056 px) |
| `a4` | 210 × 297 mm (794 × 1123 px) |

Without `bv_page_size`, notes use **Page width** and **Page height** from
[settings](./settings.md). Homebrewery themes are designed for Letter, so A4
pages are slightly narrower and taller and may break in different places.

## `bv_file_name`: export file name

By default an export is named after the note. `bv_file_name` names it
something else:

```yaml
---
bv_file_name: "Llynwych: Monsters of the Everwoods"
---
```

- Up to 200 characters. An empty value uses the note name.
- Nothing is printed on the page. The name is also stored as the PDF's
  document title, which PDF viewers show in their title bar.
- Characters that file systems reject (`\ / : * ? " < > |`, plus `# ^ [ ]`)
  become hyphens in the file name. The document title keeps them, so the
  example above saves as `Llynwych- Monsters of the Everwoods.pdf`.
- Quote names that contain a colon, as in the example, or YAML reads them
  incorrectly.
- If a file with that name exists, BrewVault adds `_1`, `_2`, and so on.

## `bv_export_folder`: export subfolder

Saves this note's exports in a subfolder of the export folder from
[settings](./settings.md), creating it if needed:

```yaml
---
bv_export_folder: Llynwych/Monsters
---
```

This saves to `BrewVault-Exports/Llynwych/Monsters/`.

- Use `/` between folders. Backslashes are converted.
- The path is always inside the export folder. Values containing `..` or
  `.`, drive letters such as `C:`, or the characters `: * ? " < > |` are
  ignored with a notice.

## `bv_edition`: rules edition for inserted blocks

Makes **Insert block…** and the other insert commands that don't name an
edition use 2014 or 2024 blocks in this note, regardless of **Default
edition** in settings:

```yaml
---
bv_edition: 2014
---
```

- Accepted values: `2014` and `2024`.
- Commands that name an edition, such as **Insert 2024 block…**, ignore it.
- It doesn't change how a note exports.

## Combining notes into one PDF

BrewVault exports one note at a time. Combining several notes into one book
is not planned for now, but any PDF tool that merges files can join exported
PDFs. Use `bv_page_start` so the page numbers
continue across the merged files.
