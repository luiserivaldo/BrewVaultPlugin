# BrewVault Architecture

> Status: the upstream repository (`luiserivaldo/BrewVaultPlugin`) contained no
> source code or design docs at the time this work started — only a
> `.gitattributes` file. This document is the proposed architecture, written
> as the foundation for the build. It should be treated as a draft the
> maintainer can amend.

## 1. Goal

An Obsidian desktop plugin that takes a Markdown note (optionally using
Homebrewery's authoring syntax — `{{blocks}}`, `\page`, `\column`, inline
spans, etc.) and renders it inside Obsidian as a paginated, D&D-5e-styled
document, visually equivalent to what [Homebrewery](https://homebrewery.naturalcrit.com/)
produces in the browser, without requiring the user to leave their vault.

Non-goals for the initial versions: two-way sync back to Homebrewery.com,
live collaborative editing, mobile support (Homebrewery-style CSS relies on
fixed-size "paper" pages that don't translate well to small screens yet).

## 2. High-level approach

Homebrewery is, at its core, three things layered on top of Markdown:

1. **A themed CSS stylesheet** (the "Player's Handbook" style: parchment
   background, drop caps, page borders, two-column layout, ornamental
   headers).
2. **A syntax extension on top of CommonMark**: block containers
   (`{{note ... }}`), inline styled spans (`{{className content}}`),
   explicit page breaks (`\page`) and column breaks (`\column`), and a few
   mustache-style injected variables.
3. **A pagination model**: content is split into fixed-size "pages" (divs
   sized like a sheet of paper) rather than flowing indefinitely like normal
   Markdown preview.

BrewVault reproduces this pipeline locally:

```
 vault note (.md)
        │
        ▼
 ┌───────────────────┐
 │ Source Reader      │  reads active file / linked file via Obsidian Vault API
 └─────────┬──────────┘
           ▼
 ┌───────────────────┐
 │ Brew Markdown      │  markdown-it instance + custom rules:
 │ Parser             │   - block container rule ({{ }})
 │ (src/renderer)      │   - inline span rule ({{ }})
 │                    │   - \page / \column block rules
 │                    │   - passthrough for standard CommonMark
 └─────────┬──────────┘
           ▼
 ┌───────────────────┐
 │ Page Splitter       │  groups the rendered HTML into an array of
 │                    │  "page" HTML fragments on \page boundaries
 └─────────┬──────────┘
           ▼
 ┌───────────────────┐
 │ HomebreweryView     │  an Obsidian ItemView (a leaf in the workspace)
 │ (src/view)         │  that mounts the generated pages into a scrollable,
 │                    │  themed container and re-renders on file change
 └─────────┬──────────┘
           ▼
 ┌───────────────────┐
 │ Theme CSS           │  styles.css, scoped under a container class so it
 │ (src/styles)        │  never leaks into the rest of Obsidian's UI
 └────────────────────┘
```

## 3. Module layout

```
BrewVaultPlugin/
├─ manifest.json          Obsidian plugin manifest
├─ package.json
├─ tsconfig.json
├─ esbuild.config.mjs      bundles src/main.ts -> main.js, and styles -> styles.css
├─ versions.json
├─ src/
│  ├─ main.ts              Plugin entry: registers view, commands, settings
│  ├─ settings/
│  │   ├─ types.ts         BrewVaultSettings interface + defaults
│  │   └─ SettingTab.ts    Obsidian PluginSettingTab UI
│  ├─ view/
│  │   └─ HomebreweryView.ts   ItemView subclass, owns the DOM + re-render loop
│  └─ renderer/
│      ├─ index.ts          renderBrewMarkdown(source) -> Page[]
│      ├─ markdownEngine.ts  configured markdown-it instance
│      ├─ pageSplitter.ts    splits rendered HTML on page-break markers
│      └─ rules/
│          ├─ blockContainer.ts   {{class\n...\n}} -> <div class="class">
│          ├─ inlineSpan.ts       {{class content}} -> <span class="class">
│          ├─ pageBreak.ts        \page -> page-break marker token
│          └─ columnBreak.ts      \column -> <div class="columnSplit">
└─ styles/
   └─ phb-theme.css         Player's-Handbook-inspired paginated theme
```

### Why markdown-it (not Obsidian's own renderer)

Obsidian's built-in Markdown pipeline is deeply tied to its live-preview
editor (CodeMirror 6) and its own extension API (`registerMarkdownPostProcessor`).
That API processes already-rendered HTML fragment-by-fragment and cannot
easily express "split the whole document into paginated page containers" or
introduce Homebrewery's custom block-container grammar. Rendering into a
dedicated `ItemView` with an independent `markdown-it` pipeline gives full
control over pagination and custom syntax while keeping zero risk of
destabilizing Obsidian's normal editor/preview.

### Data flow at runtime

1. `main.ts` registers the view type `brewvault-preview` and a command /
   ribbon icon "Open Homebrewery Preview".
2. `HomebreweryView` listens to `vault.on('modify')` and the workspace's
   active-leaf-change event for the source file it is tracking.
3. On any relevant change, it re-reads the file via `app.vault.cachedRead`,
   passes the text through `renderBrewMarkdown`, and replaces its container's
   children with the returned page elements.
4. Rendering is debounced (250ms) so typing doesn't trigger a re-render per
   keystroke.

## 4. Milestones

| # | Milestone | Scope |
|---|-----------|-------|
| 0 | Scaffolding | Obsidian sample-plugin skeleton building cleanly with esbuild/TS, plugin loads in Obsidian, settings tab shell. |
| 1 | Themed static preview | Custom `HomebreweryView` pane renders standard CommonMark from the active note inside the PHB-style paginated theme (parchment page, two columns, drop caps, headers). No custom syntax yet — this validates the view/pagination/theme plumbing. |
| 2 | Homebrewery syntax layer | `markdown-it` custom rules for block containers `{{ }}`, inline spans `{{ }}`, `\page`, `\column`. Multi-page documents render as distinct page elements. Settings for theme variant. |
| 3 | Authoring aids & themes | Snippet-insertion command for common blocks (starting with a monster stat block), a third theme (`journal`), and settings support for it. |
| 4 | Export | Command to export the active note's rendered pages as a single, self-contained standalone HTML file (theme CSS inlined) written into the vault — the hand-off point for printing to PDF from a browser, since Obsidian's plugin API has no native "print to PDF" hook. |
| 5 | Bug fixes from real-world testing | Build-time CSS embedding (fixes broken export styling), fixed-height pages with an overflow warning (fixes the "one endless page" issue), `break-inside: avoid` on tables (fixes tables splitting across columns), and an in-app "print to PDF" command via a hidden iframe (no browser round-trip required). |
| 6 (future) | Editor↔preview scroll sync, `{{footnote}}`/mustache variables, true automatic re-pagination (dynamically slicing overflow content into synthetic extra pages). |

This build covers milestones 0–5.

## 5. Settings (v0)

```ts
interface BrewVaultSettings {
  theme: 'phb' | 'blank';   // which stylesheet variant to apply
  pageWidthPx: number;      // page width, default 816 (8.5in @ 96dpi)
  pageHeightPx: number;     // page height, default 1056 (11in @ 96dpi)
  debounceMs: number;       // re-render debounce, default 250
}
```

## 6. Known limitations at end of Milestone 2

- No stat-block/snippet macro expansion yet (planned M3).
- No PDF/HTML export yet (planned M4).
- Theme CSS is an original approximation of the Player's Handbook look,
  not a copy of Homebrewery's own stylesheet.
- Mobile Obsidian is untested/unsupported (paginated fixed-width layout).

## 7. Milestone 3 design — authoring aids & themes

- **Snippet commands**: `addCommand` with `editorCallback` inserts
  boilerplate text at the cursor (e.g. a `{{monster}}` block pre-filled
  with the 5e stat block fields). Kept as plain string templates in
  `src/snippets/` so more can be added without touching plugin plumbing.
- **`journal` theme**: a third CSS variant (parchment-free, ink-on-cream,
  narrative-journal look) alongside `phb` and `blank`, following the same
  `.brewvault-theme-<name>` scoping convention as the existing themes.

## 8. Milestone 4 design — export

Obsidian's plugin API does not expose a native "export to PDF" call, and
shelling out to a headless renderer isn't reasonable for a desktop plugin
users install by copying three files. So M4 targets the practical
hand-off point instead:

```
 active note
      │  (same renderBrewMarkdown() used by the live preview)
      ▼
 BrewPage[]
      │
      ▼
 buildStandaloneHtml(pages, theme, BUNDLED_THEME_CSS, title)
      │  wraps pages in a full <html><head><style>...inlined theme CSS...
      │  </style></head><body>...</body></html> document — no external
      │  file references, so it opens correctly from anywhere
      ▼
 written into the vault as "<note-name>.brew.html"
      │
      ▼
 user opens it in a regular browser and uses the browser's own
 "Print → Save as PDF" — which correctly paginates our fixed-size
 `.brewPage` divs since @media print rules are included in the export.
```

`BUNDLED_THEME_CSS` is a build-time-generated string constant (see §9.1 —
this replaced an original runtime-disk-read design that turned out to
fail silently in practice), so the exported HTML always matches what the
in-app preview showed — there is exactly one theme stylesheet, not two
implementations to keep in sync, and no file I/O that can fail at export
time.

## 9. Milestone 5 design — fixes from first real-world Obsidian testing

Early hands-on testing (screenshots + PDF exports from a real vault) surfaced
four issues, each addressed below.

### 9.1 Exported HTML had no theme CSS applied

**Root cause**: `exportFileAsHtml()` read the plugin's `styles.css` off disk
at export time via `app.vault.adapter.read()`. That read failed silently
(caught and swallowed, returning `""`), so every export shipped with only
the inline layout rules from `buildStandaloneHtml()` and none of the theme
(`phb`/`journal`/`blank`) rules — confirmed by inspecting the reported
export's `<style>` block, which contained the `:root`/`body`/`@media print`
rules but none of the `.brewvault-theme-*` rules.

**Fix**: stop reading CSS from disk at export time entirely. The build
(`esbuild.config.mjs`) now bundles `styles/index.css` to `styles.css` as
before, then reads that same output and writes it into a generated module,
`src/generated/themeCss.ts`, exporting `BUNDLED_THEME_CSS` as a plain
string constant. The exporter imports that constant directly, so the CSS
that ships in `main.js` and the CSS that ships in every export are
guaranteed to be byte-identical, with zero runtime file I/O and zero
failure mode.

### 9.2 Preview renders as one endless two-column page instead of separate pages

**Root cause**: `.brewPage` used `min-height` (not a fixed `height`). CSS
multi-column layout with an unbounded height just keeps growing both
columns to fit *all* content, rather than the fixed-size "sheet of paper"
Homebrewery pages are meant to be. Real Homebrewery pages are a fixed
height too — it does not auto-paginate either; long content is expected to
be split by the *author* using `\page`, and content that isn't split
simply overflows the page.

**Fix**: `.brewPage` now uses a fixed `height: var(--brew-page-height)`
with `overflow: hidden`, matching Homebrewery's actual (manual-pagination)
model instead of silently growing forever. Since a silently-clipped page is
a worse experience than Homebrewery's own, BrewVault adds something
Homebrewery doesn't have: after each render, `HomebreweryView` measures
`scrollHeight` vs `clientHeight` for every page and, if content is being
clipped, adds a dashed-outline `brewPageOverflow` class plus a small
"content overflows — add `\page` or `\column`" badge. This is documented
in `USAGE.md` as expected behavior, not a bug — full automatic
re-pagination (dynamically slicing overflow into synthetic extra pages) is
tracked as a Milestone 6 idea, not attempted here, since Homebrewery itself
doesn't do this and it's a substantial undertaking (would require
measuring rendered DOM height and re-flowing source content, not just
CSS).

### 9.3 Tables appeared broken

Tables were re-tested against several real-world shapes (immediately after
a heading with no blank line, immediately after a paragraph with no blank
line, alignment-colon syntax, tables nested inside `{{blocks}}`) and all
parsed and rendered correctly — the Markdown parsing was never the
problem. The far more likely cause is CSS multi-column layout splitting a
table's rows across a column boundary, which renders as a visually broken
table (a row's cells separated from its header) even though the HTML
itself is well-formed. **Fix**: added `break-inside: avoid-column` to
table rules in `base.css` so a table is pushed whole into the next column
rather than split.

### 9.4 No way to produce a PDF without leaving Obsidian

**Fix**: new command "Print current file as Homebrewery PDF" builds the
same standalone HTML used by the export command (with CSS embedded per
9.1) into a hidden, off-screen `<iframe>`, then calls the iframe's own
`window.print()` once it finishes loading. This invokes the normal
OS/Electron print dialog — including a "Save as PDF" printer — without
requiring the user to save a file and open it in an external browser
first. Obsidian's own core "Export to PDF" command isn't reusable here
because it prints whatever the currently-focused pane is (the Markdown
editor/reading view), not an arbitrary custom `ItemView`'s DOM; driving
`print()` on our own iframe sidesteps that limitation entirely.

