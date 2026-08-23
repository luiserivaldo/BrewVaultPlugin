# BrewVault PDF milestone tracker

This file is the authoritative implementation and handoff record. A milestone
is `DONE` only when the next developer can reproduce its acceptance evidence
from this repository.

## Status legend

| Status | Meaning |
| --- | --- |
| `NOT STARTED` | No implementation work has begun. |
| `IN PROGRESS` | Work exists, but acceptance is incomplete. |
| `BLOCKED` | An external dependency prevents meaningful progress; the blocker is recorded. |
| `DONE` | Deliverables and acceptance evidence are independently verified. |

## Overview

| Order | Milestone | Status | Outcome |
| --- | --- | --- | --- |
| 0 | D0 — Repository and developer foundation | `DONE` | Documented, licensed, buildable plugin scaffold |
| 1 | M0 — Electron PDF feasibility | `NOT STARTED` | Active note exports through Obsidian's Chromium |
| 2 | M1 — Homebrewery rendering core | `NOT STARTED` | Pinned renderer produces styled deterministic HTML |
| 3 | M2 — Obsidian assets and custom CSS | `NOT STARTED` | Obsidian-native links/images and local style overrides |
| 4 | M3 — Preview and safe export UX | `NOT STARTED` | Preview, progress, validation, and atomic Save As |
| 5 | M4 — Packaging and community release | `NOT STARTED` | Reproducible public desktop-plugin release |

Each milestone is deliberately shippable or rejectable on its own. Do not port
the full BrewVault pipeline before M0 proves that the plugin can reliably obtain
a PDF buffer from Obsidian's Electron runtime.

## Branch and release policy

- `develop` is the persistent integration branch for all unreleased code and
  documentation.
- Optional short-lived feature branches start from and merge back into
  `develop`.
- Push every completed development or tracking milestone to `develop`.
- `main` contains version releases only. Merge into `main` after the applicable
  release acceptance gate passes, then tag the exact manifest version without a
  leading `v`.
- Never merge incomplete work into `main` merely to synchronize branches.

---

## D0 — Repository and developer foundation

**Goal:** leave a new contributor with an accurate plan, explicit licensing,
and a minimal plugin that builds without containing fake product behavior.

**Deliverables**

- [x] Product README with scope, non-goals, architecture, development setup,
      verification, release policy, and current status.
- [x] Agent instructions and an independently checkable milestone tracker.
- [x] MIT project license and third-party attribution for the Obsidian sample
      scaffold, Homebrewery, and future dependencies.
- [x] Desktop-only Obsidian manifest and minimal TypeScript entry point.
- [x] npm lockfile, strict TypeScript, esbuild, ESLint, version tooling, and CI.
- [x] Repository hygiene for generated output, local vault state, credentials,
      and exports.

**Acceptance criteria**

- `npm ci`, typecheck, lint, and production build pass from the checked-in
  lockfile.
- `manifest.json` and `versions.json` agree on plugin/minimum app versions.
- The production bundle is generated locally but remains untracked.
- Documentation does not claim PDF export already works.
- The foundation commit is pushed, or the exact missing-remote/authentication
  blocker is recorded.

**Status:** `DONE`

**Completion evidence:** Verified 2026-08-24 on `develop` with Node 26.7.0 and
npm 11.19.0. `npm ci` installed the lockfile, audited 328 packages with zero
known vulnerabilities, and `npm run check` passed strict typecheck,
Obsidian-specific ESLint, a repeated typecheck, and the production esbuild
bundle. The generated 650-byte `main.js` is ignored. Manifest/package version
`0.1.0`, minimum Obsidian version `1.13.7`, and `isDesktopOnly: true` agree.
`git diff --check` passed. The foundation is committed locally on `develop` as
`1607fc0`; publication is not claimed because both available GitHub
authentication paths failed as recorded below.

---

## M0 — Electron PDF feasibility

**Goal:** prove the architectural bet before porting renderer code.

**Deliverables**

- [ ] A stable command for exporting the active Markdown `TFile`.
- [ ] An isolated Electron adapter that renders controlled local HTML and calls
      `webContents.printToPDF()` without Playwright or a separate browser.
- [ ] Letter paper, zero margins, printed backgrounds, and deterministic
      font/image readiness.
- [ ] A native Save As flow that writes the returned PDF buffer without
      modifying the source note.
- [ ] Cleanup and timeout handling for all window and listener paths.

**Acceptance criteria**

- A one-page fixture exports as a non-empty `%PDF-` document with selectable
  text on Windows and Linux; macOS evidence is required before public release.
- The plugin works from a normal Obsidian installation and after application
  restart on both the minimum supported and current stable app versions.
- No Playwright package, Chromium download, local HTTP server, or sidecar exists.
- Renderer navigation and remote requests are denied.
- The hidden renderer never remains open after success, failure, timeout, or
  plugin unload.
- If reliable PDF creation requires an unacceptable private API, stop and
  record the decision instead of porting the full pipeline.

**Status:** `NOT STARTED`

---

## M1 — Homebrewery rendering core

**Goal:** port only the proven, host-independent conversion boundary.

**Deliverables**

- [ ] Markdown AST → document IR → Homebrewery serializer with focused fixtures.
- [ ] A pinned, license-recorded Homebrewery `render()` integration isolated
      behind one adapter.
- [ ] Build-time compilation and bundling of the default Homebrewery CSS, fonts,
      and backgrounds required at runtime.
- [ ] Electron-backed DOM measurement and deterministic explicit/automatic page
      breaks without Playwright.

**Acceptance criteria**

- Headings, paragraphs, lists, tables, raw Homebrewery blocks, images, and
  explicit page breaks match approved fixtures.
- A representative multi-page document has no clipped or silently omitted
  blocks.
