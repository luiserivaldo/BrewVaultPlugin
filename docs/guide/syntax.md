[BrewVault guide](./README.md) › Markdown syntax

# Markdown syntax

BrewVault supports normal Markdown headings, emphasis, links, blockquotes,
lists, and tables. It also recognizes Homebrewery-style syntax.

## Blocks

Open a block with `{{className` and close it with `}}`. Content inside a block
continues to use normal Markdown.

```markdown
{{note
##### Rules Note
This text is displayed as a Homebrewery note.
}}
```

Common semantic block classes include `note`, `descriptive`, `monster`, and
`classTable`.

In the editor, a matched block's opening line shows as a **BrewVault** label
with a chevron beside it. Click the chevron to collapse the block, hiding
everything inside it, nested blocks and headings included; click it again to
expand. Obsidian remembers collapsed blocks with the note's other folds, so
they stay collapsed when you reopen the note. Move the cursor onto the label
to edit the raw `{{className` line.

## Multiple classes and wide elements

Separate classes with commas or spaces. Add `wide` when a component should span
both columns.

```markdown
{{monster,wide,frame
## Elder Drake
*Huge dragon, neutral*

Monster statistics go here.
}}
```

## Inline tags

Use a class followed by its content inside a single pair of braces:

```markdown
The attack deals {{damage 2d6 piercing}} damage.
```

Inline tag content supports Markdown formatting. For example, an attribution
can italicize its source title:

```markdown
{{quote
The thief crept through the shadows, watching for danger.

{{attribution Unknown, *Darkness Rising*}}
}}
```

Start with a space to leave out the class: `{{ text}}` is a plain inline
span. Tables of contents use two of them per row, for the title and the page
number; see [Table of contents](./table-of-contents.md).

## Stat fields and vertical spacing

Use `::` between a stat label and its value. Each source line becomes a
separate rendered row and the delimiter itself is hidden:

```markdown
**Armor Class** :: 14 (chain mail, shield)
**Hit Points**  :: 136 (1d4 + 5)
**Speed**       :: 18 ft.
```

Place `:` on its own line to add one line of vertical space between template
sections. Use `::` on its own line for two lines of space.

## Page and column breaks

Place break directives on their own lines. Blank lines around them are
optional: a break directly under a paragraph, list, or quote still breaks.

```markdown
First page content.

\page

Second page, first column.

\column

Second page, second column.
```

An explicit `\page` appears in the Markdown editor as a numbered horizontal
separator such as **Page 2**. Select the separator to reveal the source
directive.

## Obsidian links

Obsidian wikilinks render as readable text without their brackets:

```markdown
See [[Classes/Alchemist|Alchemist]].
```

The rendered document displays `See Alchemist.`

Vault-local raster images use the same embed syntax as an Obsidian note:

```markdown
![[Images/imp.png]]
![[Images/imp.png|Infernal scout]]
![[Images/imp.png|320]]
![[Images/imp.png|320x180]]
![[Images/imp.png|392]]{width:200px}
```

BrewVault resolves these through Obsidian, embeds their image data in preview,
HTML, and PDF output, and leaves the Markdown source unchanged. PNG, JPEG, GIF,
WebP, AVIF, and BMP files are supported. A numeric alias sets width; `WIDTHxHEIGHT`
sets both dimensions. Unresolved or unsupported embeds are omitted instead of
exposing vault paths.

Homebrewery-style size attributes may follow a local or standard Markdown
image, with or without a separating space. Supported properties are `width`,
`height`, `min-width`, `min-height`, `max-width`, and `max-height`. When both an
Obsidian numeric size and a Homebrewery width are present, the Homebrewery
attribute takes visual precedence.
