# Build Progress

Tracked so work can resume cleanly after any interruption. See
`ARCHITECTURE.md` for milestone definitions.

## Milestone 0 — Scaffolding
Status: ✅ Complete

- [x] `manifest.json`, `package.json`, `tsconfig.json`
- [x] `esbuild.config.mjs` (bundles `src/main.ts` -> `main.js`, and
      `styles/*.css` -> `styles.css`)
- [x] `versions.json`, `.gitignore`
- [x] `src/main.ts` plugin skeleton: `onload`/`onunload`, registers the
      `brewvault-preview` view type, adds a ribbon icon + command to open it,
      adds a settings tab.
- [x] `src/settings/types.ts` + `src/settings/SettingTab.ts`
- [x] Project builds with `npm run build` with zero TypeScript errors.

## Milestone 1 — Themed static preview
Status: ✅ Complete

- [x] `src/view/HomebreweryView.ts`: `ItemView` that tracks the active
      Markdown file, reads it, and renders it into a scrollable container.
- [x] `src/renderer/markdownEngine.ts`: base `markdown-it` instance
      (CommonMark + tables + strikethrough) reused by later milestones.
- [x] `src/renderer/index.ts`: `renderBrewMarkdown()` entry point returning
      an array of page HTML strings (single page in this milestone, since
      `\page` support lands in Milestone 2).
- [x] `styles/phb-theme.css`: parchment-styled, fixed-size page with two
      columns, drop caps on first paragraph, decorative headings.
- [x] Re-render wired to `vault.on('modify')` + `workspace.on('active-leaf-change')`,
      debounced.
- [x] Command "Open Homebrewery Preview" opens the view in a new leaf.

## Milestone 2 — Homebrewery syntax layer
Status: ✅ Complete

- [x] `src/renderer/rules/blockContainer.ts` — `{{className\n...\n}}` block
      syntax, including comma-separated multi-class (`{{note,wide}}`),
      compiled as a markdown-it block rule (nested block parsing preserved).
- [x] `src/renderer/rules/inlineSpan.ts` — inline `{{className content}}`
      span syntax.
- [x] `src/renderer/rules/pageBreak.ts` — `\page` on its own line becomes a
      page-break marker token.
- [x] `src/renderer/rules/columnBreak.ts` — `\column` on its own line becomes
      a forced column break (`<div class="columnSplit">`).
- [x] `src/renderer/pageSplitter.ts` — splits the rendered token stream into
      one HTML fragment per page (on page-break markers), each wrapped in a
      themed page `<div>`.
- [x] `HomebreweryView` updated to render N pages instead of one flat
      document.
- [x] Settings: `theme` (`phb` / `blank`) and page size wired through to the
      view container's CSS variables.
- [x] Sample vault note (`examples/sample-brew.md`) exercising all of the
      above syntax for manual verification in Obsidian.

## Verification performed

- `npx tsc -noEmit -skipLibCheck` passes with zero errors across the whole
  `src/` tree (settings, view, renderer, rules).
- `node esbuild.config.mjs production` produces `main.js` and `styles.css`
  cleanly with no bundler warnings.
- The renderer pipeline (`markdownEngine.ts` + all four custom rules) was
  exercised standalone against `examples/sample-brew.md`, which contains
  nested `{{descriptive}}`, `{{note}}`, and `{{monster,wide}}` block
  containers, a `\column` break, and a `\page` break. Output confirmed:
  - Correct `<div class="brewBlock brew-<name>">` wrapping, including
    multi-class blocks (`brew-monster brew-wide`).
  - `\column` emitted as `<div class="columnSplit"></div>` inline with
    surrounding content (not swallowed by paragraph parsing).
  - `\page` correctly split the single rendered HTML string into two
    distinct page fragments.
  - Nested Markdown (headings, bold, italics, lists) inside block
    containers rendered correctly, confirming `state.md.block.tokenize`
    recursion works as designed.

