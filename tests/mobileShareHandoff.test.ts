import assert from "node:assert/strict";
import test from "node:test";
import {
	getMobilePdfHandoffNotice,
	shareHtmlArtifact,
	type MobileShareDependencies,
	type MobileShareOutcome,
} from "../src/mobile/shareHtmlArtifact";

const fakeFile = {} as File;
let createdFilename = "";
let createdMimeType = "";
const createFile: NonNullable<MobileShareDependencies["createFile"]> = (
	_parts,
	name,
	options
) => {
	createdFilename = name;
	createdMimeType = options.type ?? "";
	return fakeFile;
};

void test("shares a self-contained HTML file with browser print instructions", async () => {
	let sharedData: ShareData | undefined;
	let shareInvoked = false;
	const sharing = shareHtmlArtifact("<html>portable</html>", "Note.brew.html", {
		createFile,
		navigator: {
			canShare: (data) => data.files?.[0] === fakeFile,
			share: (data) => {
				shareInvoked = true;
				sharedData = data;
				return Promise.resolve();
			},
		},
	});
	assert.equal(shareInvoked, true, "share must run inside the button's user gesture");
	const outcome = await sharing;

	assert.deepEqual(outcome, { kind: "shared" });
	assert.equal(sharedData?.files?.[0], fakeFile);
	assert.equal(createdFilename, "Note.brew.html");
	assert.equal(createdMimeType, "text/html");
	assert.match(sharedData?.text ?? "", /Print → Save as PDF/);
});

void test("reports an unavailable handoff when file sharing is absent", async () => {
	const outcome = await shareHtmlArtifact("safe", "Note.brew.html", {
		createFile,
		navigator: {},
	});

	assert.equal(outcome.kind, "unavailable");
});

void test("reports an unavailable handoff when a File cannot be constructed", async () => {
	const outcome = await shareHtmlArtifact("safe", "Note.brew.html", {
		createFile: () => {
			throw new Error("File constructor missing");
		},
		navigator: { share: () => Promise.resolve() },
	});

	assert.deepEqual(outcome, {
		kind: "unavailable",
		reason: "File constructor missing",
	});
});

void test("reports an unavailable handoff when HTML files cannot be shared", async () => {
	const outcome = await shareHtmlArtifact("safe", "Note.brew.html", {
		createFile,
		navigator: {
			canShare: () => false,
			share: () => Promise.resolve(),
		},
	});

	assert.equal(outcome.kind, "unavailable");
});

void test("distinguishes user cancellation from a sharing failure", async () => {
	const abortError = new Error("cancelled");
	abortError.name = "AbortError";
	const cancelled = await shareHtmlArtifact("safe", "Note.brew.html", {
		createFile,
		navigator: { share: () => Promise.reject(abortError) },
	});
	const failed = await shareHtmlArtifact("safe", "Note.brew.html", {
		createFile,
		navigator: { share: () => Promise.reject(new Error("share target failed")) },
	});

	assert.deepEqual(cancelled, { kind: "cancelled" });
	assert.deepEqual(failed, { kind: "failed", reason: "share target failed" });
});

void test("every handoff outcome preserves an actionable artifact notice", () => {
	const outcomes: MobileShareOutcome[] = [
		{ kind: "shared" },
		{ kind: "cancelled" },
		{ kind: "unavailable", reason: "unsupported" },
		{ kind: "failed", reason: "failure" },
	];

	for (const outcome of outcomes) {
		const notice = getMobilePdfHandoffNotice(
			"BrewVault-Exports/Note.brew.html",
			outcome
		);
		assert.match(notice, /BrewVault-Exports\/Note\.brew\.html/);
		assert.match(notice, /Open it in a browser/);
		assert.match(notice, /Print → Save as PDF/);
	}
});
