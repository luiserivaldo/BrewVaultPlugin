import type {
	ExportBackend,
	ExportRequest,
	ExportResult,
} from "../platform/types";

const MOBILE_EXPORT_UNAVAILABLE =
	"Mobile PDF export is not enabled in this platform-safety build.";

export class UnsupportedMobileBackend implements ExportBackend {
	readonly platform = "mobile" as const;
	readonly supportsDirectPdf = false;

	export(_request: ExportRequest): Promise<ExportResult> {
		return Promise.resolve({
			kind: "unsupported",
			reason: MOBILE_EXPORT_UNAVAILABLE,
		});
	}

	dispose(): void {}
}

export function createUnsupportedMobileBackend(): ExportBackend {
	return new UnsupportedMobileBackend();
}
