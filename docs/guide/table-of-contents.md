[BrewVault guide](./README.md) › Table of contents

# Table of contents

Run **Generate table of contents** in a note to write a contents list with
page numbers, in the same `{{toc` markup Homebrewery uses:

```markdown
{{toc,wide
# Table of Contents

- ### [{{ Spells}}{{ 2}}](#p2 "Test Book#Spells")
  - #### [{{ Shield}}{{ 3}}](#p3 "SRD/Spells list#Shield")
    - [{{ Lair actions}}{{ 4}}](#p4 "SRD/Imp#Lair actions")
}}
```

- **Where:** if the note has no `{{toc` block, it is inserted at the cursor.
  If it has one, its list is replaced, and the opener (for example
  `{{toc,wide`) and any lines above the list, such as the heading, are kept.
- **What it lists:** every `#`, `##`, and `###` heading, on the page where it
  appears in the PDF, including headings from notes compiled into the note
  (see [Compiling notes](./books.md)). Headings inside stat blocks count, so
  a monster's name is listed. Headings inside the contents block itself are
  not.
- **Levels:** the shallowest heading level found becomes the top row. A
  heading never nests more than one step below the row above it, so notes that
  skip from `#` to `###` still make a tidy list.
- **Page numbers** follow `bv_page_start` and the note's page size and theme.
  The command lays the note out again after writing the list, since a long
  contents can push later headings onto new pages.

The result is ordinary Markdown. Delete rows, re-indent them, or rename them
freely. Run the command again after editing the note to refresh the page
numbers; this rewrites the list, so hand edits to the rows are replaced.

`wide` spans the page and lists the rows in two columns; remove it for a
one-column list.

## Jumping to a section

Each row links to its page as `#p<page>`, and its title (the quoted part)
names the note and heading it came from. Clicking a row opens that heading in
the editor, switching notes if the heading is in a compiled note, like
following a wikilink:

- **Editor:** click a row in Live Preview, or Ctrl/Cmd-click in source mode.
  Ctrl/Cmd-click in Live Preview opens a new tab.
- **Reading view:** click a row.
- **BrewVault preview:** click a row to scroll the preview to its page and open
  the heading in the editor showing the note. Ctrl/Cmd-click opens a new tab.

In exported HTML and PDF files, rows link to their page. The title is only a
tooltip there, and in Homebrewery. Rows written before this feature, or
without a title, only scroll the preview to their page; run the command again
to add titles.
