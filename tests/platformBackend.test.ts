import assert from "node:assert/strict";
import test from "node:test";
import { createBackendProvider } from "../src/platform/createBackendProvider";
import { detectPlatform } from "../src/platform/detectPlatform";
import { ExportBackendProvider } from "../src/platform/ExportBackendProvider";
import type {
	BackendLoaders,
	BrewVaultPlatform,
	ExportBackend,
	ExportRequest,
	ExportResult,
} from "../src/platform/types";

class TestBackend implements ExportBackend {
	readonly supportsDirectPdf: boolean;
	disposeCalls = 0;
	exportCalls = 0;

	constructor(
		readonly platform: BrewVaultPlatform,
		private readonly result: ExportResult = {
			kind: "unsupported",
			reason: "test backend",
		}
	) {
		this.supportsDirectPdf = result.kind === "pdf";
	}

	export(_request: ExportRequest): Promise<ExportResult> {
		this.exportCalls += 1;
		return Promise.resolve(this.result);
	}

	dispose(): void {
		this.disposeCalls += 1;
	}
}

void test("platform detection accepts exactly one Obsidian platform flag", () => {
	assert.equal(
		detectPlatform({ isDesktopApp: true, isMobileApp: false }),
		"desktop"
	);
	assert.equal(
		detectPlatform({ isDesktopApp: false, isMobileApp: true }),
		"mobile"
	);
	assert.throws(
		() => detectPlatform({ isDesktopApp: false, isMobileApp: false }),
		/could not determine/
	);
	assert.throws(
		() => detectPlatform({ isDesktopApp: true, isMobileApp: true }),
		/could not determine/
	);
});

void test("mobile initialization never calls the desktop loader", async () => {
	let desktopLoads = 0;
	let mobileLoads = 0;
	const mobileBackend = new TestBackend("mobile");
	const provider = new ExportBackendProvider("mobile", {
		loadDesktop: () => {
			desktopLoads += 1;
			throw new Error("desktop loader must not run on mobile");
		},
		loadMobile: () => {
			mobileLoads += 1;
			return Promise.resolve(mobileBackend);
		},
	});

	assert.equal(desktopLoads, 0);
	assert.equal(mobileLoads, 0);
	assert.equal(await provider.getBackend(), mobileBackend);
	assert.equal(desktopLoads, 0);
	assert.equal(mobileLoads, 1);
});

void test("the default mobile backend initializes without Electron or window", async () => {
	assert.equal(typeof window, "undefined");
	const provider = createBackendProvider("mobile");
	const backend = await provider.getBackend();
	const result = await backend.export({ html: "<p>safe</p>", basename: "safe" });

	assert.equal(backend.platform, "mobile");
	assert.equal(result.kind, "unsupported");
	provider.dispose();
});

void test("desktop backend loading is lazy and the instance is reused", async () => {
	let desktopLoads = 0;
	const desktopBackend = new TestBackend("desktop", {
		kind: "pdf",
		bytes: new ArrayBuffer(5),
	});
	const provider = new ExportBackendProvider(
		"desktop",
		createLoaders(() => {
			desktopLoads += 1;
			return Promise.resolve(desktopBackend);
		})
	);

	assert.equal(desktopLoads, 0);
	const [first, second] = await Promise.all([
		provider.getBackend(),
		provider.getBackend(),
	]);
	assert.equal(first, desktopBackend);
	assert.equal(second, desktopBackend);
	assert.equal(desktopLoads, 1);
});

void test("disposal ignores uncreated backends and disposes created backends once", async () => {
	let loads = 0;
	const untouched = new ExportBackendProvider(
		"desktop",
		createLoaders(() => {
			loads += 1;
			return Promise.resolve(new TestBackend("desktop"));
		})
	);
	untouched.dispose();
	assert.equal(loads, 0);

	const backend = new TestBackend("desktop");
	const created = new ExportBackendProvider(
		"desktop",
		createLoaders(() => Promise.resolve(backend))
	);
	await created.getBackend();
	created.dispose();
	created.dispose();
	assert.equal(backend.disposeCalls, 1);
	await assert.rejects(created.getBackend(), /after plugin unload/);
});

void test("a backend that resolves after unload is disposed exactly once", async () => {
	let resolveBackend: ((backend: ExportBackend) => void) | undefined;
	const pendingBackend = new Promise<ExportBackend>((resolve) => {
		resolveBackend = resolve;
	});
	const backend = new TestBackend("desktop");
	const provider = new ExportBackendProvider(
		"desktop",
		createLoaders(() => pendingBackend)
	);
	const loading = provider.getBackend();

	provider.dispose();
	resolveBackend?.(backend);
	await assert.rejects(loading, /finished loading after plugin unload/);
	assert.equal(backend.disposeCalls, 1);
});

void test("a backend for the wrong platform is rejected and disposed", async () => {
	const wrongBackend = new TestBackend("mobile");
	const provider = new ExportBackendProvider(
		"desktop",
		createLoaders(() => Promise.resolve(wrongBackend))
	);

	await assert.rejects(provider.getBackend(), /mobile backend for desktop/);
	assert.equal(wrongBackend.disposeCalls, 1);
});

function createLoaders(
	loadDesktop: () => Promise<ExportBackend>
): BackendLoaders {
	return {
		loadDesktop,
		loadMobile: () => Promise.resolve(new TestBackend("mobile")),
	};
}
