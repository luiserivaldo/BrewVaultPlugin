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

void test("the bundled DMG theme remains selected", () => {
	const result = normalizeStoredSettings({
		theme: "dmg",
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "dmg");
});

void test("legacy journal themes still normalize to SRD", () => {
	const result = normalizeStoredSettings({
		theme: "journal",
		exportFolder: "Custom",
	});

	assert.equal(result.settings.theme, "srd");
	assert.equal(result.shouldPersist, true);
});

void test("the default edition is 2024 and invalid stored editions are repaired", () => {
	assert.equal(normalizeStoredSettings(null).settings.defaultEdition, "2024");

	const kept = normalizeStoredSettings({
		theme: "phb",
		customStyles: [],
		nextCustomStyleNumber: 1,
		exportFolder: "BrewVault-Exports",
		defaultEdition: "2014",
	});
	assert.equal(kept.settings.defaultEdition, "2014");
	assert.equal(kept.shouldPersist, false);

	const repaired = normalizeStoredSettings({
		theme: "phb",
		customStyles: [],
		nextCustomStyleNumber: 1,
		exportFolder: "BrewVault-Exports",
		defaultEdition: "2020",
	});
	assert.equal(repaired.settings.defaultEdition, "2024");
	assert.equal(repaired.shouldPersist, true);
});

void test("mobile PDF export defaults to browser handoff and repairs unknown methods", () => {
	assert.equal(normalizeStoredSettings(null).settings.mobilePdfMethod, "browser");

	const base = {
		theme: "phb",
		customStyles: [],
		nextCustomStyleNumber: 1,
		exportFolder: "BrewVault-Exports",
	};
	const kept = normalizeStoredSettings({ ...base, mobilePdfMethod: "native" });
	assert.equal(kept.settings.mobilePdfMethod, "native");
	assert.equal(kept.shouldPersist, false);

	const repaired = normalizeStoredSettings({ ...base, mobilePdfMethod: "print" });
	assert.equal(repaired.settings.mobilePdfMethod, "browser");
	assert.equal(repaired.shouldPersist, true);
});

void test("edition block commands are off for new installs and keep a stored choice", () => {
	assert.equal(normalizeStoredSettings(null).settings.editionBlockCommands, false);
	for (const stored of [true, false]) {
		const result = normalizeStoredSettings({ ...DEFAULT_SETTINGS, editionBlockCommands: stored });
		assert.equal(result.settings.editionBlockCommands, stored);
	}
});

void test("an invalid edition block commands value is repaired to a boolean", () => {
	const result = normalizeStoredSettings({ ...DEFAULT_SETTINGS, editionBlockCommands: "yes" });
	assert.equal(typeof result.settings.editionBlockCommands, "boolean");
	assert.equal(result.shouldPersist, true);
});

void test("installs saved before edition block commands existed get the trimmed palette", () => {
	const { editionBlockCommands: _omitted, ...legacy } = DEFAULT_SETTINGS;
	const result = normalizeStoredSettings({ ...legacy, defaultEdition: "2014" });
	assert.equal(result.settings.editionBlockCommands, false);
	assert.equal(result.shouldPersist, false);
});
