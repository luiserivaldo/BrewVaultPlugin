import assert from "node:assert/strict";
import test from "node:test";
import {
	getSavedHtmlArtifactMessage,
	MOBILE_PDF_BROWSER_INSTRUCTION,
	MOBILE_PDF_DIALOG_TITLE,
	MOBILE_PDF_OPEN_BUTTON_LABEL,
	MOBILE_PDF_PICKER_NOTICE,
	openHtmlArtifact,
	printHtmlArtifact,
} from "../src/mobile/openHtmlArtifact";

const app = {} as never;

void test("opens the saved vault path with Obsidian's default-app bridge", async () => {
	let openedPath = "";
	const outcome = await openHtmlArtifact(
		app,
		"BrewVault-Exports/Note.brew.html",
		{
			openWithDefaultApp: (path) => {
				openedPath = path;
			},
		}
	);

	assert.deepEqual(outcome, { kind: "opened" });
	assert.equal(openedPath, "BrewVault-Exports/Note.brew.html");
});

void test("reports an unavailable default-app bridge", async () => {
	const outcome = await openHtmlArtifact(
		app,
		"BrewVault-Exports/Note.brew.html",
		{}
	);

	assert.deepEqual(outcome, {
		kind: "unavailable",
		reason: "Obsidian does not provide a default-app opener.",
	});
});

void test("reports a default-app launch failure without losing the path", async () => {
	const outcome = await openHtmlArtifact(
		app,
		"BrewVault-Exports/Note.brew.html",
		{
			openWithDefaultApp: () => {
				throw new Error("Android rejected the file URI");
			},
		}
	);

	assert.deepEqual(outcome, {
		kind: "failed",
		reason: "Android rejected the file URI",
	});
});

void test("uses the approved concise mobile handoff copy and documents chooser limitation", () => {
	assert.equal(
		getSavedHtmlArtifactMessage("BrewVault-Exports/Note.brew.html"),
		'Saved file as "BrewVault-Exports/Note.brew.html".'
	);
	assert.equal(MOBILE_PDF_DIALOG_TITLE, "Export to PDF export ready");
	assert.equal(
		MOBILE_PDF_BROWSER_INSTRUCTION,
		'Choose Chrome or Brave, then tap "Print / Save as PDF" in the document. Chrome fallback: menu -> Share -> swipe to Print -> Save as PDF.'
	);
	assert.equal(MOBILE_PDF_OPEN_BUTTON_LABEL, "Open in Browser");
	assert.equal(
		MOBILE_PDF_PICKER_NOTICE,
		"Android controls the app list, spacing, and layout; BrewVault cannot filter it."
	);
});

void test("printHtmlArtifact returns unavailable in non-browser environment", async () => {
	// Simulate non-browser by temporarily making navigator/window undefined
	const originalNavigator = globalThis.navigator;
	const originalWindow = globalThis.window;
	Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });
	Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });

	try {
		const result = await printHtmlArtifact("<p>Test</p>", "test.html");
		assert.deepEqual(result, {
			kind: "unavailable",
			reason: "Not running in a browser environment.",
		});
	} finally {
		Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
		Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
	}
});

void test("printHtmlArtifact attempts navigator.share when available", async () => {
	let shared = false;
	const mockNavigator = {
		share: async (data: { files: File[]; title: string }) => {
			shared = true;
			assert.equal(data.files.length, 1);
			assert.equal(data.files[0].name, "test.html");
			assert.equal(data.files[0].type, "text/html");
			assert.equal(data.title, "test.html");
		},
		canShare: () => true,
	};
	const mockWindow = {
		open: () => null, // won't be called when share succeeds
	};
	const originalNavigator = globalThis.navigator;
	const originalWindow = globalThis.window;
	Object.defineProperty(globalThis, "navigator", { value: mockNavigator, configurable: true });
	Object.defineProperty(globalThis, "window", { value: mockWindow, configurable: true });

	try {
		const result = await printHtmlArtifact("<p>Test</p>", "test.html");
		assert.deepEqual(result, { kind: "shared" });
		assert.equal(shared, true);
	} finally {
		Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
		Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
	}
});

void test("printHtmlArtifact falls back to window.open + print when share unavailable", async () => {
	let openedUrl = "";
	let printCalled = false;
	const mockNavigator = {
		canShare: () => false,
	};
	const mockWindow = {
		open: (url?: string | URL) => {
			openedUrl = String(url ?? "");
			return {
				addEventListener: (event: string, handler: () => void) => {
					if (event === "load") {
						handler(); // Run synchronously to avoid async activity after test ends
					}
				},
				focus: () => {},
				print: () => {
					printCalled = true;
				},
			};
		},
		setTimeout: (handler: () => void, timeout: number) => {
			if (timeout === 0) handler();
			else setTimeout(handler, timeout);
		},
	};
	const originalNavigator = globalThis.navigator;
	const originalWindow = globalThis.window;
	Object.defineProperty(globalThis, "navigator", { value: mockNavigator, configurable: true });
	Object.defineProperty(globalThis, "window", { value: mockWindow, configurable: true });
	const originalCreateObjectURL = URL.createObjectURL.bind(URL);
	const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);

	URL.createObjectURL = (blob: Blob) => `blob:test/${blob.size}`;
	URL.revokeObjectURL = () => {};

	try {
		const result = await printHtmlArtifact("<p>Test</p>", "test.html");
		assert.deepEqual(result, { kind: "printed" });
		assert.ok(openedUrl.startsWith("blob:test/"));
		assert.equal(printCalled, true);
	} finally {
		Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
		Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
	}
});
