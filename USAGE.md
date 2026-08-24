# How to Use BrewVault

This covers everything built through Milestone 4: opening the preview,
authoring with Homebrewery syntax, inserting snippets, and exporting.
For the design behind these features, see `ARCHITECTURE.md`; for what's
been verified vs. not, see `PROGRESS.md`.

## Commands

Open these from the Command Palette (`Ctrl/Cmd+P`) by typing "BrewVault"
or "Homebrewery", or use the ribbon icon (scroll icon in the left sidebar).

| Command | Input | Expected output |
|---|---|---|
| **Open Homebrewery Preview** | Run with any note open (or none). | Opens (or reveals, if already open) the "Homebrewery Preview" pane in the right sidebar. It follows whichever Markdown note is currently active. |
| **Preview current file as Homebrewery document** | Cursor/focus in a `.md` file. | Opens the preview pane pinned to *that specific file*, even if you later click into a different note (use "Open Homebrewery Preview" again, or click into the other note, to unpin). |
| **Insert monster stat block snippet** | Cursor placed in an open note, in edit mode. | Inserts a ready-to-edit `{{monster,wide ... }}` block (Goblin stat block as a starting template) at the cursor. |
| **Insert note block snippet** | Same as above. | Inserts a `{{note ... }}` block with placeholder callout text. |
| **Insert descriptive (read-aloud) block snippet** | Same as above. | Inserts a `{{descriptive ... }}` block with placeholder flavor text. |
| **Export current file as standalone Homebrewery HTML** | Cursor/focus in a `.md` file. | Writes `<note-name>.brew.html` next to the source note in your vault, and shows a confirmation notice. The file is fully self-contained (theme CSS inlined) — open it directly in any browser. |

## Turning an export into a PDF

Obsidian plugins can't call a system PDF renderer directly, so the export
command hands off to your browser instead:

1. Run **Export current file as standalone Homebrewery HTML**.
2. Open the resulting `<note-name>.brew.html` file in Chrome, Firefox, etc.
   (double-click it in your file manager, or drag it into a browser tab).
3. Use the browser's **Print → Save as PDF**. The exported file includes a
   `@media print` rule so each `.brewPage` prints on its own sheet instead
   of being cut off mid-page.

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
theme (bordered box in `phb`/`journal`, light-gray box in `blank`).

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
| **Theme** | `phb` (parchment/ink), `journal` (ink-on-cream, informal), or `blank` (plain page). Changes apply immediately to any open preview panes and to future exports. |
| **Page width / height (px)** | Size of each rendered "sheet of paper". Defaults (816×1056) approximate US Letter at 96dpi. |
| **Re-render debounce (ms)** | How long the preview waits after you stop typing before re-rendering. Lower = more responsive, higher = less flicker on fast typers. |

## Compatibility notes (what's not covered yet)

- No `{{footnote}}`/mustache variable substitution.
- No dedicated stat-block "legend" (`Key :: Value`) syntax — use bullet
  lists instead, as in the built-in snippet.
- No editor↔preview scroll sync.
- No direct PDF export (browser print hand-off only, see above).

These are tracked as Milestone 5+ in `ARCHITECTURE.md`.

## Try it yourself

`examples/sample-brew.md` in this repo exercises block containers,
inline spans, `\page`, and `\column` together — copy it into a vault with
BrewVault enabled and run **Open Homebrewery Preview** on it to see
everything in this guide in one place.
