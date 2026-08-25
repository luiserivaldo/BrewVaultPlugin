export type BrewVaultPlatform = "desktop" | "mobile";

export interface ExportRequest {
	readonly html: string;
	readonly basename: string;
}

export type ExportResult =
	| { readonly kind: "pdf"; readonly bytes: ArrayBuffer }
	| {
			readonly kind: "html-handoff";
			readonly html: string;
			readonly suggestedName: string;
	  }
	| { readonly kind: "unsupported"; readonly reason: string };

export interface ExportBackend {
	readonly platform: BrewVaultPlatform;
	readonly supportsDirectPdf: boolean;
	export(request: ExportRequest): Promise<ExportResult>;
	dispose(): void;
}

export interface BackendLoaders {
	loadDesktop(): Promise<ExportBackend>;
	loadMobile(): Promise<ExportBackend>;
}
