# BrewVault Plugin milestone tracker

This is the authoritative implementation and handoff record for the Obsidian
plugin. A milestone is `DONE` only when its acceptance criteria have been
verified in a real Obsidian desktop install when the feature depends on
Chromium/Electron layout or printing.

## Status legend

| Status | Meaning |
| --- | --- |
| `NOT STARTED` | No implementation work has begun. |
| `IN PROGRESS` | Code exists, but acceptance is incomplete. |
| `BLOCKED` | An external dependency prevents meaningful progress. |
| `DONE` | Deliverables and acceptance evidence are reproducible. |

## Overview

| Order | Milestone | Status | Outcome |
| --- | --- | --- | --- |
| 0 | M0 — Plugin foundation | `DONE` | Buildable desktop-only Obsidian plugin scaffold |
| 1 | M1 — Markdown rendering | `DONE` | Markdown renders into a Homebrewery-oriented preview |
| 2 | M2 — Pages and Homebrewery syntax | `DONE` | `\\page`, `\\column`, blocks, spans, tables, and fixed pages |
| 3 | M3 — Preview UX | `DONE` | Live preview follows the active note |
| 4 | M4 — Standalone HTML export | `DONE` | Self-contained HTML export using the preview renderer |
| 5 | M5 — In-app PDF print path | `DONE` | Historical print-dialog proof, superseded by M6 direct PDF export |
| 6 | M6 — Export parity and automatic pagination | `IN PROGRESS` | Match Homebrewery Letter/PHB output and prevent silent overflow |
| 7 | M7 — Theme parity expansion | `NOT STARTED` | Add the remaining upstream Homebrewery themes |
| 8 | M8 — Obsidian assets and release hardening | `IN PROGRESS` | Vault assets, diagnostics, packaging, and release verification |
| 9 | M9 — Homebrewery Edit Mode | `IN PROGRESS` | Homebrewery-aware source presentation and page boundaries in CodeMirror |
| 10 | M10 — Insert Homebrewery Block library | `NOT STARTED` | Searchable, verified block/template insertion workflow |
| 11 | M11 — Advanced Homebrewery layout | `NOT STARTED` | Wide/split layout parity and an editable pre-export HTML stage |

---

## M0 — Plugin foundation

**Goal:** establish a maintainable desktop-only Obsidian plugin project.

**Status:** `DONE`

**Evidence:** repository scaffold, TypeScript/esbuild build, manifest/version
files, licensing/third-party notices, architecture docs, and development
instructions are committed. See `PROGRESS.md` for historical verification.

---

## M1 — Markdown rendering

**Goal:** render active-note Markdown through a deterministic plugin-owned
pipeline.

**Status:** `DONE`

**Delivered:** `markdown-it` renderer, headings/paragraphs/lists/tables, and a
preview view using the same HTML fragments later consumed by export.

---

## M2 — Pages and Homebrewery syntax

**Goal:** support the Homebrewery authoring primitives needed by existing brew
notes.

**Status:** `DONE`

**Delivered:** block containers, inline spans, explicit `\\page`, explicit
`\\column`, fixed-size two-column pages, wide blocks, and page numbering.

---

## M3 — Preview UX

**Goal:** make the renderer usable while authoring in Obsidian.

**Status:** `DONE`

**Delivered:** ribbon/command entry for **Open Homebrewery Preview**, active-file
tracking, debounced refresh, and theme/page-size settings.

**Superseded behavior:** the separate **Preview current file as Homebrewery
document** command was redundant with **Open Homebrewery Preview** and is
removed in M6.

---

## M4 — Standalone HTML export

**Goal:** export the same render snapshot as a self-contained browser document.

**Status:** `DONE`

**Delivered:** compiled theme CSS is embedded at build time and exported HTML
requires no runtime stylesheet read.

**M6 naming change:** command is now **Export current file as HTML**. The older
"standalone Homebrewery HTML" wording is retired.

---

## M5 — In-app PDF print path

**Goal:** reach Chromium/Electron's print dialog without requiring a manually
opened browser tab.

