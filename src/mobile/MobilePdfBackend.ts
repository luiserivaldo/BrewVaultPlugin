import type {
	ExportBackend,
	ExportRequest,
	ExportResult,
} from "../platform/types";
import type { MobilePdfMethod } from "../settings/types";
import { MobileHandoffBackend } from "./MobileHandoffBackend";

export type RasterPdfRenderer = (
	request: ExportRequest,
	isCancelled: () => boolean
) => Promise<ArrayBuffer>;

/** Loads the canvas renderer only when a native mobile export runs. */
async function loadRasterRenderer(): Promise<RasterPdfRenderer> {
	const { renderStandaloneHtmlToRasterPdf } = await import("../export/rasterPdf");
	return (request, isCancelled) =>
		renderStandaloneHtmlToRasterPdf(request.html, {
			pageWidthPx: request.pageWidthPx,
			pageHeightPx: request.pageHeightPx,
			title: request.basename,
			onProgress: request.onProgress,
			isCancelled,
		});
}

/**
 * Mobile export backend with two finishing methods, read from settings at
 * export time so a changed setting applies without reloading the plugin.
 */
export class MobilePdfBackend implements ExportBackend {
	readonly platform = "mobile" as const;
	private disposed = false;

	constructor(
		private readonly getMethod: () => MobilePdfMethod,
		private readonly handoff: ExportBackend = new MobileHandoffBackend(),
		private readonly loadRenderer: () => Promise<RasterPdfRenderer> = loadRasterRenderer
	) {}

	get supportsDirectPdf(): boolean {
		return this.getMethod() === "native";
	}

	async export(request: ExportRequest): Promise<ExportResult> {
		const method = request.mobilePdfMethod ?? this.getMethod();
		if (method !== "native") {
			return this.handoff.export(request);
		}

		const render = await this.loadRenderer();
		return {
			kind: "pdf",
			bytes: await render(request, () => this.disposed),
		};
	}

	dispose(): void {
		this.disposed = true;
		this.handoff.dispose();
	}
}

export function createMobilePdfBackend(getMethod: () => MobilePdfMethod): ExportBackend {
	return new MobilePdfBackend(getMethod);
}
