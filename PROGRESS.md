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

## Next (not started — Milestone 5, out of scope for this pass)

- [ ] Editor <-> preview scroll sync
- [ ] `{{footnote}}` / mustache variable substitution
- [ ] Direct PDF export without a browser round-trip
- [ ] Dedicated `Key :: Value` legend syntax for stat blocks

## How to use the plugin

See `USAGE.md` for the full command list and Homebrewery syntax reference
with expected input/output for each.

## How to resume

1. `npm install`
2. `npm run dev` (esbuild watch mode) or `npm run build` (one-shot)
3. Symlink or copy the built plugin folder (`manifest.json`, `main.js`,
   `styles.css`) into `<vault>/.obsidian/plugins/brewvault/` and enable it
   in Obsidian's Community Plugins settings (with Safe Mode / restricted
   plugin loading off, since this is unpublished).