**Status:** `DONE`

**Delivered:** a hidden iframe loads the standalone document and calls
`window.print()`.

**Superseded behavior:** live testing showed this was a print command rather
than a reliable PDF exporter. M6 replaces it with a hidden Electron renderer,
`webContents.printToPDF()`, and a direct vault write.

**M6 naming change:** command is now **Export current file as Homebrewery PDF**.
All user-facing output actions now use **Export** terminology.

---

## M6 — Export parity and automatic pagination

**Goal:** make exported pages behave like the live Homebrewery V3 output rather
than merely resembling a two-column document.

**Status:** `IN PROGRESS`

### Feedback driving this milestone

The first side-by-side exports exposed four release-blocking mismatches:

1. **Command surface is inconsistent and too broad.** Keep only the preview and
   export workflow. Remove all **Insert ...** commands, remove the redundant
   preview command, rename HTML export to **Export current file as HTML**, and
   rename PDF printing to **Export current file as Homebrewery PDF**.
2. **Print geometry is not deterministic.** The supplied BrewVault Swinekin PDF
   is A4 while the matching Homebrewery output is US Letter. Homebrewery defaults
   to US Letter, so BrewVault must explicitly print Letter and preserve page
   backgrounds.
3. **PHB output is not using PHB-like layout rules.** The supplied BrewVault
   samples show a plain/bordered treatment and different table metrics; the
   matching Homebrewery 5ePHB samples use parchment, compact PHB typography, and
   striped borderless tables. Those metric differences also make BrewVault move
   content into column two earlier than Homebrewery.
4. **Overflow must become page-aware.** A long logical page may flow into hidden
   third/fourth CSS columns and be clipped. BrewVault should insert virtual page
   breaks in the rendered copy at safe block boundaries without editing the
   source `.md` file.

### Deliverables

- [x] Normalize commands to **Open Homebrewery Preview**, **Export current file
      as HTML**, and **Export current file as Homebrewery PDF**.
- [x] Remove the redundant preview command and all **Insert ...** commands.
- [x] Force exported print CSS to US Letter and preserve backgrounds with print
      color adjustment.
- [x] Replace the PHB table/typography/layout approximation with values aligned
      to Homebrewery V3 5ePHB conventions: 0.34cm body type, 0.9cm column gap,
      1.4cm/1.7cm page padding, borderless striped tables, and PHB parchment
      colors.
- [x] Rename the former `journal` option to **SRD / Unearthed Arcana** (`srd`).
- [x] Add DOM-measured automatic pagination. It creates virtual rendered pages
      at top-level block boundaries when fixed two-column layout would overflow;
      source Markdown remains untouched and explicit `\\page` still wins.
- [x] Replace the iframe/`window.print()` path with programmatic Electron
      `printToPDF()` output written directly to the configured vault folder.
- [x] Default new installs to `BrewVault-Exports` and migrate only the exact
      former default `BrewVault Exports`; preserve custom export paths.
- [x] Make all configured-theme and PHB/SRD/Blank PDF commands overwrite
      `<note name>.pdf` in the export folder without opening a dialog.
- [ ] Verify automatic pagination in a real Obsidian Chromium runtime with a
      document long enough to require at least three generated pages.
- [ ] Re-export **Alter Fate** and **Swinekin** and compare against the supplied
      Homebrewery PDFs for Letter page size, first-column flow, table geometry,
      parchment/background printing, and page breaks.
- [x] Add `examples/auto-pagination-regression.md`, including tables and a callout
      that must move intact at a page boundary.
- [ ] Verify that fixture produces 3+ pages in a real Obsidian Chromium runtime.

### 0.1.0 live-test follow-up

The first real-vault M6 test added the following release requirements:

