import { TFile, type App } from "obsidian";
import { compileBook } from "../book/compile";
import type { BookNoteFacts } from "../book/include";
import { hasBookContent, parseBookManifest } from "../book/manifest";
import { planBook, type BookPlan, type BookSegment } from "../book/plan";
import { renderBrewDocumentHtml, renderBrewMarkdown } from "../renderer";
import type { BrewPage } from "../renderer/types";
import { readNoteFrontmatter } from "./readNoteFrontmatter";
import { resolveVaultImageEmbeds } from "./resolveVaultImageEmbeds";

export interface NotePagesRequest {
	readonly file: TFile;
	/** Unsaved text to render instead of the saved note, such as a candidate edit. */
	readonly source?: string;
	readonly paginate: (pages: BrewPage[]) => Promise<BrewPage[]>;
}

export interface RenderedNotePages {
	readonly pages: BrewPage[];
	/** Files whose changes should re-render the preview: included notes and images. */
	readonly dependencyPaths: ReadonlySet<string>;
	/** Present when the note has a `{{bookContent}}` block. */
	readonly book: PlannedBook | null;
}

export interface PlannedBook {
	readonly plan: BookPlan;
}

/**
 * Renders a note into paginated pages. A note with a `{{bookContent}}` block
 * is compiled with the notes it includes; any other note renders on its own.
 * Source Markdown is only read, never changed.
 */
export async function renderNotePages(app: App, request: NotePagesRequest): Promise<RenderedNotePages> {
	const { file } = request;
	const source = request.source ?? (await app.vault.cachedRead(file));
	const dependencyPaths = new Set<string>();

	if (!hasBookContent(source)) {
		const images = await resolveVaultImageEmbeds(source, file, app.vault, app.metadataCache);
		images.dependencyPaths.forEach((path) => dependencyPaths.add(path));
		const pages = await request.paginate(
			renderBrewMarkdown(source, { imageEmbeds: images.imageEmbeds })
		);
		return { pages, dependencyPaths, book: null };
	}

	const book = planBookNote(app, file, source);
	const renderSegment = async (segment: BookSegment): Promise<string> => {
		if (segment.kind === "text") {
			return renderWithImages(app, segment.markdown, file, dependencyPaths, true);
		}
		const member = app.vault.getAbstractFileByPath(segment.note.path);
		if (!(member instanceof TFile)) return "";
		dependencyPaths.add(member.path);
		const memberSource = await app.vault.cachedRead(member);
		return renderWithImages(app, memberSource, member, dependencyPaths);
	};

	const pages = await compileBook(book.plan, { renderSegment, paginate: request.paginate });
	return { pages, dependencyPaths, book };
}

/** Plans a note's `{{bookContent}}`: the notes in order, and any problems. */
export function planBookNote(app: App, file: TFile, source: string): PlannedBook {
	let allNotes: BookNoteFacts[] | null = null;
	const plan = planBook(parseBookManifest(source), {
		bookPath: file.path,
		resolveLink: (linkpath) => {
			const target = app.metadataCache.getFirstLinkpathDest(linkpath, file.path);
			if (!(target instanceof TFile)) return null;
			return target.extension === "md" ? readNoteFacts(app, target) : "not-note";
		},
		allNotes: () => (allNotes ??= app.vault.getMarkdownFiles().map((note) => readNoteFacts(app, note))),
	});
	return { plan };
}

function readNoteFacts(app: App, file: TFile): BookNoteFacts {
	const frontmatter = readNoteFrontmatter(file, app.metadataCache);
	return {
		path: file.path,
		name: file.basename,
		frontmatter:
			typeof frontmatter === "object" && frontmatter !== null && !Array.isArray(frontmatter)
				? (frontmatter as Record<string, unknown>)
				: {},
	};
}

/**
 * Renders Markdown with image embeds resolved relative to `sourceFile`.
 * Text from the compiling note is a slice of it, so a leading newline keeps a
 * `---` rule at the start of a slice from being stripped as frontmatter.
 * Included notes are whole notes and keep normal frontmatter stripping.
 */
async function renderWithImages(
	app: App,
	markdown: string,
	sourceFile: TFile,
	dependencyPaths: Set<string>,
	isBookText = false
): Promise<string> {
	const source = isBookText ? `\n${markdown}` : markdown;
	const images = await resolveVaultImageEmbeds(source, sourceFile, app.vault, app.metadataCache);
	images.dependencyPaths.forEach((path) => dependencyPaths.add(path));
	return renderBrewDocumentHtml(source, { imageEmbeds: images.imageEmbeds });
}
