import assert from "node:assert/strict";
import test from "node:test";
import {
	findHomebrewerySyntax,
	formatBlockLabel,
	selectionTouchesConstruct,
} from "../src/editor/homebrewerySyntax";

void test("matched nested block delimiters receive readable labels", () => {
	const source = [
		"{{monster,wide",
		"## Elder Drake",
		"{{dm-note",
		"Keep this secret.",
		"}}",
		"}}",
	].join("\n");

	const constructs = findHomebrewerySyntax(source);

	assert.deepEqual(
		constructs.map(({ kind, label }) => ({ kind, label })),
		[
			{ kind: "block-open", label: "Monster · Wide" },
			{ kind: "block-open", label: "Dm Note" },
			{ kind: "block-close", label: "Dm Note" },
			{ kind: "block-close", label: "Monster · Wide" },
		]
	);
});

void test("unfinished blocks and fenced examples remain visible", () => {
	const source = [
		"```markdown",
		"{{wide",
		"Example only",
		"}}",
		"```",
		"{{note",
		"Still being written",
	].join("\n");

	assert.deepEqual(findHomebrewerySyntax(source), []);
});

void test("explicit layout directives are detected independently", () => {
	const source = ["Opening", "\\page", "Middle", "\\column", "Ending"].join("\n");

	assert.deepEqual(
		findHomebrewerySyntax(source)
			.filter(({ kind }) => kind.endsWith("break"))
			.map(({ kind, label }) => ({ kind, label })),
		[
			{ kind: "page-break", label: "Page break" },
			{ kind: "column-break", label: "Column break" },
		]
	);
});

void test("selection intersection reveals structural source", () => {
	const [construct] = findHomebrewerySyntax("{{wide\nContent\n}}");
	assert.ok(construct);

	assert.equal(selectionTouchesConstruct([{ from: 2, to: 2 }], construct), true);
	assert.equal(selectionTouchesConstruct([{ from: 9, to: 9 }], construct), false);
});

void test("class labels split commas, whitespace, camel case, and hyphens", () => {
	assert.equal(formatBlockLabel("classTable wide dm-note"), "Class Table · Wide · Dm Note");
});
