import assert from "node:assert/strict";
import test from "node:test";
import { renderBrewDocumentHtml, renderBrewMarkdown } from "../src/renderer";
import { buildStandaloneHtml } from "../src/export/buildStandaloneHtml";
import {
	buildTocBlock,
	detectHeadings,
	findHeadingLine,
	findTocBlock,
	formatTocRows,
	parseTocRowLink,
	splitTocTarget,
	type TocHeading,
} from "../src/toc/tableOfContents";

const render = (markdown: string) => renderBrewDocumentHtml(markdown, { imageEmbeds: new Map() });

void test("headings are found per page, skipping the contents block and deeper levels", () => {
	const pages = renderBrewMarkdown(
		[
			"{{toc,wide",
			"# Table of Contents",
			"- ### [{{ Old row}}{{ 9}}](#p9)",
			"}}",
			"# Spells & *Charms*",
			"## Shield",
			"#### Too deep",
			"\\page",
			"{{monster,frame",
			"## Imp",
			"}}",
			"### Lair &lt;actions&gt;",
		].join("\n"),
		{ imageEmbeds: new Map() }
	);
	assert.deepEqual(detectHeadings(pages), [
		{ level: 1, text: "Spells & Charms", pageIndex: 1 },
		{ level: 2, text: "Shield", pageIndex: 1 },
		{ level: 2, text: "Imp", pageIndex: 2 },
		{ level: 3, text: "Lair <actions>", pageIndex: 2 },
	]);
	assert.deepEqual(detectHeadings([{ index: 1, html: render("# A\n## B") }], 1), [
		{ level: 1, text: "A", pageIndex: 1 },
	]);
});

void test("rows follow Homebrewery's layout and nest from the shallowest level", () => {
	const headings: TocHeading[] = [
		{ level: 2, text: "Spells [SRD]", pageIndex: 1 },
		{ level: 3, text: "Shield {x}", pageIndex: 2 },
		{ level: 2, text: "Monsters", pageIndex: 3 },
	];
	assert.deepEqual(formatTocRows(headings, 5), [
		"- ### [{{ Spells \\[SRD\\]}}{{ 5}}](#p1)",
		"  - #### [{{ Shield \\{x\\}}}{{ 6}}](#p2)",
		"- ### [{{ Monsters}}{{ 7}}](#p3)",
	]);
	// A skipped level still nests one step under the row above.
	assert.deepEqual(
		formatTocRows(
			[
				{ level: 1, text: "Book", pageIndex: 1 },
				{ level: 3, text: "Deep", pageIndex: 1 },
			],
			1
		),
		["- ### [{{ Book}}{{ 1}}](#p1)", "  - #### [{{ Deep}}{{ 1}}](#p1)"]
	);
	assert.deepEqual(formatTocRows([], 1), []);
});

void test("generated rows render as linked title and page-number spans", () => {
	const block = buildTocBlock(
		formatTocRows(
			[
				{ level: 1, text: "Spells [SRD]", pageIndex: 2 },
				{ level: 2, text: "Shield", pageIndex: 3 },
				{ level: 3, text: "Imp", pageIndex: 4 },
			],
			1
		)
	);
	assert.equal(
		block,
		[
			"{{toc,wide",
			"# Table of Contents",
			"",
			"- ### [{{ Spells \\[SRD\\]}}{{ 2}}](#p2)",
			"  - #### [{{ Shield}}{{ 3}}](#p3)",
			"    - [{{ Imp}}{{ 4}}](#p4)",
			"}}",
		].join("\n")
	);
	const html = render(block);
	assert.match(
		html,
		/<h3><a href="#p2"><span class="inline-block">Spells \[SRD\]<\/span><span class="inline-block">2<\/span><\/a><\/h3>/
	);
	assert.match(html, /<li><a href="#p4"><span class="inline-block">Imp<\/span>/);
	// Rendering the block again finds no headings in it.
	assert.deepEqual(detectHeadings([{ index: 1, html }]), []);
});

