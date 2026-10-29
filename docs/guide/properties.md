[BrewVault guide](./README.md) › Note properties

# Note properties

BrewVault reads a few **properties** from a note's frontmatter: the YAML block
between `---` lines at the very top of the note. In Obsidian these appear in
the **Properties** panel above the note.

Properties are not `#tags`. A tag says what a note is about. A BrewVault
property tells BrewVault how to render the note. BrewVault never edits your
properties or your note.

| Property | Status | What it does |
| --- | --- | --- |
| [`bv_theme`](#bv_theme-theme-for-one-note) | Available | Picks the theme for one note. |
| [`bv_footer`](#bv_footer-running-footer) | Available | Prints a running footer on every page. |
| [`bv_page_numbers`](#bv_page_numbers-show-or-hide-page-numbers) | Available | Shows or hides page numbers. |
| [`bv_book`](#bv_book-combine-notes-into-one-pdf-planned) | Planned, not available yet | Turns a note into a book that combines many notes into one PDF. |

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

`bv_theme` belongs to each note. Two ways to cover many notes:

- **Leave it off.** Notes without `bv_theme` use the settings theme. Set
  `bv_theme` only on the few notes that should look different.
- **Books (planned).** A book will have one theme for every note in it. See
  below.

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

## `bv_book`: combine notes into one PDF (planned)

> **Not available yet.** This section describes the design so you can prepare
> your notes. Adding `bv_book` today does nothing.

A book is an ordinary note with a `bv_book` property. Exporting it will produce
one PDF with continuous page numbers, made from many notes in a set order.

### Choosing notes and their order

You can use any mix of these:

1. **Links in the book note's body, in the order you write them.** A line, or
   list item, that is just a link such as `[[Aberrant Hound]]` is replaced by
   that note's content. Headings become section titles, and other text (an
   introduction, for example) stays as written. An existing index or catalogue
   note can become a book just by adding `bv_book: {}`.
2. **A query** for notes that aren't linked: by tag, by property value, or by
   folder.
3. **A sort order** for the query results: a `bv_order` number on each note,
   then file path, name, any property, or created/modified date. Numbers in
   names sort as numbers, so `2. Uncommon` comes before `10. Legendary`.

```yaml
---
bv_book:
  title: Llynwych Compendium
  theme: phb
  include:
    tags: [llynwych]
    properties: { catalogues: Llynwych }
    folders: ["Monsters/Llynwych"]
  sort: [bv_order, path]
  unlisted: append        # append | warn | exclude
---
## Monsters
- [[Aberrant Hound]]
- [[Aberrant Skulker]]
```

A **Show book order…** command will list the final order, and any problems,
before you export.

### Preparing now

- Keep index or catalogue notes that link your notes in reading order. That is
  the most precise way to set a book's order.
- To sort by number, give notes a `bv_order` property, such as `bv_order: 10`.
  Leave gaps (10, 20, 30) so you can insert notes later.
