const PDF_EXPORT_TIMEOUT_MS = 30_000;

export const ELECTRON_PDF_PRINT_OPTIONS = Object.freeze({
	displayHeaderFooter: false,
	landscape: false,
	margins: { top: 0, bottom: 0, left: 0, right: 0 },
	pageSize: "Letter",
	preferCSSPageSize: true,
	printBackground: true,
});

interface ElectronRemote {
	BrowserWindow: new (options: Record<string, unknown>) => ElectronBrowserWindow;
}

interface ElectronBrowserWindow {
	destroy(): void;
	isDestroyed(): boolean;
	loadURL(url: string): Promise<void>;
	webContents: ElectronWebContents;
}

interface ElectronWebContents {
	executeJavaScript<T>(code: string): Promise<T>;
	isDestroyed(): boolean;
	printToPDF(options: Record<string, unknown>): Promise<Uint8Array>;
	setWindowOpenHandler(
		handler: () => { action: "deny" }
	): void;
}

interface ObsidianElectronWindow extends Window {
	electron?: {
		remote?: ElectronRemote;
	};
}

/**
 * Narrow boundary around Obsidian desktop's bundled Electron runtime.
 * Rendered documents run in an isolated hidden BrowserWindow and the window is
 * always destroyed on success, failure, timeout, or plugin unload.
 */
export class ElectronPdfExporter {
	private readonly activeWindows = new Set<ElectronBrowserWindow>();
	private disposed = false;

	async renderHtmlToPdf(html: string): Promise<ArrayBuffer> {
		if (this.disposed) {
			throw new Error("BrewVault PDF exporter is unavailable after plugin unload.");
		}

		const remote = getElectronRemote();
		const printWindow = new remote.BrowserWindow({
			show: false,
			width: 816,
			height: 1056,
			skipTaskbar: true,
			webPreferences: {
				contextIsolation: true,
				devTools: false,
				nodeIntegration: false,
				partition: createEphemeralPartitionName(),
				sandbox: true,
				webSecurity: true,
			},
		});
		this.activeWindows.add(printWindow);

		try {
			printWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
			const documentUrl = encodeHtmlAsDataUrl(html);

			await withTimeout(
				printWindow.loadURL(documentUrl),
				PDF_EXPORT_TIMEOUT_MS,
				"loading the print renderer"
			);
			ensureUsable(printWindow);

			await withTimeout(
				printWindow.webContents.executeJavaScript<boolean>(PRINT_READY_SCRIPT),
				PDF_EXPORT_TIMEOUT_MS,
				"waiting for print resources"
			);
			ensureUsable(printWindow);

			const pdfBytes = await withTimeout(
				printWindow.webContents.printToPDF(ELECTRON_PDF_PRINT_OPTIONS),
				PDF_EXPORT_TIMEOUT_MS,
				"generating the PDF"
			);

			return copyValidatedPdf(pdfBytes);
		} finally {
			this.activeWindows.delete(printWindow);
			destroyWindow(printWindow);
		}
	}

	dispose(): void {
		this.disposed = true;
		for (const printWindow of this.activeWindows) {
			destroyWindow(printWindow);
		}
		this.activeWindows.clear();
	}
}

/** Encode Unicode HTML without exposing Node's Buffer API to plugin code. */
export function encodeHtmlAsDataUrl(html: string): string {
	const bytes = new TextEncoder().encode(html);
	let binary = "";
	const chunkSize = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
	}
	return `data:text/html;charset=utf-8;base64,${btoa(binary)}`;
}

const PRINT_READY_SCRIPT = `
(async () => {
	if (document.fonts && document.fonts.ready) {
		await document.fonts.ready;
	}
	await Promise.all(Array.from(document.images).map((image) => {
		if (image.complete) return Promise.resolve();
		return new Promise((resolve) => {
			image.addEventListener("load", resolve, { once: true });
			image.addEventListener("error", resolve, { once: true });
		});
	}));
	return true;
})()
`;

function getElectronRemote(): ElectronRemote {
	const electronWindow = window as ObsidianElectronWindow;
	const remote = electronWindow.electron?.remote;
	if (!remote?.BrowserWindow) {
		throw new Error(
			"BrewVault could not access Obsidian desktop's Electron BrowserWindow API."
		);
	}
	return remote;
}

function createEphemeralPartitionName(): string {
	return `brewvault-print-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ensureUsable(printWindow: ElectronBrowserWindow): void {
	if (printWindow.isDestroyed() || printWindow.webContents.isDestroyed()) {
		throw new Error("BrewVault's print renderer closed before PDF generation finished.");
	}
}

function destroyWindow(printWindow: ElectronBrowserWindow): void {
	if (!printWindow.isDestroyed()) {
		printWindow.destroy();
	}
}

async function withTimeout<T>(
	operation: Promise<T>,
	timeoutMs: number,
	description: string
): Promise<T> {
	let timeoutHandle: number | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutHandle = window.setTimeout(() => {
			reject(new Error(`Timed out while ${description}.`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([operation, timeout]);
	} finally {
		if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
	}
}

export function copyValidatedPdf(pdfBytes: Uint8Array): ArrayBuffer {
	if (
		pdfBytes.byteLength < 5 ||
		pdfBytes[0] !== 0x25 ||
		pdfBytes[1] !== 0x50 ||
		pdfBytes[2] !== 0x44 ||
		pdfBytes[3] !== 0x46 ||
		pdfBytes[4] !== 0x2d
	) {
		throw new Error("Electron returned an invalid PDF document.");
	}

	const copy = new Uint8Array(pdfBytes.byteLength);
	copy.set(pdfBytes);
	return copy.buffer;
}
