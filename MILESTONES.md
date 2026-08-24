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
| 5 | M5 — In-app PDF print path | `DONE` | PDF command opens Chromium/Electron print flow |
| 6 | M6 — Export parity and automatic pagination | `IN PROGRESS` | Match Homebrewery Letter/PHB output and prevent silent overflow |
| 7 | M7 — Theme parity expansion | `NOT STARTED` | Add the remaining upstream Homebrewery themes |
| 8 | M8 — Obsidian assets and release hardening | `NOT STARTED` | Vault assets, diagnostics, packaging, and release verification |

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
- [ ] Verify automatic pagination in a real Obsidian Chromium runtime with a
      document long enough to require at least three generated pages.
- [ ] Re-export **Alter Fate** and **Swinekin** and compare against the supplied
      Homebrewery PDFs for Letter page size, first-column flow, table geometry,
      parchment/background printing, and page breaks.
- [x] Add `examples/auto-pagination-regression.md`, including tables and a callout
      that must move intact at a page boundary.
- [ ] Verify that fixture produces 3+ pages in a real Obsidian Chromium runtime.

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

### Current implementation checkpoint

Code for command cleanup, Letter print CSS, PHB/SRD theme correction, and
DOM-measured virtual pagination is implemented on the M6 working branch. Static
build verification in the uploaded archive is currently limited because the
archive's `node_modules` tree is incomplete (local `tsc` cannot resolve the
checked-in dependencies); real Obsidian verification is still required before
marking this milestone `DONE`.

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

**Status:** `NOT STARTED`

**Planned work:** Obsidian embeds/wikilinks/local images, missing-asset warnings,
custom CSS, cancellation/overwrite safety, cross-platform test matrix, release
artifacts, dependency/license checks, and Community Plugin submission.

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
