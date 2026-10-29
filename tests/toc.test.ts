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
	nestIncludedHeadings,
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
		{ level: 3, text: "Imp", pageIndex: 2 },
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

void test("a block lists only its title: a monster's name, not its sections", () => {
	const html = render(
		[
			"# Bestiary",
			"{{monster,frame",
			"## Cave Lurker",
			"### Traits",
			"{{note",
			"## Inside a nested note",
			"}}",
			"### Actions",
			"}}",
			"{{monster",
			"## Imp",
			"### Actions",
			"}}",
			// A note's ##### title is too deep to list, and it still uses up the
			// block's one heading, so a later ## inside it is skipped.
			"{{note",
			"##### Rules Note",
			"## Not a section",
			"}}",
			"## Lairs",
			"### Cave lair",
		].join("\n")
	);
	assert.deepEqual(
		detectHeadings([{ index: 1, html }]).map((heading) => `${heading.level} ${heading.text}`),
		["1 Bestiary", "2 Cave Lurker", "2 Imp", "2 Lairs", "3 Cave lair"]
	);
});

void test("a block's title nests under the section heading above it", () => {
	const html = render(
		["# Book", "## Monsters", "{{monster", "## Imp", "### Actions", "}}", "## Places", "### Cove", "{{monster", "## Crab", "}}"].join("\n")
	);
	const headings = detectHeadings([{ index: 1, html }]);
	assert.deepEqual(
		headings.map((heading) => `${heading.level} ${heading.text}`),
		["1 Book", "2 Monsters", "3 Imp", "2 Places", "3 Cove", "4 Crab"]
	);
	// Rows never nest deeper than three levels, so Crab sits beside Cove.
	assert.deepEqual(
		formatTocRows(headings, 1).map((row) => row.replace(/\]\(.*$/, "")),
		[
			"- ### [{{ Book}}{{ 1}}",
			"  - #### [{{ Monsters}}{{ 1}}",
			"    - [{{ Imp}}{{ 1}}",
			"  - #### [{{ Places}}{{ 1}}",
			"    - [{{ Cove}}{{ 1}}",
			"    - [{{ Crab}}{{ 1}}",
		]
	);
});

void test("an included note's headings nest under the section it is included in", () => {
	const heading = (level: number, text: string, sourcePath?: string): TocHeading => ({
		level,
		text,
		pageIndex: 1,
		...(sourcePath ? { sourcePath } : {}),
	});
	const nested = nestIncludedHeadings(
		[
			heading(1, "Book", "Book.md"),
			heading(2, "Everything else", "Book.md"),
			heading(2, "Druid Spell List", "Druid.md"),
			heading(3, "Cantrips", "Druid.md"),
			heading(1, "Fighter", "Fighter.md"),
			heading(2, "Spells", "Book.md"),
			heading(3, "Shield", "Spells.md"),
			heading(1, "Loose note", "Loose.md"),
		],
		"Book.md"
	);
	assert.deepEqual(
		nested.map((item) => `${item.level} ${item.text}`),
		[
			"1 Book",
			"2 Everything else",
			"3 Druid Spell List",
			"4 Cantrips",
			// A different note is its own run, shifted on its own.
			"3 Fighter",
			"2 Spells",
			// Already deep enough: never moved up.
			"3 Shield",
			"3 Loose note",
		]
	);
	// A note without included notes is unchanged.
	const plain = [heading(2, "A", "Book.md"), heading(2, "B")];
	assert.deepEqual(nestIncludedHeadings(plain, "Book.md"), plain);
});
