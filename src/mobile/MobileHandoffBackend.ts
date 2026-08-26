import type {
	ExportBackend,
	ExportRequest,
	ExportResult,
} from "../platform/types";

/**
 * Returns the shared standalone document for the mobile delivery workflow.
 * Vault writes and browser/share UI remain with the command coordinator.
 */
export class MobileHandoffBackend implements ExportBackend {
	readonly platform = "mobile" as const;
	readonly supportsDirectPdf = false;

	export(request: ExportRequest): Promise<ExportResult> {
		return Promise.resolve({
			kind: "html-handoff",
			html: request.html,
			suggestedName: `${request.basename}.brew.html`,
		});
	}

	dispose(): void {}
}

export function createMobileHandoffBackend(): ExportBackend {
	return new MobileHandoffBackend();
}
