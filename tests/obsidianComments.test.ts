import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewDocumentHtml, stripObsidianComments } from "../src/renderer";

void test("inline Obsidian comments are removed from rendered Markdown", () => {
	const html = renderBrewDocumentHtml("Visible %%secret%% text");
	assert.match(html, /<p>Visible {2}text<\/p>/);
	assert.doesNotMatch(html, /secret|%%/);
});

void test("block comments spanning lines are removed without splitting a paragraph", () => {
	const source = "Line one\n%%\nhidden\nnote\n%%\nLine two";
	assert.equal(stripObsidianComments(source), "Line one\nLine two");
	assert.doesNotMatch(renderBrewDocumentHtml(source), /hidden/);
});

void test("a whole-line comment disappears entirely", () => {
	assert.equal(stripObsidianComments("# Title\n%% todo %%\nBody"), "# Title\nBody");
});

void test("an unclosed comment hides the rest of the note", () => {
	assert.equal(stripObsidianComments("Shown\n%%\nhidden\nalso hidden"), "Shown");
});

void test("double percent inside code stays literal", () => {
	const source = "Use `%%x%%` here\n\n```\n%% kept %%\n```\n\n~~~~\n%%\n~~~~";
	assert.equal(stripObsidianComments(source), source);
});

void test("frontmatter is untouched and still stripped", () => {
	const source = "---\ntitle: 50%% off\n---\nBody %%gone%%";
	assert.equal(stripObsidianComments(source), "---\ntitle: 50%% off\n---\nBody ");
	assert.doesNotMatch(renderBrewDocumentHtml(source), /title|gone/);
});

void test("comments hide Homebrewery blocks and page breaks", () => {
	const source = "Page one\n\n%%\n\\page\n{{note\nHidden\n}}\n%%\n\nStill page one";
	const html = renderBrewDocumentHtml(source);
	assert.doesNotMatch(html, /Hidden|BREW_PAGE_BREAK/);
	assert.match(html, /Still page one/);
});
