import assert from "node:assert/strict";
import test from "node:test";
import { resolveNoteEdition } from "../src/snippets/noteEdition";

void test("bv_edition accepts 2014 and 2024 as numbers or text", () => {
	assert.deepEqual(resolveNoteEdition({ bv_edition: 2014 }), { kind: "edition", edition: "2014" });
	assert.deepEqual(resolveNoteEdition({ bv_edition: " 2024 " }), {
		kind: "edition",
		edition: "2024",
	});
});

void test("missing or blank bv_edition uses the default edition", () => {
	assert.deepEqual(resolveNoteEdition(undefined), { kind: "none" });
	assert.deepEqual(resolveNoteEdition({}), { kind: "none" });
	assert.deepEqual(resolveNoteEdition({ bv_edition: "" }), { kind: "none" });
});

void test("other bv_edition values are reported as invalid", () => {
	assert.deepEqual(resolveNoteEdition({ bv_edition: 5 }), { kind: "invalid", value: "5" });
	assert.deepEqual(resolveNoteEdition({ bv_edition: "5e" }), { kind: "invalid", value: "5e" });
	assert.deepEqual(resolveNoteEdition({ bv_edition: ["2014"] }), {
		kind: "invalid",
		value: '["2014"]',
	});
});
