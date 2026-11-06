import assert from "node:assert/strict";
import test from "node:test";
import { findMonsterBlocks, monsterSectionAction } from "../src/editor/monsterBlocks";

const NOTE = [
	"# Imp", // 0
	"", // 1
	"{{monster,frame", // 2
	"## Hawk", // 3
	"*Tiny Beast*", // 4
	"___", // 5
	"**AC** :: 13", // 6
	"}}", // 7
	"", // 8
	"After.", // 9
].join("\n");

void test("finds a monster block with its lines, classes, and Markdown", () => {
	const [block, ...rest] = findMonsterBlocks(NOTE);

	assert.equal(rest.length, 0);
	assert.deepEqual(block.classes, ["monster", "frame"]);
	assert.equal(block.firstLine, 2);
	assert.equal(block.lastLine, 7);
	assert.equal(block.markdown, "{{monster,frame\n## Hawk\n*Tiny Beast*\n___\n**AC** :: 13\n}}");
	assert.equal(NOTE.slice(block.from, block.to), block.markdown);
});

void test("only blocks with the monster class count", () => {
	assert.equal(findMonsterBlocks("{{note\nBody\n}}").length, 0);
	assert.equal(findMonsterBlocks("{{descriptive,wide\nBody\n}}").length, 0);
	assert.equal(findMonsterBlocks("{{monster\nBody\n}}").length, 1);
	assert.deepEqual(findMonsterBlocks("{{monster,frame,wide\nBody\n}}")[0].classes, ["monster", "frame", "wide"]);
});

void test("unterminated openers and fenced examples are not blocks", () => {
	assert.equal(findMonsterBlocks("{{monster,frame\nNo closer.").length, 0);
	assert.equal(findMonsterBlocks("```\n{{monster,frame\nBody\n}}\n```").length, 0);
});

void test("a monster block inside another container is found, and nested monsters stay inside", () => {
	const inner = findMonsterBlocks("{{wide\n{{monster,frame\nBody\n}}\n}}");
	assert.equal(inner.length, 1);
	assert.equal(inner[0].firstLine, 1);

	const nested = findMonsterBlocks("{{monster\n{{monster,frame\nBody\n}}\n}}");
	assert.equal(nested.length, 1, "the inner monster belongs to the outer block");
	assert.equal(nested[0].lastLine, 4);
});

void test("several blocks and CRLF notes are all found", () => {
	const note = "{{monster,frame\r\nA\r\n}}\r\n\r\n{{monster,frame\r\nB\r\n}}\r\n";
	const blocks = findMonsterBlocks(note);
	assert.equal(blocks.length, 2);
	assert.deepEqual(blocks.map((block) => [block.firstLine, block.lastLine]), [[0, 2], [4, 6]]);
});

void test("Reading view draws a block once and hides its other sections", () => {
	const blocks = findMonsterBlocks(NOTE);

	assert.equal(monsterSectionAction(blocks, 0, 0).kind, "leave", "the heading above");
	assert.equal(monsterSectionAction(blocks, 2, 2).kind, "render", "the opener's section");
	assert.equal(monsterSectionAction(blocks, 3, 3).kind, "hide");
	assert.equal(monsterSectionAction(blocks, 5, 5).kind, "hide");
	assert.equal(monsterSectionAction(blocks, 6, 7).kind, "hide", "the paragraph holding the closer");
	assert.equal(monsterSectionAction(blocks, 9, 9).kind, "leave", "text after the block");
	const render = monsterSectionAction(blocks, 2, 5);
	assert.equal(render.kind, "render", "an opener section may run on into the block");
});

void test("a section that also holds text outside the block is left alone", () => {
	const blocks = findMonsterBlocks(NOTE);
	assert.equal(monsterSectionAction(blocks, 6, 9).kind, "leave", "closer plus following text");
	assert.equal(monsterSectionAction(blocks, 1, 2).kind, "leave", "text before the opener");
});
