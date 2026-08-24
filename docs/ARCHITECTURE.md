# Architecture

## Product shape

BrewVault PDF is an Obsidian desktop plugin, not a standalone application. It
uses Obsidian for vault ownership and its existing Electron Chromium runtime for
layout and PDF generation.

```text
Obsidian command/view
        │
        ▼
Obsidian source adapter ── Vault / Workspace / MetadataCache
        │
        ▼
Markdown AST → document IR → Homebrewery serialization
        │
        ▼
HTML + bundled theme + inlined local assets
        │
        ▼
isolated Electron print adapter → validated PDF Buffer
        │
        ▼
Obsidian Vault create at first unused numbered path
```

Homebrewery Edit Mode is a parallel editor-only presentation path:

```text
CodeMirror document → pure Homebrewery syntax-range scanner
        │
        ▼
unfocused block labels + explicit page/column separator decorations
        │
        ▼
selection intersects decoration → raw source is revealed in place
```

The editor extension never rewrites Markdown. Exact automatic page markers are
not estimated: the renderer must first carry source positions into measured DOM
blocks and return the resulting boundary map to CodeMirror.

## Planned source layout

```text
src/
  main.ts             plugin lifecycle and registration only
  commands/           command definitions and eligibility checks
  obsidian/           Vault, Workspace, MetadataCache, settings adapters
  pipeline/           AST, IR, serializer, pagination, render interfaces
  electron/           hidden renderer and printToPDF boundary
  export/             fingerprints, PDF checks, atomic destination writes
  editor/             CodeMirror syntax ranges, labels, and page separators
  ui/                 preview, progress, settings, diagnostics
```

Pure pipeline modules must not import `obsidian` or `electron`. Obsidian modules
may depend on the pipeline interfaces. Only the Electron adapter may directly
import `electron`.

## Rendering lifecycle

1. Capture the eligible active `TFile` and its content fingerprint.
2. Read the saved Markdown through Obsidian's Vault API.
3. Parse the document and resolve vault references through MetadataCache.
4. Serialize Homebrewery-compatible Markdown and render pinned Homebrewery HTML.
5. Compile the effective style snapshot from bundled CSS plus an optional
   user-selected vault CSS file.
6. Inline every permitted local asset. Record rejected or unresolved resources.
7. Load the controlled snapshot in an isolated hidden Electron renderer.
8. Wait deterministically for fonts and images, measure/paginate if enabled,
   and obtain the PDF buffer from `webContents.printToPDF()`.
9. Validate the PDF bytes and recheck the source/style fingerprint.
10. Reserve the first unused vault-relative destination (`name`, `name_1`,
    `name_2`, ...) and create it through the public Vault API.
11. Destroy all renderer resources in a `finally` path.

## Security and privacy

- No network access is required or allowed in the print renderer.
- Use `sandbox: true`, `contextIsolation: true`, and `nodeIntegration: false`
  where the host Electron boundary permits them.
- Deny navigation, popups, downloads, and permissions from rendered content.
- Treat Markdown, raw HTML, custom CSS, SVG, and Homebrewery expressions as
  user-controlled input even though they are local.
- Never expose Node or Obsidian objects to rendered document JavaScript.
- Prefer a static document snapshot without scripts. If upstream Homebrewery
  needs JavaScript during transformation, run it before the isolated snapshot.
- Write outside the vault only after an explicit Save As action.
- Collect no telemetry and transmit no vault data.

## Reuse from BrewVault

Port code by responsibility and tests, not by copying the standalone
application architecture:

- Reuse the Markdown AST, document IR, Homebrewery serializer, pagination
  algorithm, renderer contract, PDF verification, fingerprints, and atomic
  export semantics where they remain host-independent.
- Replace filesystem link/image resolution with an injected Obsidian resolver.
- Replace Playwright layout/PDF adapters with the Electron adapter proven in M0.
- Do not port the project registry, scanner, watcher, managed workspace, web
  server/client, Tauri shell, Node sidecar, installer, or standalone diagnostics.

Each port must retain its focused tests and document any changed behavior.
