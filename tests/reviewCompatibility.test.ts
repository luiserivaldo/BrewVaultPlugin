import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("theme CSS uses a tracked typed virtual module", async () => {
	const mainSource = await readFile("src/main.ts", "utf8");
	const declaration = await readFile(
		"src/types/virtual-theme-css.d.ts",
		"utf8"
	);
	const buildScript = await readFile("scripts/build-css.mjs", "utf8");

	assert.match(mainSource, /from "virtual:brewvault-theme-css"/);
	assert.match(declaration, /BUNDLED_THEME_CSS: string/);
	assert.doesNotMatch(mainSource, /\.\/generated\/themeCss/);
	assert.doesNotMatch(buildScript, /src\/generated/);
});

void test("source and release CSS retain targeted compatibility controls", async () => {
	for (const path of [
		"styles/base.css",
		"styles/homebrewery/5e-phb.css",
		"styles/srd-theme.css",
		"styles.css",
	]) {
		const css = await readFile(path, "utf8");
		assert.match(css, /doiuse-disable[^\n]*multicolumn/, path);
	}

	const phbCss = await readFile("styles/homebrewery/5e-phb.css", "utf8");
	const releaseCss = await readFile("styles.css", "utf8");
	assert.match(phbCss, /doiuse-disable[^\n]*css-text-indent/);
	assert.match(releaseCss, /doiuse-disable[^\n]*css-text-indent/);
});
