import assert from "node:assert/strict";
import test from "node:test";
import { allocateExportPath } from "../src/export/allocateExportPath";

void test("keeps the original export name when it is unused", () => {
	assert.equal(
		allocateExportPath("BrewVault-Exports", "Alchemist", ".pdf", () => false),
		"BrewVault-Exports/Alchemist.pdf"
	);
});

void test("increments numbered PDF copies without overwriting", () => {
	const existing = new Set([
		"BrewVault-Exports/Alchemist.pdf",
		"BrewVault-Exports/Alchemist_1.pdf",
		"BrewVault-Exports/Alchemist_2.pdf",
	]);

	assert.equal(
		allocateExportPath("BrewVault-Exports", "Alchemist", ".pdf", (path) =>
			existing.has(path)
		),
		"BrewVault-Exports/Alchemist_3.pdf"
	);
});

void test("places the copy number before the complete HTML export suffix", () => {
	const existing = new Set(["Exports/Alter Fate.brew.html"]);

	assert.equal(
		allocateExportPath("Exports", "Alter Fate", ".brew.html", (path) => existing.has(path)),
		"Exports/Alter Fate_1.brew.html"
	);
});
