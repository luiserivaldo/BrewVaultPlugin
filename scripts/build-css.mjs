import esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

export const CSS_COMPATIBILITY_CONTROL =
	"/* doiuse-disable multicolumn, css-text-indent */\n";

/**
 * Standalone CSS build step. The control comment records two intentional,
 * layout-critical Homebrewery features so Obsidian's compatibility scanner
 * does not repeatedly report partial-support notices for them.
 */
export async function buildCss(prod = false) {
	await esbuild.build({
		entryPoints: ["styles/index.css"],
		bundle: true,
		outfile: "styles.css",
		loader: {
			".jpeg": "dataurl",
			".jpg": "dataurl",
			".png": "dataurl",
			".svg": "dataurl",
			".webp": "dataurl",
			".woff": "dataurl",
			".woff2": "dataurl",
		},
		minify: prod,
		logLevel: "silent",
	});

	const cssContent = readFileSync("styles.css", "utf8");
	writeFileSync("styles.css", CSS_COMPATIBILITY_CONTROL + cssContent);
}

// Allow `node scripts/build-css.mjs` directly.
if (import.meta.url === `file://${process.argv[1]}`) {
	await buildCss(process.argv[2] === "production");
}
