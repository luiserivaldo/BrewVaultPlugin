import assert from "node:assert/strict";
import test from "node:test";
import {
	getSavedHtmlArtifactMessage,
	MOBILE_PDF_BROWSER_INSTRUCTION,
	MOBILE_PDF_DIALOG_TITLE,
	MOBILE_PDF_OPEN_BUTTON_LABEL,
	openHtmlArtifact,
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

void test("uses the approved concise mobile handoff copy", () => {
	assert.equal(
		getSavedHtmlArtifactMessage("BrewVault-Exports/Note.brew.html"),
		'Saved file as "BrewVault-Exports/Note.brew.html".'
	);
	assert.equal(MOBILE_PDF_DIALOG_TITLE, "Export to PDF export ready");
	assert.equal(
		MOBILE_PDF_BROWSER_INSTRUCTION,
		'Click "Open in Browser", then Print -> Save as PDF.'
	);
	assert.equal(MOBILE_PDF_OPEN_BUTTON_LABEL, "Open in Browser");
});
