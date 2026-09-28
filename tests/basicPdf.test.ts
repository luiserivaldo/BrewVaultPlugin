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
