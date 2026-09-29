import type { ExportRequest, ExportResult } from "../../platform/types";

export type BasicPdfResult = Extract<ExportResult, { readonly kind: "pdf" }>;

/** Experimental profiles share the same sanitized semantic HTML backend. */
export type BasicPdfProfile = "basic" | "srd";

export interface BasicPdfExporterContract {
	export(request: ExportRequest, profile?: BasicPdfProfile): Promise<BasicPdfResult>;
	dispose(): void;
}
