# How to Use BrewVault

This covers the current Milestone 6 command surface: previewing, Homebrewery syntax, automatic pagination, and export.
For the design behind these features, see `ARCHITECTURE.md`; for what's
been verified vs. not, see `PROGRESS.md`.

## Commands

Open these from the Command Palette (`Ctrl/Cmd+P`) by typing "BrewVault"
or "Homebrewery", or use the ribbon icon (scroll icon in the left sidebar).

| Command | Input | Expected output |
|---|---|---|
| **Open Homebrewery Preview** | Run with a Markdown note open. | Opens or reveals the live Homebrewery preview and follows the active Markdown note. |
| **Export current file as HTML** | Cursor/focus in a `.md` file. | Writes `<note-name>.brew.html` next to the source note. The document is self-contained and uses the same automatically paginated page snapshot as preview/PDF. |
| **Export current file as Homebrewery PDF** | Cursor/focus in a `.md` file. | Opens the Chromium/Electron print dialog for the automatically paginated Homebrewery document. |

## Turning an export into a PDF

Two ways to get a PDF, from most to least convenient:

1. **Export current file as Homebrewery PDF** (recommended) — opens the
   system print dialog directly from Obsidian; choose "Save as PDF" as
   the destination/printer.
2. **Export current file as HTML**, then:
   1. Open the resulting `<note-name>.brew.html` file in Chrome, Firefox,
      etc. (double-click it in your file manager, or drag it into a
      browser tab).
   2. Use the browser's **Print → Save as PDF**.

Both paths include a `@media print` rule so each `.brewPage` prints on its
own sheet instead of being cut off mid-page.

## Pagination: how page size actually works

Pages are fixed-size US Letter sheets by default (`816×1056px`, equivalent to 8.5×11in at 96 CSS dpi). BrewVault measures the rendered DOM using the active theme and automatically creates additional virtual pages whenever content would flow beyond the two physical columns. These virtual breaks exist only in the rendered/exported copy; the source `.md` file is never modified.

Explicit `\page` remains a hard page boundary and `\column` remains a hard column boundary. Automatic pagination only fills the gaps between those explicit markers. BrewVault splits between top-level rendered blocks so a table, callout, or list is moved intact when possible. If one indivisible block is itself larger than a whole page, the preview flags that block/page for manual correction rather than emitting broken markup.

## Homebrewery syntax reference

All of the following (except tables, which are provided by standard
Markdown) are read from your note by the plugin's `markdown-it` pipeline.
This is a variant subset of Homebrewery's syntax — see "Compatibility
notes" below for what's not (yet) covered.

### Block containers — `{{className ... }}`

**Input:**
```
{{note
This is a callout box.
}}
```
**Output:** a `<div class="brewBlock brew-note">` styled per the active
theme (`phb`, `srd`, or `blank`).

Multiple classes, comma- or space-separated:
```
{{monster,wide
## Goblin
...
}}
```
**Output:** `<div class="brewBlock brew-monster brew-wide">` — `brew-wide`
is a built-in helper class that spans both columns (`column-span: all`).

Any Markdown — headings, bold/italic, lists, tables — can go inside a
block and is parsed normally, including nested blocks.

Requirements: the opening line must be exactly `{{` followed by the class
name(s) and nothing else; the closing line must be exactly `}}`.

### Inline spans — `{{className text}}`

**Input:**
```
The trap deals {{damage 2d6 piercing}} damage.
```
**Output:** `<span class="brew-damage">2d6 piercing</span>` inline within
the paragraph. (Note the required space between the class name and the
content — that's what distinguishes this from a block container.)

### Page break — `\page`

**Input:**
```
Page one content.

\page

Page two content.
```
**Output:** two separate `.brewPage` elements in the preview (and two
`<div class="brewPage">` sections in an HTML export), each numbered.
`\page` must be on its own line.

### Column break — `\column`

**Input:**
```
Left column content.

\column

Right column content.
```
**Output:** a forced break to the next CSS column within the same page
(pages are two columns by default). `\column` must be on its own line.

### Standard Markdown

Headings, bold/italic, links, blockquotes, ordered/unordered lists, and
GitHub-style tables all pass through normally and pick up the active
theme's typography (e.g. the PHB theme adds a drop cap to the first
paragraph of each page, styled headings, etc.).

## Settings

Settings → BrewVault:

| Setting | Effect |
|---|---|
| **Theme** | `phb` (Player's Handbook parchment), `srd` (SRD / Unearthed Arcana), or `blank`. Changes apply immediately to preview and export. |
| **Page width / height (px)** | Size of each rendered "sheet of paper". Defaults (816×1056) approximate US Letter at 96dpi. |
| **Re-render debounce (ms)** | How long the preview waits after you stop typing before re-rendering. Lower = more responsive, higher = less flicker on fast typers. |

## Compatibility notes (what's not covered yet)

- No `{{footnote}}`/mustache variable substitution.
- No dedicated stat-block "legend" (`Key :: Value`) syntax — use bullet
  lists instead, as in the built-in snippet.
- No editor↔preview scroll sync.
- PHB geometry, colors, table rules, and type scale are aligned to Homebrewery V3 conventions, but BrewVault still uses local fallback fonts and does not yet vendor every upstream theme asset. Exact pixel parity remains an M7 target.

These are tracked in `MILESTONES.md`.

## Try it yourself

`examples/sample-brew.md` in this repo exercises block containers,
inline spans, `\page`, and `\column` together — copy it into a vault with
BrewVault enabled and run **Open Homebrewery Preview** on it to see
everything in this guide in one place.

## Export folder

BrewVault creates `BrewVault Exports` in the vault root the first time a file-based export needs it. Change this under **Settings → BrewVault → Export folder**. Paths are vault-relative and nested folders are created automatically.

`Export current file as HTML` writes `<note-name>.brew.html` into that folder. PDF commands open Chromium/Electron's Save as PDF flow; the system dialog controls the final PDF destination.

## PDF theme commands

- **Export current file as Homebrewery PDF** — uses the theme configured in BrewVault settings.
- **Export current file as Homebrewery PDF in PHB style** — one-off PHB export.
- **Export current file as Homebrewery PDF in SRD style** — one-off SRD export.
- **Export current file as Homebrewery PDF in Blank style** — one-off Blank export.

The one-off commands do not change the saved preview/default export theme. Their stable command IDs are intended to remain suitable for command-palette and Obsidian CLI use.