- No runtime dependency reaches outside the installed plugin directory or
  selected vault resources.
- Homebrewery revision and MIT attribution are recorded in release evidence.

**Status:** `NOT STARTED`

---

## M2 — Obsidian assets and custom CSS

**Goal:** agree with Obsidian's own vault semantics and expose approachable
style customization.

**Deliverables**

- [ ] Resolve active note, wikilinks, embeds, aliases, and local assets through
      `Workspace`, `Vault`, and `MetadataCache`.
- [ ] Preserve per-occurrence image alt text and display options in the IR.
- [ ] Settings tab for selecting the default Homebrewery style or a vault-local
      custom CSS file.
- [ ] Resolve and inline CSS-local images/fonts without permitting remote loads.
- [ ] Visible warnings for missing, ambiguous, unsupported, or remote assets.

**Acceptance criteria**

- Resolution matches what Obsidian selects for duplicate names and relative
  links.
- Standard Markdown images and Obsidian embeds render from the active note.
- Custom CSS changes font, color, background, and layout without editing source
  Markdown.
- Missing or rejected resources cannot silently disappear.

**Status:** `NOT STARTED`

---

## M3 — Preview and safe export UX

**Goal:** make one-note export understandable and safe for nontechnical users.

**Deliverables**

- [ ] Preview view for the active note with Refresh and Export PDF actions.
- [ ] Progress, cancellation, concise local diagnostics, and actionable errors.
- [ ] Content fingerprinting so stale previews cannot be exported as current.
- [ ] Atomic destination install with separate overwrite confirmation.
- [ ] Keyboard command, ribbon action, and file-menu action for eligible notes.

**Acceptance criteria**

- Switching or editing notes invalidates stale export state.
- Cancel and overwrite flows never truncate an existing file.
- Preview and final PDF use the same HTML/CSS and resource snapshot.
- Spaces and non-ASCII vault/destination paths pass on each desktop OS.

**Status:** `NOT STARTED`

---

## M4 — Packaging and community release

**Goal:** ship a reproducible, reviewable Community Plugin release.

**Deliverables**

- [ ] CI gates for typecheck, lint, unit/integration tests, deterministic build,
      manifest/version agreement, artifact presence, and dependency licenses.
- [ ] Release workflow producing `main.js`, `manifest.json`, and `styles.css`.
- [ ] Installation, privacy, custom CSS, troubleshooting, and attribution docs.
- [ ] Community-directory submission with `isDesktopOnly: true`.

**Acceptance criteria**

- Clean Obsidian installations on Windows, Linux, and macOS install the release
  artifacts and export approved fixtures fully offline.
- No developer dependency or unbundled runtime module is required.
- Community review has accepted the Electron boundary, or the exact external
  review blocker is recorded and the milestone remains incomplete.
- Public release evidence and checksums are linked from this tracker.

**Status:** `NOT STARTED`

---

## Open risks and decisions

- [ ] **Electron boundary:** Node/Electron use is permitted for desktop-only
      plugins, but hidden `BrowserWindow` creation and `printToPDF()` must be
      proven across Obsidian's Electron versions and community review.
- [ ] **Pinned Homebrewery adapter:** BrewVault used an undocumented
      `shared/markdown.js` export. Confirm the smallest bundleable integration
      and pin it before porting.
- [ ] **Runtime assets:** standard Community Plugin installation centers on
      `main.js`, `manifest.json`, and `styles.css`; Homebrewery fonts and
      backgrounds must be bundled or safely inlined.
- [ ] **Untrusted document content:** raw HTML, CSS, SVG, and Homebrewery variable
      expressions require an explicit local-content trust and sanitization
      decision before release.
- [ ] **Upstream lint warning:** `eslint-plugin-obsidianmd@0.4.1` currently
      installs a nested deprecated ESLint 9 for some of its plugins. BrewVault
      PDF directly runs ESLint 10.9.0, all checks pass, and `npm audit` reports
      zero vulnerabilities. Recheck when the Obsidian lint plugin updates.
- [ ] **GitHub authentication:** `origin` is configured for
      `https://github.com/luiserivaldo/BrewVaultPlugin.git`, but this process has
      no HTTPS credential helper or GitHub CLI, and its credential-free SSH
      fallback has no authorized private key. Restore authentication before the
      next mandated milestone push.

## Handoff log

Append an entry whenever work stops or a milestone changes status.

```text
### YYYY-MM-DD — milestone
Status change:
What changed:
What was verified:
Commit/push result:
Next pickup:
New risks or blockers:
```

### 2026-08-24 — D0 repository foundation

Status change: `D0: NOT STARTED → IN PROGRESS → DONE`

What changed: documentation, licensing, attribution, plugin metadata, and the
minimal build environment were established from the official Obsidian
sample scaffold on the new `develop` branch. `main` remains release-only. No PDF
feature is claimed.

What was verified: Node 26.7.0/npm 11.19.0 `npm ci` installed 327 packages and
audited 328 with zero vulnerabilities. `npm run check` passed typecheck, lint,
and production build. The manifest/version consistency check, ignore rules,
generated-bundle check, and `git diff --check` passed.

Commit/push result: foundation commit `1607fc0` exists locally on `develop`.
`git push -u origin develop` failed with `fatal: could not read Username for
'https://github.com': No such device or address`. No credential helper or
GitHub CLI is installed. An SSH authentication check using GitHub's verified
host key also failed with `Permission denied (publickey)`. Nothing was pushed.
`main` remains at initial commit `9102d4d`.

Next pickup: restore GitHub authentication and push `develop`, then begin M0 on
`develop`.

New risks or blockers: the Obsidian ESLint plugin's nested ESLint 9 deprecation
warning is non-blocking; GitHub authentication blocks the required push. Both
are recorded above.
