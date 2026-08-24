# BrewVault

An Obsidian desktop plugin that renders your Markdown notes as
Homebrewery-style, paginated D&D 5e documents — right inside Obsidian.

> **Status:** Milestone 6 (export parity and automatic pagination) is in progress.
> See [`MILESTONES.md`](./MILESTONES.md) for the current acceptance gates and [`PROGRESS.md`](./PROGRESS.md)
> for exactly what's done and verified, and [`USAGE.md`](./USAGE.md) for a
> full command reference with expected input/output.

## What it does today

- Adds a "Homebrewery Preview" pane (ribbon icon + command palette entry)
  that renders the active Markdown note as one or more paginated,
  themed pages, live-updating as you type.
- Supports Homebrewery's core authoring syntax on top of standard
  Markdown:
  - `{{className\n ... \n}}` — block containers (notes, stat blocks, etc.),
    including multi-class like `{{monster,wide}}`.
  - `{{className content}}` — inline styled spans.
  - `\page` — starts a new page.
  - `\column` — forces a column break within a page.
- Theme variants: `phb` (Player's Handbook parchment), `srd` (SRD / Unearthed Arcana), and `blank`, plus configurable page size and re-render debounce.
- Export the active note as self-contained HTML or open the Homebrewery PDF print flow directly from Obsidian.
- Page-aware rendering automatically creates additional virtual pages when content exceeds the fixed two-column sheet, without editing the source Markdown. Explicit `\page` and `\column` markers remain supported.

See [`USAGE.md`](./USAGE.md) for the full command list and syntax
reference, and [`examples/sample-brew.md`](./examples/sample-brew.md) for
a note that exercises the syntax end to end.

## Building

```bash
npm install
npm run build      # CSS snapshot -> typecheck -> production build (main.js, styles.css)
npm run dev         # esbuild watch mode
```

## Installing into a vault (unpublished/dev install)

1. `npm run build`.
2. Copy (or symlink) `manifest.json`, `main.js`, and `styles.css` into
   `<your-vault>/.obsidian/plugins/brewvault/`.
3. In Obsidian: Settings → Community plugins → enable "BrewVault".
   (Community plugins must be enabled, since this isn't published to the
   official directory.)

## Project layout

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design write-up,
module-by-module.

## Roadmap

Milestone 6 is focused on Homebrewery export parity and automatic pagination. Later milestones add the remaining upstream themes, vault assets, and release hardening.
