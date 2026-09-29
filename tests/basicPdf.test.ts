import assert from "node:assert/strict";
import test from "node:test";
import type { ResolvedImageEmbed } from "../src/renderer";
import { renderBrewDocumentHtml } from "../src/renderer";
import {
	BASIC_PDF_DEFAULT_STYLES,
	BasicPdfExporter,
	buildBasicPdfDefinition,
	isSupportedBasicPdfImageSource,
	sanitizeBasicPdfContent,
} from "../src/export/basicPdf/BasicPdfExporter";
import {
	buildThemedPdfDefinition,
	buildSrdPdfDefinition,
	flowIntoSrdColumns,
	SRD_PDF_DEFAULT_STYLES,
} from "../src/export/basicPdf/srdProfile";

const semanticFixture = [
	"# Title",
	"## Section",
	"### Subsection",
	"Paragraph with **bold**, *italic*, and an em dash — plus café.",
	"",
	"- First",
	"- Second",
	"",
	"> Read-aloud text",
	"",
	"| Chapter | Level |",
	"| --- | --- |",
	"| Arrival | 3rd |",
	"",
	"![[poster.png]]",
].join("\n");

void test("whole-document rendering preserves basic Markdown semantics and resolved images", () => {
	const images = new Map<string, ResolvedImageEmbed>([
		["poster.png", { src: "data:image/png;base64,cG5n" }],
	]);
	const html = renderBrewDocumentHtml(semanticFixture, { imageEmbeds: images });

	assert.match(html, /<h1>Title<\/h1>/);
	assert.match(html, /<h2>Section<\/h2>/);
	assert.match(html, /<h3>Subsection<\/h3>/);
	assert.match(html, /<strong>bold<\/strong>/);
	assert.match(html, /<em>italic<\/em>/);
	assert.match(html, /— plus café/);
	assert.match(html, /<ul>/);
	assert.match(html, /<blockquote>/);
	assert.match(html, /<table>/);
	assert.match(html, /src="data:image\/png;base64,cG5n"/);
});

void test("basic PDF definition uses Letter pages, metadata, and semantic heading styles", () => {
	const definition = buildBasicPdfDefinition("Semantic content", "Llynwych");

	assert.equal(definition.pageSize, "LETTER");
	assert.deepEqual(definition.pageMargins, [54, 54, 54, 54]);
	assert.equal(definition.defaultStyle?.font, "Roboto");
	assert.equal(definition.defaultStyle?.fontSize, 11);
	assert.equal(definition.info?.title, "Llynwych");
	assert.equal(BASIC_PDF_DEFAULT_STYLES.h1?.fontSize, 24);
	assert.equal(BASIC_PDF_DEFAULT_STYLES.h6?.fontSize, 11);
	assert.equal(BASIC_PDF_DEFAULT_STYLES.th?.bold, true);
});

void test("basic PDF accepts only embedded PNG and JPEG image sources", () => {
	assert.equal(isSupportedBasicPdfImageSource("data:image/png;base64,cG5n"), true);
	assert.equal(isSupportedBasicPdfImageSource("data:image/jpeg;base64,anBlZw=="), true);
	assert.equal(isSupportedBasicPdfImageSource("https://example.com/poster.png"), false);
	assert.equal(isSupportedBasicPdfImageSource("data:image/webp;base64,d2VicA=="), false);
});

void test("basic PDF bounds embedded images and removes remote images before generation", () => {
	const content = sanitizeBasicPdfContent([
		{ image: "data:image/png;base64,cG5n" },
		{ image: "https://example.com/poster.png" },
	]);
	assert.deepEqual(content, [
		{ image: "data:image/png;base64,cG5n", fit: [504, 684] },
		{ text: "" },
	]);
});

void test("disposed basic exporter fails before loading its heavy runtime", async () => {
	const exporter = new BasicPdfExporter();
	exporter.dispose();
	await assert.rejects(
		exporter.export({ html: "<p>Never rendered</p>", basename: "Disposed" }),
		/unavailable after plugin unload/
	);
});

void test("SRD profile uses a distinct two-column Letter presentation", () => {
	const definition = buildSrdPdfDefinition(
		[
			{ text: "Opening", style: "h1" },
			{ image: "data:image/png;base64,cG5n", fit: [504, 684] },
			{ text: "A concise paragraph for the left column." },
			{
				table: { body: [["Level", "Benefit"], ["1", "Feature"]] },
			},
		],
		"Llynwych"
	);

	assert.equal(definition.pageSize, "LETTER");
	assert.deepEqual(definition.pageMargins, [46, 54, 46, 46]);
	assert.equal(definition.defaultStyle?.fontSize, 9.5);
	assert.equal(SRD_PDF_DEFAULT_STYLES.h1?.color, "#58180D");
	assert.equal(definition.header, undefined);
	assert.equal(definition.footer, undefined);
	assert.ok(Array.isArray(definition.content));
	const firstPage = definition.content?.[0] as { columns?: unknown[] };
	assert.equal(firstPage.columns?.length, 2);
	const serialized = JSON.stringify(definition.content);
	assert.match(serialized, /"fit":\[252,300\]/);
	assert.match(serialized, /"fillColor":"#58180D"/);
	assert.match(serialized, /"color":"#FFFFFF"/);
});