What was **not** verified (requires a real Obsidian install, which this
environment doesn't have): the plugin loading inside the Obsidian desktop
app itself, ribbon icon / command palette wiring, and the settings tab UI
rendering. The code follows the standard Obsidian plugin API surface
(`Plugin`, `ItemView`, `PluginSettingTab`) closely enough that this is a
low-risk gap, but it should be the first thing checked when this is loaded
into a real vault.



## Milestone 3 — Authoring aids & themes
Status: ✅ Complete

- [x] `src/snippets/templates.ts` — plain-text snippet templates: monster
      stat block, note block, descriptive block.
- [x] Editor commands wired in `main.ts` (`editorCallback`) to insert each
      snippet at the cursor: "Insert monster stat block snippet", "Insert
      note block snippet", "Insert descriptive (read-aloud) block snippet".
- [x] `styles/journal-theme.css` — third theme (ink-on-cream, informal
      look), added to `styles/index.css` and the `BrewTheme` type.
- [x] Settings dropdown updated to offer `phb` / `journal` / `blank`.
- [x] `HomebreweryView` updated to clear all three theme classes on
      re-render (previously only knew about two).

## Milestone 4 — Export
Status: ✅ Complete

- [x] `src/export/buildStandaloneHtml.ts` — wraps rendered `BrewPage[]`
      into a complete, self-contained HTML document with the theme CSS
      inlined and a `@media print` rule so pages print one-per-sheet.
- [x] `main.ts` command "Export current file as standalone Homebrewery
      HTML": renders the active file with the same `renderBrewMarkdown()`
      used by the live preview, reads the plugin's own compiled
      `styles.css` off disk via `app.vault.adapter.read()`, and writes
      `<note-name>.brew.html` next to the source note (creating or
      overwriting as needed), with a confirmation `Notice`.
- [x] Documented the "export → open in browser → Print to PDF" hand-off
      in `ARCHITECTURE.md` (§8) and `USAGE.md`, since Obsidian's plugin API
      has no native PDF-export hook.

## Verification performed

- `npx tsc -noEmit -skipLibCheck` passes with zero errors across the whole
  `src/` tree (settings, view, renderer, rules, snippets, export).
- `node esbuild.config.mjs production` produces `main.js` (159KB) and
  `styles.css` (4 themes bundled) cleanly with no bundler warnings.
- The renderer pipeline was exercised standalone against
  `examples/sample-brew.md` (Milestones 1–2 syntax: nested `{{descriptive}}`,
  `{{note}}`, `{{monster,wide}}` blocks, `\column`, `\page`) with correct
  output confirmed for block wrapping, multi-class blocks, column-break
  placement, and page splitting (2 pages).
- All three snippet templates (`MONSTER_STAT_BLOCK_SNIPPET`, `NOTE_SNIPPET`,
  `DESCRIPTIVE_SNIPPET`) were rendered standalone through the same
  pipeline and confirmed to produce clean, correctly-nested HTML (the
  monster snippet's table and bullet-list stat lines render properly;
  an earlier draft using Homebrewery's `Key :: Value` legend syntax was
  replaced with bullet lists after testing showed `::` has no dedicated
  rule in this build and rendered as squished plain text — noted as a
  Milestone 5 gap below).
- `buildStandaloneHtml()` was run against the sample note for all three
  themes (`phb`, `journal`, `blank`) and each output file was confirmed to:
  start with `<!DOCTYPE html>`, inline the full theme stylesheet, contain
  the correct page count (2 `.brewPage` divs), include the `@media print`
  block, and carry the correct `brewvault-theme-<name>` class.

What was **not** verified (requires a real Obsidian install, which this
environment doesn't have): the plugin loading inside the Obsidian desktop
app itself, ribbon icon / command palette wiring, the settings tab UI,
`editor.replaceSelection()` behavior in a live editor, and
`app.vault.adapter.read()` resolving the plugin's `styles.css` path at
runtime (the path is built from `vault.configDir` + `manifest.id`, which
is correct per Obsidian's documented plugin layout, but untested end to
end). This should be the first thing checked when this is loaded into a
real vault.

## Milestone 5 — Fixes from first real-world Obsidian testing
Status: ✅ Complete

Triggered directly by user-reported feedback (screenshot + exported HTML/PDF
samples from a real vault) after Milestone 4. Each item below traces to a
specific piece of that feedback — see `ARCHITECTURE.md` §9 for full root
cause + fix write-ups.

- [x] **"Export to html works, but does not apply CSS elements."**
      Root cause confirmed by inspecting the reported `.html` export: its
      `<style>` block had only the inline layout rules, none of the
      `.brewvault-theme-*` rules — `app.vault.adapter.read()` was failing
      silently at export time. Fixed by embedding the built `styles.css`
      into `main.js` at **build time** instead: `scripts/build-css.mjs`
      bundles the CSS, then snapshots it into a generated
      `src/generated/themeCss.ts` (`export const BUNDLED_THEME_CSS = "..."`)
      that both the exporter and the new PDF-print command import directly.
      Zero runtime file I/O in this path now.
- [x] **"Renderer is unaware of Page Separation, rendering a whole document
      as an incredibly long vertical document in two columns."** Root
      cause: `.brewPage` used `min-height` instead of a fixed `height`, so
      CSS multi-column layout just grew forever instead of behaving like a
      real fixed-size Homebrewery page. Fixed: `.brewPage` is now a fixed
      `height: var(--brew-page-height)` with `overflow: hidden` — matching
      Homebrewery's own manual-pagination model (long content is expected
      to be split by the author with `\page`/`\column`, not
      auto-paginated — Homebrewery doesn't auto-paginate either). Since a
      silent clip is worse than Homebrewery's own feedback-free clip,
      `HomebreweryView.flagOverflowingPages()` now measures each rendered
      page's `scrollHeight` vs `clientHeight` after render and adds a
      dashed red outline + "Content overflows — add `\page` or `\column`"
      badge when content is being cut off.
- [x] **"Incapable of rendering Obsidian tables."** Re-tested table parsing
      against several real-world shapes (table directly after a heading
      with no blank line, directly after a paragraph with no blank line,
      alignment-colon syntax, tables nested inside `{{blocks}}`) — all
      parsed and rendered correctly, so this wasn't a parsing bug. The
      likely actual cause: CSS multi-column layout splitting a table's
      rows across a column boundary, which looks broken even though the
      HTML is valid. Fixed: added `break-inside: avoid-column` (+ legacy
      `page-break-inside: avoid`) to table rules in `base.css` so a table
      is pushed whole into the next column instead of split mid-row.
- [x] **"There also needs to be a plugin option to render the pdf as
      previewed."** New command "Print current file as Homebrewery PDF"
      (`src/main.ts` → `printFileAsPdf()`): builds the same standalone
      HTML as the export command, loads it into a hidden off-screen
      `<iframe>`, and calls the iframe's own `window.print()` once loaded
      — opening the normal OS/Electron print dialog (with "Save as PDF")
      without a save-then-reopen-in-browser round trip.
- [x] Build pipeline restructured: `scripts/build-css.mjs` is now a shared,
      standalone module used both as an `npm run build` pre-step (so
      `tsc` has `src/generated/themeCss.ts` to type-check against) and by
      `esbuild.config.mjs`'s watch mode (re-snapshotting + rebuilding
      `main.js` whenever a `styles/*.css` file changes).

## Verification performed (Milestone 5)

- `npm run build` (now: CSS snapshot → `tsc -noEmit` → esbuild production)
  passes clean end to end from a fully wiped `main.js`/`styles.css`/
  `src/generated/` state.
- Confirmed `src/generated/themeCss.ts`'s `BUNDLED_THEME_CSS` string
  contains the `.brewvault-theme-phb .brewPage` rule (previously absent
  from real exports), a fixed `height:var(--brew-page-height)` declaration
  for `.brewPage` with **no** `min-height` present, and the new
  `break-inside:avoid-column` table rule — checked programmatically, not
  just by eye.
- Reconstructed the reported "Longren (Dragonfolk)" note as
  `examples/longren-dragonfolk.md` (from the content in the user's PDFs,
  since the original `.md` source wasn't attached) and ran it through
  `buildStandaloneHtml()` with the newly-embedded CSS: confirmed the
  output starts with `<!DOCTYPE html>`, includes the theme rules, and
  renders its table.
- The new `flagOverflowingPages()` overflow-detection logic and
  `printFileAsPdf()` iframe/`window.print()` flow were code-reviewed for
  correctness against the DOM/Electron APIs they use, but — like all
  Obsidian-runtime behavior in this project — **could not be executed
  against a real Obsidian install** in this environment. These are the
  first things to check by hand: (1) open the "Homebrewery Preview" pane
  on a note deliberately longer than one page and confirm the red dashed
  outline + badge appear where expected, and (2) run "Print current file
  as Homebrewery PDF" and confirm the OS print dialog opens with content
  visible in its preview.

## Next (not started — Milestone 6, out of scope for this pass)

- [ ] Editor <-> preview scroll sync
- [ ] `{{footnote}}` / mustache variable substitution
- [ ] True automatic re-pagination (dynamically slicing overflow content
      into synthetic extra pages, rather than flagging it for the author
      to split manually)
- [ ] Dedicated `Key :: Value` legend syntax for stat blocks

## How to use the plugin

See `USAGE.md` for the full command list and Homebrewery syntax reference
with expected input/output for each.

## How to resume

1. `npm install`
2. `npm run dev` (esbuild watch mode — regenerates `src/generated/themeCss.ts`
   automatically on CSS edits) or `npm run build` (one-shot: CSS snapshot →
   typecheck → production bundle)
3. Symlink or copy the built plugin folder (`manifest.json`, `main.js`,
   `styles.css`) into `<vault>/.obsidian/plugins/brewvault/` and enable it
   in Obsidian's Community Plugins settings (with Safe Mode / restricted
   plugin loading off, since this is unpublished).

Note: `src/generated/themeCss.ts` is a build artifact (gitignored) — if
you clone this repo fresh and jump straight to editing `main.ts` before
ever running a build, your editor's TypeScript server will show an
import error for it until you run `npm run build` or `npm run dev` once.
