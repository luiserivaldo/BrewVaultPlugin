[BrewVault guide](./README.md) › Compiling notes

# Compiling notes

A note can pull other notes into its preview and PDF, so many notes export as
one long, paginated handout: a region's monsters, a spell list, a session
pack. The included notes are only read, never changed.

## The content block

Put a `{{bookContent}}` block in the note that should compile the others.
Inside it, list notes with `- [[links]]` and add whole folders with
`{{bv:include}}` lines:

```markdown
---
bv_page_size: letter
bv_footer: SRD HANDOUT
---
# SRD Handout

A short introduction, printed first.

{{bookContent
## Spells
- [[Confusion]]

\page

## Monsters
- [[Imp]]
{{bv:include folder="SRD/Monsters" exclude="Drafts" sort="name"}}
}}
```

Run **Insert book content block** to add an empty one.

The note is read top to bottom and all of it is printed: text, headings,
images, and `\page` breaks, both inside and outside the block. Each `- [[link]]`
or include line inside the block is replaced by the notes it names. The
`{{bookContent` and `}}` lines themselves print nothing.

- Notes follow on from each other, so short stat blocks pack together. Write
  `\page` between them, or inside a note, to start a new page.
- `[[links]]` outside the block, and links inside a sentence, stay ordinary
  links.
- A list item counts when it is only a link, optionally followed by
  `: description`. `![[embeds]]` keep showing images.

Open the preview on the note to see the compiled result. **Export current file
as BrewVault PDF** (or HTML) exports it as one file.

## Includes

`{{bv:include}}` adds every note that matches, sorted. Pick notes by folder,
by their properties, or both. Run **Insert folder include…** to pick a
folder.

```markdown
{{bv:include folder="SRD/Monsters"}}
{{bv:include where="catalogues: Llynwych, publish: true" unless="status: draft"}}
{{bv:include folder="Llynwych" where="publish" exclude="DM Notes"}}
```

| Setting | Effect |
| --- | --- |
| `folder` | The folder's path in the vault, for example `"SRD/Monsters"`. Without it, `where` searches the whole vault. An include needs a `folder`, a `where`, or both. |
| `where` | Property conditions, separated by commas. A note is added only if it meets all of them. |
| `unless` | Property conditions, separated by commas. A note that meets any of them is left out. |
| `exclude` | Comma-separated subfolders, note names, or paths to leave out, relative to the folder. |
| `recursive` | `"false"` leaves out subfolders. |
| `sort` | `"name"` (default) or `"path"`, with `-` in front to reverse. Numbers sort naturally: `Session 2` before `Session 10`. |

### Property conditions

`where` and `unless` read each note's properties (its frontmatter):

| Condition | A note meets it when |
| --- | --- |
| `catalogues: Llynwych` | `catalogues` is `Llynwych`, or is a list containing it. |
| `catalogues: Llynwych \| Everfrost` | `catalogues` has either value. |
| `publish` | `publish` is set, and isn't `false` or empty. |
| `tags: llynwych` | The note has the tag `llynwych` or a nested tag such as `llynwych/monster`. |

- Names and values ignore case. `=` works in place of `:`.
- `true`, `yes`, and `on` are the same, as are `false`, `no`, and `off`.
- A link value matches its note's name: `catalogues: Llynwych` matches
  `"[[Llynwych]]"` and `"[[Catalogues/Llynwych|Llynwych]]"`.
- Only properties count. `#tags` written in the note's text don't.

A note that is also linked with `- [[link]]` anywhere in the block appears
there instead, so you can pull one note forward and let the include add the
rest. A note is only ever included once.

To fix the order by hand, put the cursor on an include line and run **Expand
include into links**. It replaces the line with the `- [[link]]` list it
currently adds, ready to reorder.

## Properties

The compiling note's own `bv_*` properties apply to the whole document: one
theme, one page size, one footer, and page numbers that run on from the first
page. The same properties in included notes are ignored.

## Checking what is included

Run **Show included notes**, or click the caption above the preview, to see:

- the included notes in order, and whether each came from a link or an
  include line
- problems, such as a link that matches no note, an include that matches
  nothing, or a note included twice
- the included notes' properties that were ignored

The preview caption counts the included notes and flags problems.

## Contents page

Run **Generate table of contents** in the compiling note to list its headings
and the included notes' headings with page numbers. See
[Table of contents](./table-of-contents.md).
