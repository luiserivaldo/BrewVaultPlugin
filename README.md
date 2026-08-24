# BrewVault

An Obsidian desktop plugin that renders your Markdown notes as
Homebrewery-style, paginated D&D 5e documents — right inside Obsidian.

> **Status:** covers Milestones 0–4 of the plan in
> [`ARCHITECTURE.md`](./ARCHITECTURE.md). See [`PROGRESS.md`](./PROGRESS.md)
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
- Three theme variants: `phb` (parchment/ink), `journal` (ink-on-cream,
  informal), and `blank` (plain page), plus configurable page
  width/height and re-render debounce, in Settings.
- Snippet-insertion commands for common blocks (monster stat block, note,
  descriptive/read-aloud text).
- Export the active note to a standalone, self-contained HTML file for
  printing to PDF from a browser.

See [`USAGE.md`](./USAGE.md) for the full command list and syntax
reference, and [`examples/sample-brew.md`](./examples/sample-brew.md) for
a note that exercises the syntax end to end.

## Building

```bash
npm install
npm run build      # one-shot production build -> main.js, styles.css
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

Milestone 5+ (not built yet): editor↔preview scroll sync, `{{footnote}}`
variables, direct PDF export without a browser round-trip.
