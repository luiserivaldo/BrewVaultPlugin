import type {
	BackendLoaders,
	BrewVaultPlatform,
	ExportBackend,
} from "./types";

/** Lazily creates only the backend selected during plugin startup. */
export class ExportBackendProvider {
	private backend: ExportBackend | null = null;
	private backendPromise: Promise<ExportBackend> | null = null;
	private disposed = false;

	constructor(
		private readonly platform: BrewVaultPlatform,
		private readonly loaders: BackendLoaders
	) {}

	getBackend(): Promise<ExportBackend> {
		if (this.disposed) {
			return Promise.reject(
				new Error("BrewVault export backends are unavailable after plugin unload.")
			);
		}

		if (this.backend) return Promise.resolve(this.backend);
		if (this.backendPromise) return this.backendPromise;

		const loadingBackend = Promise.resolve().then(() =>
			this.platform === "desktop"
				? this.loaders.loadDesktop()
				: this.loaders.loadMobile()
		);

		this.backendPromise = loadingBackend
			.then((backend) => {
				this.assertMatchingPlatform(backend);
				if (this.disposed) {
					backend.dispose();
					throw new Error(
						"BrewVault export backend finished loading after plugin unload."
					);
				}

				this.backend = backend;
				return backend;
			})
			.catch((error: unknown) => {
				this.backendPromise = null;
				throw error;
			});

		return this.backendPromise;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.backend?.dispose();
		this.backend = null;
	}

	private assertMatchingPlatform(backend: ExportBackend): void {
		if (backend.platform !== this.platform) {
			backend.dispose();
			throw new Error(
				`BrewVault loaded a ${backend.platform} backend for ${this.platform}.`
			);
		}
	}
}
