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
	assert.equal(result.settings.homebreweryEditMode, true);
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
		exportFolder: "My Campaign/PDF Exports",
		homebreweryEditMode: true,
	});

	assert.equal(result.settings.exportFolder, "My Campaign/PDF Exports");
	assert.equal(result.shouldPersist, false);
});

void test("existing settings receive and persist the Edit Mode default", () => {
	const result = normalizeStoredSettings({
		theme: "phb",
		exportFolder: "Custom",
	});

	assert.equal(result.settings.homebreweryEditMode, true);
	assert.equal(result.shouldPersist, true);
});

void test("users can explicitly disable Homebrewery Edit Mode", () => {
	const result = normalizeStoredSettings({
		theme: "phb",
		exportFolder: "Custom",
		homebreweryEditMode: false,
	});

	assert.equal(result.settings.homebreweryEditMode, false);
	assert.equal(result.shouldPersist, false);
});

void test("legacy journal themes still normalize to SRD", () => {
	const result = normalizeStoredSettings({
		theme: "journal",
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "srd");
	assert.equal(result.shouldPersist, true);
});
