export type MobileShareOutcome =
	| { readonly kind: "shared" }
	| { readonly kind: "cancelled" }
	| { readonly kind: "unavailable"; readonly reason: string }
	| { readonly kind: "failed"; readonly reason: string };

interface MobileShareNavigator {
	canShare?(data: ShareData): boolean;
	share?(data: ShareData): Promise<void>;
}

export interface MobileShareDependencies {
	readonly navigator?: MobileShareNavigator;
	readonly createFile?: (
		parts: BlobPart[],
		name: string,
		options: FilePropertyBag
	) => File;
}

/** Share a self-contained HTML copy through the user-initiated Web Share API. */
export async function shareHtmlArtifact(
	html: string,
	filename: string,
	dependencies: MobileShareDependencies = {}
): Promise<MobileShareOutcome> {
	const shareNavigator = dependencies.navigator ?? getBrowserNavigator();
	if (!shareNavigator?.share) {
		return {
			kind: "unavailable",
			reason: "This runtime does not provide file sharing.",
		};
	}

	let file: File;
	try {
		file = (dependencies.createFile ?? createBrowserFile)(
			[html],
			filename,
			{ type: "text/html" }
		);
	} catch (error) {
		return { kind: "unavailable", reason: getErrorMessage(error) };
	}

	const shareData: ShareData = {
		files: [file],
		title: `BrewVault export: ${filename}`,
		text: "Open this BrewVault HTML document in a browser, then use Print → Save as PDF.",
	};

	try {
		if (shareNavigator.canShare && !shareNavigator.canShare(shareData)) {
			return {
				kind: "unavailable",
				reason: "This runtime cannot share HTML files.",
			};
		}
		await shareNavigator.share(shareData);
		return { kind: "shared" };
	} catch (error) {
		if (isAbortError(error)) return { kind: "cancelled" };
		return { kind: "failed", reason: getErrorMessage(error) };
	}
}

/** Build an actionable notice after the vault artifact has already been saved. */
export function getMobilePdfHandoffNotice(
	artifactPath: string,
	outcome: MobileShareOutcome
): string {
	const nextStep = "Open it in a browser, then use Print → Save as PDF.";
	switch (outcome.kind) {
		case "shared":
			return `Saved and shared "${artifactPath}". ${nextStep}`;
		case "cancelled":
			return `Saved "${artifactPath}". Sharing was cancelled. ${nextStep}`;
		case "unavailable":
			return `Saved "${artifactPath}". File sharing is unavailable. ${nextStep}`;
		case "failed":
			return `Saved "${artifactPath}". Sharing failed. ${nextStep}`;
	}
}

function getBrowserNavigator(): MobileShareNavigator | undefined {
	return typeof navigator === "undefined" ? undefined : navigator;
}

function createBrowserFile(
	parts: BlobPart[],
	name: string,
	options: FilePropertyBag
): File {
	if (typeof File === "undefined") {
		throw new Error("This runtime cannot create a shareable HTML file.");
	}
	return new File(parts, name, options);
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
