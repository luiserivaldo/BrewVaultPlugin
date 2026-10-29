import assert from "node:assert/strict";
import test from "node:test";
import { compileBook } from "../src/book/compile";
import { parseIncludeQuery, resolveInclude, type BookNoteFacts } from "../src/book/include";
import { hasBookContent, parseBookManifest, parseIncludeLine } from "../src/book/manifest";
import { planBook, type BookSegment } from "../src/book/plan";
import { BOOK_CONTENT_BLOCK, expandIncludeMarkdown, includeLine } from "../src/book/skeleton";
import { formatHomebreweryTagLabel } from "../src/editor/homebreweryTagSyntax";
import { PAGE_BREAK_SENTINEL } from "../src/renderer/markdownEngine";
import { formatSnippetForCursor } from "../src/snippets/insertion";

function note(path: string, frontmatter: Record<string, unknown> = {}): BookNoteFacts {
	const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
	return { path, name, frontmatter };
}

const VAULT: BookNoteFacts[] = [
	note("Llynwych/Llynwych Handout.md"),
	note("Llynwych/Titans/Humbaba.md", { bv_theme: "dmg" }),
	note("Llynwych/Titans/The Moving Mound.md"),
	note("Llynwych/Locations/Session 10 Cove.md"),
	note("Llynwych/Locations/Session 2 Marsh.md"),
	note("Llynwych/Locations/Islands/Lone Island.md"),
	note("Llynwych/DM Notes/Prep.md"),
	note("Species/Shark-Kin.md", { bv_footer: "SHARKS" }),
	note("Species/Snow Elf.md"),
];

function sources(bookPath = "Llynwych/Llynwych Handout.md") {
	return {
		bookPath,
		resolveLink: (linkpath: string) =>
			linkpath.endsWith(".png")
				? ("not-note" as const)
				: VAULT.find(
						(candidate) =>
							candidate.name.toLowerCase() === linkpath.toLowerCase() || candidate.path === linkpath
					) ?? null,
		allNotes: () => VAULT,
	};
}

function memberNames(segments: readonly BookSegment[]): string[] {
	return segments.flatMap((segment) => (segment.kind === "member" ? [segment.note.name] : []));
}

function plan(markdown: string, bookPath?: string) {
	return planBook(parseBookManifest(markdown), sources(bookPath));
}

function warnings(markdown: string): string[] {
	return plan(markdown)
		.diagnostics.filter((diagnostic) => diagnostic.severity === "warning")
		.map((diagnostic) => diagnostic.message);
}

void test("a note compiles others only when it has a {{bookContent}} block", () => {
	assert.equal(hasBookContent("# Notes\n- [[Shark-Kin]]"), false);
	assert.equal(hasBookContent("---\nbv_theme: phb\n---\n{{bookContent\n- [[Shark-Kin]]\n}}"), true);
	assert.equal(hasBookContent("```\n{{bookContent\n```"), false);
	assert.equal(hasBookContent("{{book-content\n}}"), true);
});

void test("the manifest finds links and includes only inside the content block", () => {
	const items = parseBookManifest(
		[
			"---",
			"bv_page_size: letter",
			"---",
			"# Llynwych",
			"- [[Outside the block]]",
			"{{bookContent",
			"Intro with [[Inline link]] stays text.",
			"- [[Shark-Kin]]: Fierce sharkfolk",
			"- [[Snow Elf|Elves]]",
			"1. [[Humbaba#Lair]]",
			"- ![[map.png]]",
			"{{note",
			"- [[In a nested block]]",
			"}}",
			'{{bv:include folder="Llynwych/Titans" sort="name"}}',
			"```",
			"- [[Not a member]]",
			"```",
			"}}",
			"- [[After the block]]",
		].join("\n")
	);
	assert.deepEqual(
		items.map((item) => item.kind),
		["text", "text", "member", "member", "member", "text", "member", "text", "include", "text", "text"]
	);
	assert.deepEqual(
		items.flatMap((item) => (item.kind === "member" ? [[item.linkpath, item.line]] : [])),
		[["Shark-Kin", 8], ["Snow Elf", 9], ["Humbaba", 10], ["In a nested block", 13]]
	);
	// The block's own opener and closer are not rendered, so no wrapper box
	// keeps pagination from splitting the compiled notes.
	const text = items.flatMap((item) => (item.kind === "text" ? [item.markdown] : [])).join("\n");
	assert.doesNotMatch(text, /bookContent/);
	assert.match(text, /Outside the block/);
	assert.match(text, /Not a member/);
	assert.match(text, /After the block/);

	assert.deepEqual(
		parseBookManifest("{{bookContent\n- [[Shark-Kin]]").map((item) => item.kind),
		["member", "problem"]
	);
	assert.deepEqual(parseIncludeLine('{{bv:include folder="A" exclude="B"}}'), [
		{ name: "folder", value: "A" },
		{ name: "exclude", value: "B" },
	]);
	assert.equal(parseIncludeLine("- [[Shark-Kin]]"), null);
});

