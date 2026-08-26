import { ElectronPdfExporter } from "../electron/ElectronPdfExporter";
import type {
	ExportBackend,
	ExportRequest,
	ExportResult,
} from "../platform/types";

export class DesktopPdfBackend implements ExportBackend {
	readonly platform = "desktop" as const;
	readonly supportsDirectPdf = true;

	constructor(private readonly exporter = new ElectronPdfExporter()) {}

	async export(request: ExportRequest): Promise<ExportResult> {
		return {
			kind: "pdf",
			bytes: await this.exporter.renderHtmlToPdf(request.html),
		};
	}

	dispose(): void {
		this.exporter.dispose();
	}
}

export function createDesktopPdfBackend(): ExportBackend {
	return new DesktopPdfBackend();
}
