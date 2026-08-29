import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_SETTINGS,
	LEGACY_DEFAULT_EXPORT_FOLDER,
	normalizeStoredSettings,
} from "../src/settings/types";

void test("new settings use the hyphenated default export folder", () => {
	const result = normalizeStoredSettings(null);

	assert.equal(result.settings.exportFolder, "BrewVault-Exports");
	assert.equal(result.shouldPersist, true);
});

void test("the exact legacy default folder migrates automatically", () => {
	const result = normalizeStoredSettings({
		theme: "phb",
		exportFolder: LEGACY_DEFAULT_EXPORT_FOLDER,
	});

	assert.equal(result.settings.exportFolder, DEFAULT_SETTINGS.exportFolder);
	assert.equal(result.shouldPersist, true);
});

void test("custom export folders remain untouched", () => {
	const result = normalizeStoredSettings({
		theme: "phb",
		customStyles: [],
		nextCustomStyleNumber: 1,
		exportFolder: "My Campaign/PDF Exports",
	});

	assert.equal(result.settings.exportFolder, "My Campaign/PDF Exports");
	assert.equal(result.shouldPersist, false);
});

void test("a stored custom theme remains selected when its validated style exists", () => {
	const result = normalizeStoredSettings({
		theme: "custom:1",
		customStyles: [
			{
				id: "custom:1",
				name: "Night",
				css: ".brewvault-theme-custom .brewPage { color: white; background: black; }\n",
			},
		],
		nextCustomStyleNumber: 1,
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "custom:1");
	assert.equal(result.settings.customStyles[0].name, "Night");
});

void test("a missing custom theme falls back to PHB", () => {
	const result = normalizeStoredSettings({
		theme: "custom:9",
		customStyles: [],
		nextCustomStyleNumber: 1,
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "phb");
	assert.equal(result.shouldPersist, true);
});

void test("legacy journal themes still normalize to SRD", () => {
	const result = normalizeStoredSettings({
		theme: "journal",
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "srd");
	assert.equal(result.shouldPersist, true);
});
