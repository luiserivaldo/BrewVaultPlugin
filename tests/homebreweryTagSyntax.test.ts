import assert from "node:assert/strict";
import test from "node:test";
import {
	blockFoldRange,
	findHomebreweryTagRanges,
	formatHomebreweryTagLabel,
	selectionTouchesTag,
} from "../src/editor/homebreweryTagSyntax";

void test("matched nested block tags receive readable labels", () => {
	const source = [
		"{{monster,wide",
		"## Elder Drake",
		"{{dm-note",
		"Keep this secret.",
		"}}",
		"}}",
	].join("\n");

	assert.deepEqual(
		findHomebreweryTagRanges(source).map(({ kind, label }) => ({ kind, label })),
		[
			{ kind: "open", label: "Monster · Wide" },
			{ kind: "open", label: "Dm Note" },
			{ kind: "close", label: "Dm Note" },
			{ kind: "close", label: "Monster · Wide" },
		]
	);
});

void test("unfinished tags and fenced examples remain visible source", () => {
	const source = [
		"```markdown",
		"{{wide",
		"Example only",
		"}}",
		"```",
		"{{note",
		"Still being written",
	].join("\n");

	assert.deepEqual(findHomebreweryTagRanges(source), []);
});

void test("explicit page directives receive sequential page labels", () => {
	const source = [
		"Opening",
		"\\page",
		"Text {{damage 2d6}} here",
		"\\column",
		"\\page",
	].join("\n");
	assert.deepEqual(
		findHomebreweryTagRanges(source).map(({ kind, label }) => ({ kind, label })),
		[
			{ kind: "page", label: "Page 2" },
			{ kind: "page", label: "Page 3" },
		]
	);
});

void test("page directives inside fenced examples remain visible source", () => {
	const source = ["```markdown", "\\page", "```"].join("\n");
	assert.deepEqual(findHomebreweryTagRanges(source), []);
});

void test("selection intersection exposes the exact source tag", () => {
	const [tag] = findHomebreweryTagRanges("{{wide\nContent\n}}");
	assert.ok(tag);
	assert.equal(selectionTouchesTag([{ from: 2, to: 2 }], tag), true);
	assert.equal(selectionTouchesTag([{ from: 9, to: 9 }], tag), false);
});

void test("labels split commas, spaces, camel case, and hyphens", () => {
	assert.equal(
		formatHomebreweryTagLabel("classTable wide dm-note"),
		"Class Table · Wide · Dm Note"
	);
});

void test("matched openers fold from their line end to the end of their closing line", () => {
	const source = ["{{monster", "## Imp", "{{note", "Inside", "}}", "}}", "{{open", "```", "{{fenced", "```"].join("\n");
	const folds = findHomebreweryTagRanges(source)
		.map((tag) => blockFoldRange(tag))
		.filter((range) => range !== null)
		.map((range) => source.slice(range.from, range.to));
	// Outer block first, then the nested one; the unclosed and fenced tags don't fold.
	assert.deepEqual(folds, ["\n## Imp\n{{note\nInside\n}}\n}}", "\nInside\n}}"]);
	assert.equal(blockFoldRange({ kind: "close", from: 0, to: 2, label: "Note" }), null);
	assert.equal(blockFoldRange({ kind: "open", from: 0, to: 6, label: "Note", blockEnd: 6 }), null);
});
