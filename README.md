# BrewVault PDF

BrewVault PDF is a planned desktop-only Obsidian plugin that renders the active
Markdown note with Homebrewery-compatible D&D styling and exports it as a PDF.
It is local-first: vault content stays on the user's computer, and PDF export
must not require a server, a separate Chromium download, or an external command.

> [!IMPORTANT]
> The repository currently contains the verified development scaffold and
> architecture plan only. D0 is complete; PDF export is not implemented yet.
> The first product milestone is the Electron `printToPDF()` feasibility proof
> in [MILESTONES.md](MILESTONES.md).

## Planned workflow

1. Open a Markdown note in Obsidian desktop.
2. Run **Export active note as BrewVault PDF**.
3. Review the Homebrewery-styled preview.
4. Optionally select a local custom CSS file from the vault.
5. Choose a destination and export the verified PDF.

Obsidian already owns vault discovery, active-file state, metadata caching, and
link resolution. BrewVault PDF will keep the proven Markdown AST → document IR
→ Homebrewery serialization work from the earlier BrewVault application while
replacing its standalone filesystem, web server, Tauri, and Playwright layers.

## Scope

The first release targets:

- Obsidian desktop on Windows, Linux, and macOS.
- One active Markdown file per export.
- Obsidian wikilinks and embeds resolved through Obsidian's public APIs.
- Homebrewery-compatible default styling.
- An optional local CSS file for custom styling.
- Local images, fonts, backgrounds, tables, and explicit page breaks.
- Chromium PDF generation through the Electron runtime already used by
  Obsidian.
- Offline operation with no telemetry.

Explicit non-goals for the first release are mobile support, batch/booklet
composition, live Markdown editing inside the preview, AI features, web image
search, and remote rendering services.

## Architecture boundaries

- Use Obsidian's `Vault`, `Workspace`, and `MetadataCache` APIs for vault files,
  the active note, embeds, link resolution, and change events.
- Keep Markdown parsing, document IR, Homebrewery serialization, pagination,
  and rendering independent from Obsidian UI code.
- Isolate direct Electron access behind one desktop PDF adapter. The M0 spike
  must prove that adapter against supported Obsidian versions before the
  renderer is ported.
- Bundle runtime dependencies into `main.js`; end users must not install Node,
  npm, Homebrewery, Playwright, Chromium, or a sidecar.
- Do not modify the source note during preview or export.
- Do not load remote scripts, styles, images, or fonts in the print renderer.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the proposed module map and
security boundary.

## Developer setup

Requirements:

- Node.js 20 or newer.
- npm 10 or newer.
- Obsidian desktop for manual plugin verification.

From the repository root:

```bash
npm ci
npm run check
```

For watch mode:

```bash
npm run dev
```

The build produces `main.js` at the repository root. For a development install,
place or symlink this repository at:

```text
<Vault>/.obsidian/plugins/brewvault-pdf/
```

Then enable **BrewVault PDF** under **Settings → Community plugins**. Generated
`main.js` and source maps are intentionally ignored by Git and must be rebuilt
locally.

## Verification

Run before every milestone commit:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Milestone-specific integration and manual Obsidian checks are recorded in
[MILESTONES.md](MILESTONES.md). A milestone is not complete merely because its
implementation exists; its stated acceptance evidence must pass.

## Releases

There is no functional release yet. When release work begins, Git tags must
exactly match `manifest.json` versions without a leading `v`. Community-plugin
artifacts will be `main.js`, `manifest.json`, and `styles.css` when styles are
present.

All unreleased work is committed to `develop`. Short-lived feature branches may
branch from and merge back into `develop`, but `main` is updated only for a
verified version release. Tracking/documentation milestones that do not create
a release are committed and pushed on `develop`.

## License and attribution

BrewVault PDF is free and open-source software under the [MIT License](LICENSE).
Redistributions must preserve its copyright and license notice.

This project is built with and inspired by other open-source projects,
especially NaturalCrit's Homebrewery and Obsidian's sample plugin. Their work is
not relicensed by this project. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licenses, acknowledgements,
and the attribution policy.
