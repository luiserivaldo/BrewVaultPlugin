[BrewVault guide](./README.md) › Table of contents

# Table of contents

Run **Generate table of contents** in a note to write a contents list with
page numbers, in the same `{{toc` markup Homebrewery uses:

```markdown
{{toc,wide
# Table of Contents

- ### [{{ Spells}}{{ 2}}](#p2)
  - #### [{{ Shield}}{{ 3}}](#p3)
    - [{{ Lair actions}}{{ 4}}](#p4)
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

Each row links to its page: clicking it in the preview scrolls there, and it
works as a link in exported HTML and PDF files. `wide` spans the page and lists
the rows in two columns; remove it for a one-column list.