void test("native profiles preserve distinct PHB, DMG, SRD, and Blank palettes", () => {
	const profiles = [
		["phb", "#6E1808"],
		["dmg", "#1D3A48"],
		["srd", "#58180D"],
		["blank", "#555555"],
	] as const;
	const headers = new Set<string>();
	for (const [profile, headerColor] of profiles) {
		const definition = buildThemedPdfDefinition(
			{ table: { body: [["Heading"], ["Body"]] } },
			"Llynwych",
			profile
		);
		const serialized = JSON.stringify(definition);
		assert.match(serialized, /"columns"/);
		assert.match(serialized, new RegExp(headerColor));
		if (profile === "phb" || profile === "dmg") {
			assert.equal(definition.defaultStyle?.font, "BookInsanity");
			assert.equal(definition.styles?.h1?.font, "BookInsanity");
		}
		assert.equal(definition.header, undefined);
		assert.equal(definition.footer, undefined);
		if (profile === "phb" || profile === "dmg") {
			assert.equal(typeof definition.background, "function");
		} else {
			assert.equal(definition.background, undefined);
		}
		headers.add(profile);
	}
	assert.equal(headers.size, profiles.length);
});

void test("native profiles layer themed heading properties over html-to-pdfmake headings", () => {
	const definition = buildThemedPdfDefinition(
		{ text: [{ text: "Everwoods" }], style: ["html-div", "html-h2"] },
		"Llynwych",
		"phb"
	);
	const pages = definition.content as Array<{
		columns?: Array<{ stack?: Array<Record<string, unknown>> }>;
	}>;
	const firstPage = pages[0];
	const heading = firstPage.columns?.[0]?.stack?.[0];
	assert.deepEqual(heading?.style, ["html-div", "html-h2"]);
	assert.equal(heading?.font, "BookInsanity");
	assert.equal(heading?.color, "#9C1C10");
	assert.equal((heading?.text as Array<Record<string, unknown>>)[0]?.font, "BookInsanity");
	assert.equal((heading?.text as Array<Record<string, unknown>>)[0]?.color, "#9C1C10");
});

void test("PHB headings and blockquotes receive compact native decorative treatment", () => {
	const definition = buildThemedPdfDefinition(
		[
			{ text: [{ text: "Section" }], style: ["html-div", "html-h2"] },
			{ text: [{ text: "Read aloud" }], style: ["html-div", "html-blockquote"], margin: [18, 4, 0, 8] },
			{ image: "data:image/png;base64,cG5n", fit: [504, 684] },
		],
		"Llynwych",
		"phb"
	);
	const serialized = JSON.stringify(definition.content);
	assert.match(serialized, /"decoration":"underline"/);
	assert.match(serialized, /"decorationColor":"#9C1C10"/);
	assert.match(serialized, /"text":"◆"/);
	assert.match(serialized, /"fillColor":"#F6E5BD"/);
	assert.match(serialized, /"margin":\[0,3,0,10\]/);
	assert.doesNotMatch(serialized, /"margin":\[18,4,0,8\]/);
});

void test("SRD column flow keeps table blocks whole and starts another page", () => {
	const blocks = [
		{ text: "A".repeat(2200) },
		{ table: { body: [["Header"], ["Row"]] } },
		{ text: "B".repeat(2200) },
		{ text: "C".repeat(2200) },
	];
	const pages = flowIntoSrdColumns(blocks);

	assert.ok(pages.length >= 2);
	const serialized = JSON.stringify(pages);
	assert.match(serialized, /"table"/);
	assert.match(serialized, /"pageBreak":"before"/);
});

void test("SRD flow expands a long unordered list into independently packable bullets", () => {
	const pages = flowIntoSrdColumns([
		{ ul: Array.from({ length: 20 }, (_, index) => `Chapter ${index + 1}`) },
	]);
	const serialized = JSON.stringify(pages);

	assert.doesNotMatch(serialized, /"ul":\["Chapter 1","Chapter 2"/);
	assert.match(serialized, /"ul":\["Chapter 1"\]/);
	assert.match(serialized, /"ul":\["Chapter 20"\]/);
});
