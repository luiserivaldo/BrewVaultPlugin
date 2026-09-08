import assert from "node:assert/strict";
import test from "node:test";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";
import {
	createCustomStyleSubmission,
	extractCustomStyleName,
	validateCustomStyleCss,
} from "../src/themes/customStyles";
import { getThemeClassNames } from "../src/themes/registry";

const NAMED_CSS = `
/* @brewvault-theme: Midnight Parchment */
.brewvault-theme-custom .brewPage {
	background: #171717;
	color: #f3ead3;
}
`;

void test("custom style names come from the BrewVault metadata tag", () => {
	assert.equal(extractCustomStyleName(NAMED_CSS), "Midnight Parchment");
	const submission = createCustomStyleSubmission(NAMED_CSS, [], 1);

	assert.equal(submission.style.id, "custom:1");
	assert.equal(submission.style.name, "Midnight Parchment");
	assert.equal(submission.nextCustomStyleNumber, 1);
});

void test("unnamed styles receive ascending fallback display names", () => {
	const first = createCustomStyleSubmission(
		".brewvault-theme-custom .brewPage { color: navy; }",
		[],
		1
	);
	const second = createCustomStyleSubmission(
		".brewvault-theme-custom .brewPage { color: maroon; }",
		[first.style],
		first.nextCustomStyleNumber
	);

	assert.equal(first.style.name, "Custom_Style_1");
	assert.equal(second.style.name, "Custom_Style_2");
	assert.equal(second.style.id, "custom:2");
	assert.equal(second.nextCustomStyleNumber, 3);
});

void test("duplicate tagged display names are rejected", () => {
	const first = createCustomStyleSubmission(NAMED_CSS, [], 1);
	assert.throws(
		() => createCustomStyleSubmission(NAMED_CSS, [first.style], 1),
		/already exists/
	);
});

void test("custom CSS validation rejects malformed or externally loaded styles", () => {
	for (const css of [
		".brewvault-theme-custom .brewPage { color: red;",
		'@import url("https://example.com/theme.css");',
		'.brewvault-theme-custom .brewPage { background: url("https://example.com/paper.png"); }',
		".brewvault-theme-custom .brewPage { color: red; } </style>",
	]) {
		assert.equal(validateCustomStyleCss(css).valid, false, css);
	}
});

void test("custom CSS validation permits embedded data resources", () => {
	const result = validateCustomStyleCss(
		'.brewvault-theme-custom .brewPage { background-image: url("data:image/png;base64,AAAA"); }'
	);
	assert.equal(result.valid, true);
});

void test("custom themes use their own render class and serialize their CSS", () => {
	assert.deepEqual(getThemeClassNames("custom:1"), ["brewvault-theme-custom"]);
	const html = buildStandaloneHtml(
		[{ index: 1, html: "<p>Custom</p>" }],
		"custom:1",
		NAMED_CSS,
		"Custom style",
		816,
		1056
	);

	assert.match(html, /class="brewvault-theme-custom"/);
	assert.match(html, /@brewvault-theme: Midnight Parchment/);
});
