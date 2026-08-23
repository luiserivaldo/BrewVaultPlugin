import { Plugin } from 'obsidian';

/**
 * Plugin lifecycle entry point.
 *
 * Feature registration begins in M0 after the Electron PDF boundary is proven.
 */
export default class BrewVaultPdfPlugin extends Plugin {
	onload(): void {
		// D0 intentionally provides no user-facing command that cannot work yet.
	}
}
