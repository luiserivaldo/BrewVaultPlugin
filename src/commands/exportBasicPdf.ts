import type { MetadataCache, TFile, Vault } from "obsidian";
import { resolveVaultImageEmbeds } from "../obsidian/resolveVaultImageEmbeds";
import { renderBrewDocumentHtml } from "../renderer";
import type {
	BasicPdfExporterContract,
	BasicPdfProfile,
} from "../export/basicPdf/types";

export interface BasicPdfExportDependencies {
	readonly vault: Vault;
	readonly metadataCache: MetadataCache;
	readonly ensureExportFolder: () => Promise<string>;
	readonly allocateExportPath: (
		folder: string,
		basename: string,
		suffix: string
	) => string;
	readonly loadExporter: () => Promise<BasicPdfExporterContract>;
	readonly canWriteResult: () => boolean;
}

export interface BasicPdfExportReport {
	readonly outPath: string;
	readonly byteLength: number;
	readonly elapsedMs: number;
}

/** Generates the complete PDF before creating any vault file. */
export async function exportBasicPdf(
	file: TFile,
	dependencies: BasicPdfExportDependencies,
	profile: BasicPdfProfile = "basic",
	fileSuffix?: string
): Promise<BasicPdfExportReport> {
	const startedAt = performance.now();
	const source = await dependencies.vault.cachedRead(file);
	const resolvedImages = await resolveVaultImageEmbeds(
		source,
		file,
		dependencies.vault,
		dependencies.metadataCache
	);
	const html = renderBrewDocumentHtml(source, {
		imageEmbeds: resolvedImages.imageEmbeds,
	});
	const exporter = await dependencies.loadExporter();
	const result = await exporter.export({ html, basename: file.basename }, profile);

	if (!dependencies.canWriteResult()) {
		throw new Error("BrewVault unloaded before basic PDF generation finished.");
	}

	const exportFolder = await dependencies.ensureExportFolder();
	const outPath = dependencies.allocateExportPath(
		exportFolder,
		fileSuffix ? `${file.basename}.${fileSuffix}` : file.basename,
		".pdf"
	);
	await dependencies.vault.createBinary(outPath, result.bytes);
	return {
		outPath,
		byteLength: result.bytes.byteLength,
		elapsedMs: performance.now() - startedAt,
	};
}
