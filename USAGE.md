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
| **Print current file as Homebrewery PDF** | Cursor/focus in a `.md` file. | Renders the file the same way the preview does, then directly opens your system's print dialog (with "Save as PDF" as a printer option) — no save-then-reopen-in-browser step needed. |

## Turning an export into a PDF

Two ways to get a PDF, from most to least convenient:

1. **Print current file as Homebrewery PDF** (recommended) — opens the
   system print dialog directly from Obsidian; choose "Save as PDF" as
   the destination/printer.
2. **Export current file as standalone Homebrewery HTML**, then:
   1. Open the resulting `<note-name>.brew.html` file in Chrome, Firefox,
      etc. (double-click it in your file manager, or drag it into a
      browser tab).
   2. Use the browser's **Print → Save as PDF**.

Both paths include a `@media print` rule so each `.brewPage` prints on its
own sheet instead of being cut off mid-page.

## Pagination: how page size actually works

Pages are a **fixed size** (`816×1056px` by default, matching US Letter at
96dpi) — they do not grow to fit your content, and BrewVault does not
auto-paginate long notes into extra pages for you. This matches how real
Homebrewery pages behave: a page is a fixed "sheet of paper," and long
content is split by the *author*, using `\page` and `\column`, not
generated automatically.

If a page's content doesn't fit, it's clipped — but BrewVault flags this
for you (which stock Homebrewery doesn't): an overflowing page gets a
dashed red outline and a small "Content overflows — add `\page` or
`\column`" badge in its top-right corner, both in the live preview and in
the standalone HTML export. If you see that badge, insert a `\page` (or
`\column`, if you just want to force the rest into the next column of the
same page) at the point in your source where you'd like the split.

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
- No true *automatic* re-pagination — see "Pagination" above. Overflow is
  flagged, not auto-fixed; you still add the `\page`/`\column` yourself,
  same as in real Homebrewery.
- The theme CSS is an original approximation of Homebrewery's visual
  style, not a byte-for-byte copy of its stylesheet, so exact spacing,
  font choices, and how the browser balances content across the two CSS
  columns can differ slightly from a native homebrewery.naturalcrit.com
  export even for identical source text. This is expected, not a bug —
  if pixel-perfect parity with native Homebrewery output matters for a
  specific document, treat BrewVault's preview as a close approximation
  for in-app editing rather than a guaranteed exact match.

These are tracked as Milestone 6+ in `ARCHITECTURE.md`.

## Try it yourself

`examples/sample-brew.md` in this repo exercises block containers,
inline spans, `\page`, and `\column` together — copy it into a vault with
BrewVault enabled and run **Open Homebrewery Preview** on it to see
everything in this guide in one place.
