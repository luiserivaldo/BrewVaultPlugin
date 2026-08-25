import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculatePreviewViewportLayout } from "../src/ui/previewViewport";

void test("narrow portrait previews scale a fixed page to the available width", () => {
	const layout = calculatePreviewViewportLayout(375, 667, 816, 1056);

	assert.equal(layout.orientation, "portrait");
	assert.equal(layout.scale, 375 / 816);
	assert.equal(layout.scaledPageWidthPx, 375);
	assert.equal(layout.scaledPageHeightPx, 1056 * (375 / 816));
	assert.equal(layout.inlineOffsetPx, (375 - 816) / 2);
	assert.equal(layout.blockOffsetPx, layout.scaledPageHeightPx - 1056);
});

void test("landscape previews retain page geometry while changing only visual scale", () => {
	const layout = calculatePreviewViewportLayout(667, 375, 816, 1056);

	assert.equal(layout.orientation, "landscape");
	assert.equal(layout.scale, 667 / 816);
	assert.equal(layout.scaledPageWidthPx, 667);
	assert.equal(layout.scaledPageHeightPx, 1056 * (667 / 816));
});

void test("wide previews never enlarge fixed document pages", () => {
	const layout = calculatePreviewViewportLayout(1200, 900, 816, 1056);

	assert.equal(layout.scale, 1);
	assert.equal(layout.scaledPageWidthPx, 816);
	assert.equal(layout.scaledPageHeightPx, 1056);
	assert.equal(layout.inlineOffsetPx, 0);
	assert.equal(layout.blockOffsetPx, 0);
});

void test("preview scaling CSS leaves canonical page width and height intact", () => {
	const css = readFileSync("styles/base.css", "utf8");

	assert.match(css, /\.brewPage\s*\{[^}]*width: var\(--brew-page-width\);/s);
	assert.match(css, /\.brewPage\s*\{[^}]*height: var\(--brew-page-height\);/s);
	assert.match(
		css,
		/\.brewvault-preview-pages > \.brewPage\s*\{[^}]*transform: scale\(var\(--brew-preview-scale\)\);/s
	);
});

void test("invalid fixed page dimensions fail closed", () => {
	assert.throws(
		() => calculatePreviewViewportLayout(375, 667, 0, 1056),
		/BrewVault page width must be a positive finite number/
	);
});
