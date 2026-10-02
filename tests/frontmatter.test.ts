import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewDocumentHtml, renderBrewMarkdown, stripYamlFrontmatter } from "../src/renderer";

void test("leading YAML frontmatter is omitted from rendered Markdown", () => {
	const source = [
		"---",
		"created: 2026-10-02T12:00:00Z",
		"updated: 2026-10-02T12:30:00Z",
		"---",
		"# Visible title",
	].join("\n");

	const html = renderBrewDocumentHtml(source);

	assert.match(html, /<h1>Visible title<\/h1>/);
	assert.doesNotMatch(html, /created:/);
	assert.doesNotMatch(html, /updated:/);
	assert.equal(renderBrewMarkdown(source).length, 1);
});

void test("frontmatter stripping supports BOM, CRLF, and YAML document terminator", () => {
	const source = "\uFEFF---\r\ncreated: now\r\n...\r\n\r\nBody";

	assert.equal(stripYamlFrontmatter(source), "\r\nBody");
});

void test("a later thematic break remains document content", () => {
	const source = "# Title\n\n---\n\nBody";

	assert.match(renderBrewDocumentHtml(source), /<hr>/);
});