- [x] First install must always resolve an absent/invalid persisted theme to PHB and persist normalized defaults; preview must never receive an undefined theme class.
- [x] File-based exports default to a vault-root `BrewVault-Exports` folder, created automatically, with a configurable vault-relative output folder in plugin settings.
- [x] Keep the normal PDF command tied to the configured theme and add only three curated one-off PDF commands: PHB, SRD, and Blank.
- [ ] SRD visual parity still differs from upstream Homebrewery in parchment texture, font metrics, margins/padding, and heading separator treatment. This is tracked for theme-parity work rather than blocking the current pagination/export plumbing.
- [ ] Homebrewery `{{wide}}` / split-table behavior does not yet map cleanly onto automatic page separation. Advanced table semantics and an editable pre-export Homebrewery HTML stage are deferred to M9. Explicit source `\page` remains the deterministic workaround for such layouts in 0.1.0.

### Acceptance criteria

- PDF output reports `612 x 792 pt` (US Letter) with no A4 fallback.
- Selecting **Player's Handbook (Parchment)** produces a parchment PHB-style
  page in the PDF, not the SRD/plain treatment.
- The Alter Fate table starts in the same column as the Homebrewery reference
  unless its preceding content genuinely consumes the available height.
- A note that exceeds two columns produces additional physical pages with no
  omitted text and no edits to the source `.md` file.
- Explicit `\\page` and `\\column` markers retain deterministic precedence.
- A single indivisible block larger than one page is visibly flagged rather
  than silently discarded or split into invalid markup.
- PDF export opens no printer/save dialog, writes to the configured folder, and
  overwrites an existing same-name PDF.

### Current implementation checkpoint

Code for command cleanup, Letter print CSS, PHB/SRD theme correction,
DOM-measured virtual pagination, and direct Electron PDF generation is
implemented on `develop`. TypeScript, automated regression tests, and the
production build pass locally. Real Obsidian verification is still required
before marking this milestone `DONE`.

---

## M7 — Theme parity expansion

**Goal:** expose the same named theme family as the Homebrewery live site.

**Status:** `NOT STARTED`

**Planned themes:** 5e DMG, 5e PHB, Blank, Journal, and UnearthedArcana. M6 only
stabilizes PHB plus the SRD/Unearthed-Arcana-oriented non-PHB path. Theme assets,
fonts, and exact upstream visual parity are handled here rather than delaying M6
pagination/export fixes.

---

## M8 — Obsidian assets and release hardening

**Goal:** support real vault resources and prepare a reproducible public plugin
release.

**Status:** `IN PROGRESS`

**Delivered toward 0.1.0:** normalized first-install settings, configurable
vault-relative `BrewVault-Exports` output folder, stable curated theme-specific
PDF command IDs, direct PDF writes through an isolated Electron adapter, and
release version reset to `0.1.0`.

**Remaining work:** Obsidian embeds/wikilinks/local images, missing-asset warnings,
custom CSS, cancellation/overwrite safety, cross-platform test matrix, release
artifacts, dependency/license checks, and Community Plugin submission.

---

## M9 — Homebrewery Edit Mode

**Goal:** make Homebrewery structure readable and editable directly in
Obsidian's Markdown editor without changing source notes.

**Status:** `IN PROGRESS`

**Target version:** `0.1.2` after native acceptance.

### Deliverables

- [x] Register a CodeMirror 6 extension through Obsidian's public plugin API.
- [x] Detect matched nested `{{block ... }}` delimiters while preserving
      unfinished authoring and fenced code examples.
- [x] Replace unfocused delimiters with readable block labels and reveal exact
      source when the selection intersects them.
- [x] Present explicit `\page` as numbered **Page N starts** separators and
      explicit `\column` as column dividers.
- [x] Add a persisted, default-on **Homebrewery edit mode** setting.
- [x] Add pure regression tests and `examples/edit-mode-regression.md`.
- [ ] Verify label clicking/source reveal, typing, undo/redo, nested blocks,
      separators, setting toggles, and fenced examples in real Obsidian desktop.
- [ ] Carry renderer source positions through DOM pagination before projecting
      exact automatic page boundaries into CodeMirror. Never estimate from text
      length, line count, or character count.

### Acceptance criteria

