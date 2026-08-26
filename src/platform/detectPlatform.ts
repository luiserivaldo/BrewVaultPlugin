import type { BrewVaultPlatform } from "./types";

export interface ObsidianPlatformFlags {
	readonly isDesktopApp: boolean;
	readonly isMobileApp: boolean;
}

/** Convert Obsidian's runtime flags into BrewVault's deliberately small model. */
export function detectPlatform(flags: ObsidianPlatformFlags): BrewVaultPlatform {
	if (flags.isDesktopApp === flags.isMobileApp) {
		throw new Error(
			"BrewVault could not determine whether Obsidian is running on desktop or mobile."
		);
	}

	return flags.isDesktopApp ? "desktop" : "mobile";
}