void test("an existing contents block is found with its opener and header kept", () => {
	const source = [
		"---",
		"bv_theme: phb",
		"---",
		"```",
		"{{toc",
		"```",
		"Intro",
		"{{toc",
		"# Contents",
		"*Everything, in order.*",
		"",
		"- ### [{{ Old}}{{ 1}}](#p1)",
		"{{note",
		"}}",
		"}}",
		"# Next",
	].join("\n");
	assert.deepEqual(findTocBlock(source), {
		startLine: 7,
		endLine: 14,
		opener: "{{toc",
		header: ["# Contents", "*Everything, in order.*"],
	});
	assert.equal(findTocBlock("{{toc\n# Open"), null);
	assert.equal(findTocBlock("{{note\n}}"), null);
	assert.equal(buildTocBlock(["- row"], "{{toc", []), "{{toc\n- row\n}}");
});

void test("inline spans without classes render, also inside link text", () => {
	assert.match(render("{{ Title}}"), /<span class="inline-block">Title<\/span>/);
	assert.match(render("[{{bonus +3}}](#p1)"), /<a href="#p1"><span class="bonus brew-bonus">\+3<\/span><\/a>/);
	assert.doesNotMatch(render("{{ }}"), /<span/);
});

void test("\\page and \\column break directly under a paragraph, list, or quote", () => {
	const pages = (markdown: string) =>
		renderBrewMarkdown(markdown, { imageEmbeds: new Map() }).map((page) => page.html.trim());
	assert.deepEqual(pages("A\n\\page\nB"), ["<p>A</p>", "<p>B</p>"]);
	assert.deepEqual(pages("- a\n\\page\n- b"), ["<ul>\n<li>a</li>\n</ul>", "<ul>\n<li>b</li>\n</ul>"]);
	assert.deepEqual(pages("> quote\n\\page\nB"), ["<blockquote>\n<p>quote</p>\n</blockquote>", "<p>B</p>"]);
	assert.match(render("A\n\\column\nB"), /<p>A<\/p>\n<div class="columnSplit"><\/div><p>B<\/p>/);
	// Inside a code fence it stays text.
	assert.equal(pages("```\nA\n\\page\n```").length, 1);
});

void test("rows name the note and heading they jump to, and the link can be read back", () => {
	const pages = renderBrewMarkdown("## Imp & \\\"Kin\\\"", { imageEmbeds: new Map(), headingSource: "SRD/Imp & Co.md" });
	const headings = detectHeadings(pages);
	assert.deepEqual(headings, [{ level: 2, text: 'Imp & "Kin"', pageIndex: 1, sourcePath: "SRD/Imp & Co.md" }]);

	const [row] = formatTocRows(headings, 1, (heading) => `SRD/Imp & Co#${heading.text}`);
	assert.equal(row, '- ### [{{ Imp & "Kin"}}{{ 1}}](#p1 "SRD/Imp & Co#Imp & \\"Kin\\"")');
	assert.deepEqual(parseTocRowLink(row), { pageIndex: 1, target: 'SRD/Imp & Co#Imp & "Kin"' });
	assert.deepEqual(parseTocRowLink("- ### [{{ Old}}{{ 2}}](#p2)"), { pageIndex: 2, target: null });
	assert.equal(parseTocRowLink("- [[Imp]]"), null);
	// The title renders as a tooltip, so the row still works in Homebrewery.
	assert.match(render(row), /<a href="#p1" title="SRD\/Imp &amp; Co#Imp &amp; &quot;Kin&quot;">/);

	assert.deepEqual(splitTocTarget("SRD/Imp#Lair #2"), { linkpath: "SRD/Imp", heading: "Lair #2" });
	assert.deepEqual(splitTocTarget("Imp"), { linkpath: "Imp", heading: "" });
});

void test("a row finds its heading line ignoring Markdown marks", () => {
	const headings = [
		{ heading: "Intro", line: 0 },
		{ heading: "Spells & *Charms*", line: 4 },
		{ heading: "See [[Imp|the imp]]", line: 9 },
	];
	assert.equal(findHeadingLine(headings, "Spells & Charms"), 4);
	assert.equal(findHeadingLine(headings, "see the IMP"), 9);
	assert.equal(findHeadingLine(headings, "Missing"), null);
});

void test("exports keep vault paths out of the page HTML", () => {
	const pages = renderBrewMarkdown("# Title", { imageEmbeds: new Map(), headingSource: "Secret/Note.md" });
	assert.match(pages[0].html, /data-brewvault-source="Secret\/Note.md"/);
	const html = buildStandaloneHtml(pages, "phb", "", "Doc", 816, 1056);
	assert.doesNotMatch(html, /Secret\/Note/);
	assert.match(html, /<h1>Title<\/h1>/);
});
