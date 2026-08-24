# BrewVault PDF Plugin

## Current Status

**Status:** M0 in development - proving Electron PDF feasibility inside Obsidian.

The plugin uses Obsidian's vault APIs for file management and its Electron runtime for layout and PDF generation. This keeps everything local and offline.

## Quick Start

```bash
npm ci
npm run build
npm run check
```

## Development

- Working branch: `develop`
- Release branch: `main`
- See [MILESTONES.md](./MILESTONES.md) for the current milestone and acceptance gates.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for package boundaries and security constraints.

## Milestone 0: Electron PDF Feasibility

M0 aims to prove that we can generate PDFs from Obsidian markdown using a controlled hidden renderer window. This establishes the architectural foundation before porting the full Homebrewery rendering pipeline.

### What's Implemented

- ✅ Plugin scaffold with strict TypeScript, esbuild bundling, ESLint
- ✅ Source layout structure (src/main.ts, src/commands/, src/obsidian/, etc.)
- ✅ Electron adapter classes for print renderer windows
- ✅ Obsidian adapters for Vault and Workspace access
- ✅ Basic PDF export command implementation

### What's Needed to Verify

The key challenge for M0 is creating BrowserWindow instances from within an Obsidian plugin context. Options include:

1. Creating windows directly from plugin code (requires Obsidian API permission)
2. Registering a custom main process handler in src/main.ts  
3. Using IPC messaging between plugin and window creator

### Next Steps

**Investigation:** Test whether we can create BrowserWindow directly from plugin code, or if we need to register custom handlers in the main process.

The Obsidian documentation indicates that plugins running with certain flags may have access to electron APIs. Let's implement a test version that attempts direct window creation and see what happens.
