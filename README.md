# BrewVault

BrewVault is an Obsidian plugin for turning Markdown notes into themed,
D&D 5e-style documents. Preview your work inside Obsidian, export directly to
PDF using preconfigured themes, or export as HTML and apply custom CSS styles.

## Features

- Live rendered preview that follows the active Markdown note as its source.
- Preconfigured Player's Handbook, Dungeon Master's Guide, and SRD / Unearthed
  Arcana themes, selectable per note with a `bv_theme` frontmatter property.
- Styling inspired by Homebrewery fonts, page measurements, headings, tables,
  notes, descriptive boxes, monster blocks, and page furniture.
- Standard Obsidian Markdown plus Homebrewery-style blocks, inline tags, page
  breaks, column breaks, and wide elements.
- Compact Homebrewery tag labels in the Markdown editor for a seamless workflow
  transition.
- Automatic pagination without changing the source Markdown file.
- Direct PDF export with backgrounds and fonts preserved.
- Self-contained HTML export that can be opened without Obsidian or BrewVault.
- Configurable vault-relative export folder; defaults to the root folder at
  `BrewVault-Exports`.
- Fully local and offline. Desktop requires no external browser, server, or
  Chromium installation. Mobile can either hand the final print step to an
  installed browser or write the PDF directly inside Obsidian.

## Mobile support

Mobile preview scales each page to fit the screen. Mobile PDF export offers two
methods:

- **Browser handoff** (default) saves a self-contained `.brew.html` file and
  hands it to a browser, where you use **Share → Print → Save as PDF**. Text
  stays selectable and searchable.
- **Direct PDF (image pages)** writes the PDF inside Obsidian with no other
  app. Each page is stored as an image, so text is not selectable and files are
  larger.

Pick the default under **Settings → BrewVault → Mobile PDF export**, or run
**Export current file as BrewVault PDF via browser** or **Export current file
as BrewVault PDF directly (image pages)** for a one-off choice. Current
releases are tested on Android only; see
[Mobile support](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/mobile.md)
for the full comparison.

## Installation

BrewVault 0.6.0 supports desktop and mobile Obsidian `1.7.2` or newer.

1. Download or obtain `manifest.json`, `main.js`, and `styles.css` from the
   BrewVault release package.
2. Create this folder inside your vault:

   ```text
   <vault>/.obsidian/plugins/BrewVaultPlugin/
   ```

3. Copy the three files into that folder.
4. Restart Obsidian, or reload the app without saving.
5. Open **Settings → Community plugins** and enable **BrewVault**.

## Quick start

1. Open a Markdown note and run **BrewVault: Open preview** from the Command
   Palette (`Ctrl/Cmd + P`), or click the scroll icon in the ribbon.
2. Add a Homebrewery-style block, either by typing it or with
   **BrewVault: Insert block…**:

   ```markdown
   {{note
   ##### Rules Note
   This text is displayed as a Homebrewery note.
   }}
   ```

3. Run **BrewVault: Export current file as BrewVault PDF**. The PDF is saved to
   `BrewVault-Exports/` in your vault.

## Documentation

| Guide | Covers |
| --- | --- |
| [Commands](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/commands.md) | Every preview, export, and insert command, plus export file naming. |
| [Markdown syntax](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/syntax.md) | Blocks, inline tags, stat fields, spacing, page and column breaks, links, and images. |
| [Note properties](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/properties.md) | `bv_theme` for a theme per note, and the planned `bv_book` for combining notes. |
| [Settings](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/settings.md) | Plugin settings and custom CSS themes. |
| [Mobile support](https://github.com/luiserivaldo/BrewVaultPlugin/blob/main/docs/guide/mobile.md) | Mobile preview and the two mobile PDF methods: browser handoff and direct PDF. |

## Accreditation and licensing

BrewVault is inspired by and adapts theme resources from the open-source
[Homebrewery](https://github.com/naturalcrit/homebrewery) project by Scott
Tolksdorf and the NaturalCrit contributors. Homebrewery is distributed under
the MIT License. Vendored theme, font, and decorative-asset notices are kept
with their respective resources.

The project scaffold is adapted from the official, 0BSD-licensed
[Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
Third-party packages and assets remain subject to their own licenses.

BrewVault is an independent community project and is not affiliated with or
endorsed by NaturalCrit, Obsidian, or Wizards of the Coast. Dungeons & Dragons
and related marks are property of Wizards of the Coast.

BrewVault itself is released under the [MIT License](./LICENSE).
