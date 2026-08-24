# BrewVault PDF agent instructions

This repository is shared by human developers and coding agents. Treat the
checked-in repository—not prior chat—as the source of truth.

## Required reading order

1. `README.md` for product scope and current user-facing status.
2. `MILESTONES.md` for the next approved work and acceptance gates.
3. `docs/ARCHITECTURE.md` for package boundaries and security constraints.
4. `THIRD_PARTY_NOTICES.md` before importing or vendoring third-party code.
5. The nearest README to any code being changed, when one exists.

Do not skip ahead of the next milestone. The first implementation milestone is
M0: prove desktop Electron PDF generation inside Obsidian before porting the
Homebrewery pipeline.

## Non-negotiable product boundaries

- The plugin is desktop-only. Keep `manifest.json` set to
  `"isDesktopOnly": true`.
- End users install only the Obsidian plugin. Never require a separate Node,
  npm, Playwright, Chromium, browser, server, sidecar, Docker container, or
  native installer.
- Use Obsidian's public `Vault`, `Workspace`, and `MetadataCache` APIs for files,
  active-note state, links, embeds, and change events.
- Isolate Electron access in a narrow adapter. Do not scatter `electron`
  imports through rendering or UI modules.
- Keep all processing local and offline. Do not add telemetry or network calls.
- Never modify source Markdown as part of preview or PDF export.
- Load only trusted bundled resources and explicitly selected vault-local CSS
  and assets. Block remote resource loading in the print renderer.
- Prefer a sandboxed, context-isolated, Node-disabled print renderer. Always
  destroy hidden windows and listeners on success, error, timeout, and plugin
  unload.
- Keep Markdown AST, document IR, Homebrewery serialization, layout, and PDF
  interfaces independent from Obsidian lifecycle and UI code.
- Preserve third-party copyright and license notices. Record every vendored or
  copied dependency in `THIRD_PARTY_NOTICES.md`.

## Implementation discipline

- Keep `src/main.ts` limited to plugin lifecycle and registration.
- Put commands under `src/commands/`, Obsidian adapters under `src/obsidian/`,
  Electron code under `src/electron/`, pipeline code under `src/pipeline/`, and
  UI code under `src/ui/`.
- Use strict TypeScript and explicit schemas or type guards at untrusted
  boundaries.
- Bundle all non-Obsidian runtime dependencies into `main.js`. Keep `obsidian`,
  `electron`, Node built-ins, and the CodeMirror/Lezer packages external as
  defined by the build.
- Defer heavy imports and renderer initialization until the user invokes an
  export or opens a preview.
- Register Obsidian, DOM, and interval cleanup through the plugin's
  `register*` helpers whenever applicable.
- Add focused automated tests for pure pipeline and safety logic. Native
  Obsidian/Electron behavior also requires the manual acceptance evidence
  specified by the active milestone.

## Milestone and Git discipline

- Keep ongoing development on `develop`. Branch feature work from `develop` and
  merge it back only after its milestone checks pass.
- Treat `main` as release-only. Do not merge `develop` into `main` until the
  corresponding version has passed its full release milestone and is ready to
  tag and publish.
- Update `README.md` and `MILESTONES.md` when product behavior, setup, status, or
  a material blocker changes.
- Never mark a milestone `DONE` without its independently reproducible
  acceptance evidence.
- If work stops mid-milestone, leave it `IN PROGRESS` and append an exact
  handoff-log entry to `MILESTONES.md`.
- Make one descriptive commit for each completed development or tracking
  milestone on `develop` and push it immediately. Version-release milestones
  additionally merge the verified commit to `main` and create the matching
  release tag. If no remote or authentication is available, record the exact
  blocker before handoff; never imply publication.
- Keep a local development-backlog trace by committing every completed feature
  or bug fix separately. At each completed milestone, advance the patch version
  by one step (for example, `0.1.0` to `0.1.1`). Reserve larger minor or major
  version jumps for substantial changes or feature introductions.
- Do not commit generated `main.js`, source maps, `node_modules`, local vault
  state, plugin `data.json`, exported PDFs, or credentials.
- Leave the worktree clean at milestone boundaries. Preserve unrelated user
  changes if the worktree is not clean.

## Baseline verification

Run from the repository root with a supported Node/npm toolchain:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
git diff --check
```

Follow the additional native/manual checks in the active milestone. A build in
plain Node does not prove that an Electron API works inside Obsidian.
