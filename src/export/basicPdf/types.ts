import type { ExportRequest, ExportResult } from "../../platform/types";

export type BasicPdfResult = Extract<ExportResult, { readonly kind: "pdf" }>;

export interface BasicPdfExporterContract {
	export(request: ExportRequest): Promise<BasicPdfResult>;
	dispose(): void;
}
