import assert from "node:assert/strict";
import test from "node:test";
import {
	getDirectPdfUnavailableNotice,
	MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE,
} from "../src/commands/pdfAvailability";

void test("mobile PDF commands provide actionable HTML fallback guidance", () => {
	assert.equal(
		getDirectPdfUnavailableNotice({ platform: "mobile", supportsDirectPdf: false }),
		MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE
	);
	assert.match(MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE, /Export the file as HTML/);
	assert.match(MOBILE_DIRECT_PDF_UNAVAILABLE_NOTICE, /Print → Save as PDF/);
});

void test("supported desktop PDF commands proceed without an availability notice", () => {
	assert.equal(
		getDirectPdfUnavailableNotice({ platform: "desktop", supportsDirectPdf: true }),
		null
	);
});

void test("an unavailable non-mobile backend gets a platform-neutral notice", () => {
	assert.equal(
		getDirectPdfUnavailableNotice({ platform: "desktop", supportsDirectPdf: false }),
		"Direct PDF export is not available on this platform."
	);
});
