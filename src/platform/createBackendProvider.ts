import { ExportBackendProvider } from "./ExportBackendProvider";
import type { BackendLoaders, BrewVaultPlatform } from "./types";

const DEFAULT_BACKEND_LOADERS: BackendLoaders = {
	async loadDesktop() {
		const { createDesktopPdfBackend } = await import(
			"../desktop/DesktopPdfBackend"
		);
		return createDesktopPdfBackend();
	},
	async loadMobile() {
		const { createUnsupportedMobileBackend } = await import(
			"../mobile/UnsupportedMobileBackend"
		);
		return createUnsupportedMobileBackend();
	},
};

export function createBackendProvider(
	platform: BrewVaultPlatform,
	loaders: BackendLoaders = DEFAULT_BACKEND_LOADERS
): ExportBackendProvider {
	return new ExportBackendProvider(platform, loaders);
}
