import assert from "node:assert/strict";
import test from "node:test";
import { resolveNoteTheme } from "../src/themes/noteTheme";
import type { CustomStyleDefinition } from "../src/themes/customStyles";

const customStyles: CustomStyleDefinition[] = [
	{ id: "custom:1", name: "Midnight Parchment", css: "" },
];

void test("absent and blank bv_theme values select no per-note theme", () => {
	assert.deepEqual(resolveNoteTheme(undefined, customStyles), { kind: "none" });
	assert.deepEqual(resolveNoteTheme(null, customStyles), { kind: "none" });
	assert.deepEqual(resolveNoteTheme("   ", customStyles), { kind: "none" });
});

void test("built-in themes match by id or display name, ignoring case", () => {
	assert.deepEqual(resolveNoteTheme("dmg", customStyles), { kind: "theme", theme: "dmg" });
	assert.deepEqual(resolveNoteTheme(" PHB ", customStyles), { kind: "theme", theme: "phb" });
	assert.deepEqual(resolveNoteTheme("Dungeon Master's Guide", customStyles), {
		kind: "theme",
		theme: "dmg",
	});
	assert.deepEqual(resolveNoteTheme("Unearthed Arcana", customStyles), {
		kind: "theme",
		theme: "srd",
	});
});

void test("custom styles match by id or by name", () => {
	assert.deepEqual(resolveNoteTheme("custom:1", customStyles), {
		kind: "theme",
		theme: "custom:1",
	});
	assert.deepEqual(resolveNoteTheme("midnight parchment", customStyles), {
		kind: "theme",
		theme: "custom:1",
	});
});

void test("unknown, removed, or non-string values are reported as invalid", () => {
	assert.deepEqual(resolveNoteTheme("journal", customStyles), {
		kind: "invalid",
		value: "journal",
	});
	assert.deepEqual(resolveNoteTheme("custom:2", customStyles), {
		kind: "invalid",
		value: "custom:2",
	});
	assert.deepEqual(resolveNoteTheme(["phb"], customStyles), {
		kind: "invalid",
		value: '["phb"]',
	});
	assert.deepEqual(resolveNoteTheme(3, customStyles), { kind: "invalid", value: "3" });
});