- Source Markdown is byte-for-byte unchanged by editor presentation.
- A cursor/selection inside a label or separator exposes editable raw syntax.
- Unmatched delimiters and fenced examples remain visible.
- Explicit page and column separators remain stable during typing and undo/redo.
- Disabling the setting removes all BrewVault editor decorations immediately.

---

## M10 — Insert Homebrewery Block library

**Goal:** insert verified Homebrewery-compatible structures without crowding the
command palette.

**Status:** `NOT STARTED`

**Planned work:**

- Add one searchable **Insert Homebrewery Block…** modal grouped by Tables,
  Rules, Spells, Classes, Monsters, Page Layout, and Notes.
- Cover Wide Table, Split Table, Class Tables, Cover Pages, Spell List, Spell
  Description, Feat, DM's Note, Monster Stat Block, and later additions.
- Treat current upstream Homebrewery snippets/generators as canonical. Audit
  and compare the user's `TheBigVaultOfDnD/Homebrew Templates` collection as a
  secondary reference before adopting any template.
- Validate every entry through source parsing, Edit Mode, preview, PDF, and all
  supported themes. Start with simple fixed templates before parameterized
  class tables, full classes, stat blocks, and cover layouts.

---

## M11 — Advanced Homebrewery layout

**Goal:** close remaining wide/split and editable-export parity gaps.

**Status:** `NOT STARTED`

**Planned work:**

- Support Homebrewery-style wide/split table semantics, including blocks that
  deliberately span both columns and interact predictably with pagination.
- Add a **Homebrewery HTML Edit** workflow for temporary export-copy edits while
  leaving the original `.md` untouched.
- Define how explicit `\page`, automatic pagination, `{{wide}}`, and split tables
  resolve conflicts, with explicit source/page-edit directives taking precedence.

---

## Handoff log

### 2026-08-24 — M6 export parity and automatic pagination

**Status change:** `NOT STARTED` → `IN PROGRESS`
**What changed:** command cleanup; export-only command naming; SRD rename; US
Letter print CSS; PHB table/typography corrections; automatic rendered-page
splitting at safe top-level block boundaries.
**What was verified:** supplied PDFs confirm the existing page-size/theme/layout
mismatches. Source-level implementation is complete enough for the next live
Obsidian test.
**What remains:** live Chromium layout/print verification against Alter Fate and
Swinekin, plus a multi-page overflow regression fixture.
**Next pickup:** install the branch into Obsidian, run the two supplied samples,
and record PDF page size plus visual comparison before marking M6 done.

### 2026-08-24 — 0.1.0 live-vault follow-up

**What changed:** repaired default-theme initialization; added configurable `BrewVault Exports`; added curated PHB/SRD/Blank one-off PDF commands; reset release version to `0.1.0`.
**Deferred:** exact SRD visual parity and advanced wide/split table handling. A Homebrewery HTML Edit stage is now explicitly planned in M9.

### 2026-08-24 — Direct PDF export correction

**What changed:** changed the default folder to `BrewVault-Exports`, added exact
legacy-default migration, and replaced the iframe/`window.print()` command with
a hidden sandboxed Electron renderer using `webContents.printToPDF()`. All PDF
commands now write or overwrite `<note name>.pdf` in the configured folder.
**What was verified:** settings/PDF-byte regression tests, TypeScript, and the
production build pass. Source scans confirm no runtime `window.print()` path
remains.
**What remains:** live Obsidian verification that no dialog appears and that a
valid Letter PDF is created and overwritten at the reported vault-relative path.

### 2026-08-24 — M9 Homebrewery Edit Mode checkpoint

**Status change:** `NOT STARTED` → `IN PROGRESS`
**What changed:** added CodeMirror block labels, exact explicit page/column
separators, source reveal on selection, a default-on setting, and focused pure
tests. Each functional slice has its own local development commit.
**What was verified:** typecheck, automated tests, production build, and diff
checks pass.
**What remains:** native Obsidian editing acceptance and renderer source-position
metadata for exact automatic page-boundary projection. Version remains `0.1.1`
until the M9 acceptance gate is complete; its target release is `0.1.2`.
