import { ExportBackendProvider } from "./ExportBackendProvider";
import type { BackendLoaders, BrewVaultPlatform } from "./types";
import type { MobilePdfMethod } from "../settings/types";

export interface BackendProviderOptions {
	/** Current mobile PDF method; read on every mobile export. */
	readonly getMobilePdfMethod?: () => MobilePdfMethod;
}

function createDefaultLoaders(options: BackendProviderOptions): BackendLoaders {
	const getMobilePdfMethod = options.getMobilePdfMethod ?? (() => "browser" as const);
	return {
		async loadDesktop() {
			const { createDesktopPdfBackend } = await import(
				"../desktop/DesktopPdfBackend"
			);
			return createDesktopPdfBackend();
		},
		async loadMobile() {
			const { createMobilePdfBackend } = await import(
				"../mobile/MobilePdfBackend"
			);
			return createMobilePdfBackend(getMobilePdfMethod);
		},
	};
}

export function createBackendProvider(
	platform: BrewVaultPlatform,
	options: BackendProviderOptions = {}
): ExportBackendProvider {
	return new ExportBackendProvider(platform, createDefaultLoaders(options));
}