void test("folder includes recurse, exclude subfolders or notes, and sort naturally", () => {
	const query = (attributes: Record<string, string>) => {
		const parsed = parseIncludeQuery(Object.entries(attributes).map(([name, value]) => ({ name, value })));
		assert.ok(parsed.query);
		return parsed.query;
	};
	const names = (notes: BookNoteFacts[]) => notes.map((facts) => facts.name);

	assert.deepEqual(names(resolveInclude(VAULT, query({ folder: "Llynwych/Locations" }))), [
		"Lone Island",
		"Session 2 Marsh",
		"Session 10 Cove",
	]);
	assert.deepEqual(
		names(resolveInclude(VAULT, query({ folder: "Llynwych/Locations/", recursive: "false", sort: "-name" }))),
		["Session 10 Cove", "Session 2 Marsh"]
	);
	assert.deepEqual(
		names(resolveInclude(VAULT, query({ folder: "Llynwych", exclude: "DM Notes, Titans, Humbaba", sort: "path" }))),
		["Llynwych Handout", "Lone Island", "Session 2 Marsh", "Session 10 Cove"]
	);

	assert.deepEqual(parseIncludeQuery([{ name: "tag", value: "x" }]), {
		query: null,
		problems: [
			'Unknown include setting "tag". Use folder, exclude, sort, or recursive.',
			'An include needs a folder, for example {{bv:include folder="SRD"}}.',
		],
	});
	assert.deepEqual(parseIncludeQuery([{ name: "folder", value: "A" }, { name: "sort", value: "date" }]).problems, [
		'Unknown sort "date". Use name or path, with - in front to reverse.',
	]);
});

void test("the plan keeps written order, links win over includes, and problems are explained", () => {
	const result = plan(
		[
			"# Handout",
			"{{bookContent",
			"- [[Snow Elf]]",
			'{{bv:include folder="Species"}}',
			'{{bv:include folder="Llynwych/Titans"}}',
			"- [[Humbaba]]",
			"}}",
		].join("\n")
	);
	// Humbaba is linked later, so the include leaves it for the link.
	assert.deepEqual(memberNames(result.segments), ["Snow Elf", "Shark-Kin", "The Moving Mound", "Humbaba"]);
	assert.equal(result.memberCount, 4);
	assert.deepEqual(
		result.segments.flatMap((segment) => (segment.kind === "member" ? [segment.includeLine] : [])),
		[null, 4, 5, null]
	);
	assert.deepEqual(
		result.diagnostics.filter((diagnostic) => diagnostic.severity === "info").map((diagnostic) => diagnostic.message),
		["Shark-Kin: bv_footer ignored; this note's settings apply.", "Humbaba: bv_theme ignored; this note's settings apply."]
	);

	assert.deepEqual(
		warnings(
			[
				"{{bookContent",
				"- [[Missing]]",
				"- [[map.png]]",
				"- [[Llynwych Handout]]",
				"- [[Snow Elf]]",
				"- [[Snow Elf]]",
				'{{bv:include folder="Nowhere"}}',
				"}}",
			].join("\n")
		),
		[
			"Line 2: [[Missing]] does not match any note.",
			"Line 3: [[map.png]] is not a note. Use ![[map.png]] to show it as an image.",
			"Line 4: the note links to itself; skipped.",
			"Line 6: Snow Elf is already included; this copy is skipped.",
			'Line 7: {{bv:include folder="Nowhere"}} matched no notes.',
		]
	);
	assert.deepEqual(warnings("{{bookContent\n}}"), [
		"No notes are included yet. Add - [[Note]] or {{bv:include …}} lines inside the {{bookContent}} block.",
	]);
});

void test("compiling renders each segment in order and paginates once", async () => {
	const compiled = plan("# Handout\n{{bookContent\n- [[Snow Elf]]\n\\page\n- [[Shark-Kin]]\n}}\nThe end.");
	const rendered: string[] = [];
	let paginateCalls = 0;
	const pages = await compileBook(compiled, {
		renderSegment: (segment) => {
			const html =
				segment.kind === "member"
					? `<p>${segment.note.name}</p>`
					: segment.markdown.includes("\\page")
						? PAGE_BREAK_SENTINEL
						: `<p>${segment.markdown.trim()}</p>`;
			rendered.push(html);
			return Promise.resolve(html);
		},
		paginate: (input) => {
			paginateCalls++;
			return Promise.resolve(input);
		},
	});
	assert.equal(paginateCalls, 1);
	assert.equal(rendered.length, 5);
	assert.equal(pages.length, 2);
	assert.match(pages[0].html, /# Handout[\s\S]*Snow Elf/);
	assert.match(pages[1].html, /Shark-Kin[\s\S]*The end\./);
});

void test("commands write editable Markdown on its own line", () => {
	assert.equal(BOOK_CONTENT_BLOCK, "{{bookContent\n- [[Note name]]\n}}\n");
	assert.equal(includeLine('My "odd" folder'), `{{bv:include folder="My 'odd' folder" sort="name"}}`);
	assert.equal(expandIncludeMarkdown(["A", "Locations/Islands/Twin"]), "- [[A]]\n- [[Locations/Islands/Twin]]");

	assert.equal(formatSnippetForCursor(BOOK_CONTENT_BLOCK, "", ""), "{{bookContent\n- [[Note name]]\n}}");
	assert.equal(formatSnippetForCursor(BOOK_CONTENT_BLOCK, "Intro", ""), "\n{{bookContent\n- [[Note name]]\n}}");
	assert.equal(formatSnippetForCursor(BOOK_CONTENT_BLOCK, "", "rest"), BOOK_CONTENT_BLOCK);
	assert.equal(formatHomebreweryTagLabel("bookContent"), "Book Content");
});
