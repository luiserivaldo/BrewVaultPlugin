# BrewVault

BrewVault is an Obsidian plugin for turning Markdown notes
into themed, DnD 5e-style documents. Preview your work inside Obsidian,
export directly to PDF using pre-configured themes, or export as HTML and use custom CSS styles.


## Features

- Live render preview that follows the active Markdown note as a source.
- Player's Handbook, and SRD / Unearthed Arcana themes pre-configured.
- Inspired from Homebrewery fonts, page measurements, headings, tables,
  notes, descriptive boxes, monster blocks, and page furniture.
- Standard Obsidian Markdown plus Homebrewery-style blocks, inline tags, page breaks,
  column breaks, and wide elements.
- Compact Homebrewery tag labels in the Markdown editor for seamless workflow transtition. 
- Automatic pagination without changing the source Markdown file.
- Direct PDF export with backgrounds and fonts preserved.
- Self-contained HTML export that can be opened without Obsidian / BrewVault.
- Configurable vault-relative export folder; defaults to the root folder at `BrewVault-Exports`.
- Fully local and offline. Desktop requires no external browser, server, or
  Chromium installation; mobile delegates only the final print/export step to an
  installed browser.

## Mobile support

Mobile preview scales each fixed-size page to the available resolution space without
changing page count, columns, wrapping, tables, or explicit page boundaries.
Mobile PDF commands save a self-contained `.brew.html` file first, then open it
through a browser that has a **Print → Save as PDF** function. The HTML file
remains available if the handoff is cancelled or fails.

NOTE: Current releases are tested on Android devices only. Experience in iOS platforms may vary.

## Installation

BrewVault 0.3.0 supports desktop and mobile Obsidian `1.7.2` or newer.

1. Download or obtain `manifest.json`, `main.js`, and `styles.css` from the
   BrewVault release package.
2. Create this folder inside your vault:

   ```text
   <vault>/.obsidian/plugins/BrewVaultPlugin/
   ```

3. Copy the three files into that folder.
4. Restart Obsidian, or reload the app without saving.
5. Open **Settings → Community plugins** and enable **BrewVault**.

## Functions

Open the Command Palette with `Ctrl/Cmd + P` to run these functions. The preview
can also be opened using BrewVault's scroll icon in the ribbon.

| Function | Effect |
| --- | --- |
| **Open Homebrewery preview** | Opens or reveals a live preview of the active Markdown note. |
| **Export current file as HTML** | Creates a self-contained `.brew.html` file using the selected theme. |
| **Export current file as Homebrewery PDF** | Creates a direct PDF on desktop or starts the browser-assisted mobile workflow using the selected theme. |
| **Export current file as Homebrewery PDF in PHB style** | Uses the Player's Handbook parchment theme for direct desktop PDF or mobile browser handoff. |
| **Export current file as Homebrewery PDF in SRD style** | Uses the SRD / Unearthed Arcana theme for direct desktop PDF or mobile browser handoff. |
| **Export current file as Homebrewery PDF in Blank style** | Uses the plain Blank theme for direct desktop PDF or mobile browser handoff. |

Theme-specific PDF functions do not change the saved preview theme.

On mobile, PDF commands first save a collision-safe
`.brew.html` artifact in the configured export folder. BrewVault then opens a
dialog where **Open in Browser** asks Android to open the saved file with its
default application. In the browser, use **Print → Save as PDF**. The HTML
artifact remains in the vault if Android cannot open it. Android controls the
available-app chooser and may include HTML viewers or system handlers alongside
browsers; BrewVault cannot filter that system list.

Desktop exports are written directly to the configured folder without opening
a print or save dialog. For a note named `Alchemist.md`, BrewVault creates:

```text
BrewVault-Exports/Alchemist.pdf
```

If that file already exists, the next exports are named:

```text
BrewVault-Exports/Alchemist_1.pdf
BrewVault-Exports/Alchemist_2.pdf
```

HTML exports use the same policy with names such as `Alchemist.brew.html` and
`Alchemist_1.brew.html`.

## Custom Markdown syntax

BrewVault supports normal Markdown headings, emphasis, links, blockquotes,
lists, and tables. It also recognizes Homebrewery-style syntax.

### Blocks

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

### Multiple classes and wide elements

Separate classes with commas or spaces. Add `wide` when a component should span
both columns.

```markdown
{{monster,wide,frame
## Elder Drake
*Huge dragon, neutral*

Monster statistics go here.
}}
```

### Inline tags

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

### Stat fields and vertical spacing

Use `::` between a stat label and its value. Each source line becomes a
separate rendered row and the delimiter itself is hidden:

```markdown
**Armor Class** :: 14 (chain mail, shield)
**Hit Points**  :: 136 (1d4 + 5)
**Speed**       :: 18 ft.
```

Place `:` on its own line to add one line of vertical space between template
sections. Use `::` on its own line for two lines of space.

### Page and column breaks

Place break directives on their own lines:

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

### Obsidian links

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

## Plugin settings

Open **Settings → BrewVault** to configure the plugin.

| Setting | Default | Effect |
| --- | --- | --- |
| Theme | Player's Handbook (parchment) | Controls the live preview and normal HTML/PDF export appearance. |
| Export folder | `BrewVault-Exports` | Sets the vault-relative output folder. BrewVault creates it automatically. |
| Page width | `816px` | Controls rendered page width; the default represents 8.5 inches at 96 CSS dpi. |
| Page height | `1056px` | Controls rendered page height; the default represents 11 inches at 96 CSS dpi. |
| Re-render debounce | `250ms` | Sets how long BrewVault waits after typing before refreshing the preview. |

Custom export paths remain unchanged. Installations using the former exact
default `BrewVault Exports` are automatically migrated to `BrewVault-Exports`.

## Accreditation and licensing

BrewVault is inspired by and adapts theme resources from the open-source
[Homebrewery](https://github.com/naturalcrit/homebrewery) project by Scott
Tolksdorf and the NaturalCrit contributors. Homebrewery is distributed under
the MIT License. Vendored theme, font, and decorative-asset notices are kept
with their respective resources.

The project scaffold is adapted from the official, 0BSD-licensed
[Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin).
Third-party packages and assets remain subject to their own licenses.

BrewVault is an independent community project and is not affiliated with or
endorsed by NaturalCrit, Obsidian, or Wizards of the Coast. Dungeons & Dragons
and related marks are property of Wizards of the Coast.

BrewVault itself is released under the [MIT License](./LICENSE).
