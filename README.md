# BrewVault

BrewVault is a desktop-only Obsidian plugin that renders Markdown notes as
paginated, Homebrewery-style D&D 5e documents and exports them directly to HTML
or PDF.

Version `0.1.2` restores the stable native Obsidian Markdown editor after an
experimental Edit Mode caused missing text and severe performance regressions.
It also preserves existing exports by creating numbered copies.

## Next minor release

The isolated `feature/inline-tag-preview-wikilinks` branch targets `0.1.3`
after practical approval. It adds only three focused changes:

- Matched multiline Homebrewery tags such as `{{wide` … `}}` appear as compact
  labels in Obsidian's editor. Selecting a label reveals the exact source.
- Obsidian `[[wikilink]]` brackets are omitted from Homebrewery preview, HTML,
  and PDF output. Aliases remain visible as plain text, while unresolved
  `![[embeds]]` are suppressed.
- Explicit source `\page` directives appear in the Markdown editor as a
  full-width **Next page starts** separator; selecting it reveals `\page` for
  editing.

This implementation does not restore generated page-boundary decorations,
editor settings reconfiguration, or preview-to-editor callbacks from the
withdrawn experimental Edit Mode.

## Features

- Live Homebrewery preview that follows the active Markdown note.
- PHB parchment, SRD / Unearthed Arcana, and Blank themes.
- Standard Markdown plus Homebrewery block, inline, page, and column syntax.
- DOM-measured automatic pagination without modifying source Markdown.
- Direct US Letter PDF generation using Obsidian desktop's bundled Chromium.
- Self-contained HTML export.
- Configurable vault-relative export folder, defaulting to
  `BrewVault-Exports`.
- Collision-safe exports: existing files are preserved as `_1`, `_2`, and later
  numbered copies.
- Entirely local and offline; no external browser, server, or Chromium install
  is required.

## Installation

BrewVault is not yet published in Obsidian's Community Plugins directory.

1. Build the plugin with `npm install` followed by `npm run build`.
2. Create `<vault>/.obsidian/plugins/brewvault/`.
3. Copy `manifest.json`, `main.js`, and `styles.css` into that folder.
4. In Obsidian, open **Settings → Community plugins** and enable BrewVault.

BrewVault is desktop-only and requires Obsidian `0.15.0` or newer.

## Quick start

1. Open a Markdown note.
2. Run **Open Homebrewery Preview** from the Command Palette, or select the
   scroll icon in the ribbon.
3. Choose a theme and export folder under **Settings → BrewVault**.
4. Run **Export current file as Homebrewery PDF**.

For `Alchemist.md`, the first PDF is written to:

```text
BrewVault-Exports/Alchemist.pdf
```

If that path exists, subsequent exports use:

```text
BrewVault-Exports/Alchemist_1.pdf
BrewVault-Exports/Alchemist_2.pdf
```

HTML exports follow the same policy: `Alchemist.brew.html`, then
`Alchemist_1.brew.html`, and so on. No printer or save dialog opens for PDF
exports.

## Commands

| Command | Result |
| --- | --- |
| **Open Homebrewery Preview** | Opens or reveals the live preview for the active Markdown note. |
| **Export current file as HTML** | Writes a self-contained `.brew.html` document to the configured export folder. |
| **Export current file as Homebrewery PDF** | Exports using the theme selected in BrewVault settings. |
| **Export current file as Homebrewery PDF in PHB style** | Creates a one-off PHB parchment export. |
| **Export current file as Homebrewery PDF in SRD style** | Creates a one-off SRD / Unearthed Arcana export. |
| **Export current file as Homebrewery PDF in Blank style** | Creates a one-off plain export. |

Theme-specific commands do not change the saved preview theme.

## Homebrewery syntax

Block containers use an opening class line and a closing `}}` line:

```markdown
{{note
This is a callout box with **normal Markdown** inside it.
}}
```

Multiple classes may be separated with commas or spaces:

```markdown
{{monster,wide
## Elder Drake
Monster content goes here.
}}
```

Inline spans use a class followed by content:

```markdown
The attack deals {{damage 2d6 piercing}} damage.
```

Explicit page and column boundaries must appear on their own lines:

```markdown
First page content.

\page

Second page, first column.

\column

Second page, second column.
```

Headings, emphasis, links, blockquotes, lists, and Markdown tables are also
supported.

## Pagination

Pages default to `816 × 1056px`, corresponding to US Letter at 96 CSS dpi.
BrewVault measures the rendered document with the selected theme and creates
additional virtual pages at safe top-level block boundaries. Tables, lists, and
callouts are moved intact when possible. Explicit `\page` and `\column`
directives take precedence.

If one indivisible block is larger than a complete page, the preview flags it
for manual correction rather than silently discarding content.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| Theme | Player's Handbook | Preview and normal export appearance. |
| Export folder | `BrewVault-Exports` | Vault-relative output directory, created automatically. |
| Page width | `816px` | Rendered sheet width. |
| Page height | `1056px` | Rendered sheet height. |
| Re-render debounce | `250ms` | Delay after editing before preview refresh. |

The former exact default `BrewVault Exports` migrates automatically to
`BrewVault-Exports`; custom paths remain unchanged.

## Current limitations

- Desktop Obsidian only.
- Wide and split Homebrewery tables still need additional compatibility work.
- No editor-to-preview scroll synchronization.
- No Homebrewery mustache-variable or footnote substitution.
- Local fallback fonts and assets mean exact upstream pixel parity is not yet
  guaranteed for every theme.
- The experimental Homebrewery Edit Mode is not included in `0.1.2`.

## Build and test

```bash
npm install
npm run typecheck
npm test
npm run build
```

The production build generates `main.js` and `styles.css`. `main.js` is a build
artifact and is intentionally excluded from Git.

## Development branches

- `main` is the stable public major-release hub.
- `develop` contains stable development builds and only approved features.
- `feature/<name>` branches isolate individual features and start from
  `develop`; approval is required before merging back.
- Agent-named branches such as `claude` and `openclaw` are personal or
  experimental branches based on `develop`.

## Roadmap

Mobile PDF export is the next major milestone point. It remains investigation
only until mobile Obsidian rendering/file APIs and Android/iOS acceptance
requirements are defined. BrewVault remains desktop-only in the meantime, and
the verified Electron PDF path will not be weakened for a speculative fallback.

## Acknowledgements

BrewVault is inspired by the open-source
[Homebrewery](https://github.com/naturalcrit/homebrewery) project by Scott
Tolksdorf and the NaturalCrit contributors. Homebrewery is MIT-licensed.
BrewVault is an independent project and is not affiliated with or endorsed by
NaturalCrit, Obsidian, or Wizards of the Coast.

The initial build scaffold is adapted from the official, 0BSD-licensed Obsidian
sample plugin. Runtime and development dependency licenses remain governed by
their respective packages in `package-lock.json`.

## License

BrewVault is released under the [MIT License](./LICENSE).
