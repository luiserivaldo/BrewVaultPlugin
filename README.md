# BrewVault

BrewVault is a desktop Obsidian plugin for turning Markdown notes into
paginated, Homebrewery-style documents. Preview your work inside Obsidian and
export it directly as a PDF or self-contained HTML file.

## Features

- Live Homebrewery preview that follows the active Markdown note.
- Player's Handbook parchment, SRD / Unearthed Arcana, and Blank themes.
- Upstream-derived Homebrewery fonts, page measurements, headings, tables,
  notes, descriptive boxes, monster blocks, and page furniture.
- Standard Obsidian Markdown plus Homebrewery blocks, inline tags, page breaks,
  column breaks, and wide elements.
- Compact Homebrewery tag labels in the Markdown editor. Select a label to
  reveal and edit its original source.
- Numbered editor separators for explicit `\page` directives.
- Automatic pagination without changing the source Markdown file.
- Direct US Letter PDF export with backgrounds and fonts preserved.
- Self-contained HTML export that can be opened without BrewVault.
- Collision-safe output names: existing exports are preserved as `_1`, `_2`,
  and later numbered copies.
- Configurable vault-relative export folder, defaulting to
  `BrewVault-Exports`.
- Fully local and offline. No external browser, server, or Chromium installation
  is required.

## Installation

BrewVault is desktop-only and requires Obsidian `0.15.0` or newer.

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
| **Open Homebrewery Preview** | Opens or reveals a live preview of the active Markdown note. |
| **Export current file as HTML** | Creates a self-contained `.brew.html` file using the selected theme. |
| **Export current file as Homebrewery PDF** | Creates a PDF using the theme selected in BrewVault settings. |
| **Export current file as Homebrewery PDF in PHB style** | Creates a one-off PDF using the Player's Handbook parchment theme. |
| **Export current file as Homebrewery PDF in SRD style** | Creates a one-off PDF using the SRD / Unearthed Arcana theme. |
| **Export current file as Homebrewery PDF in Blank style** | Creates a one-off PDF using the plain Blank theme. |

Theme-specific PDF functions do not change the saved preview theme.

Exports are written directly to the configured folder without opening a print
or save dialog. For a note named `Alchemist.md`, BrewVault creates:

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

The rendered document displays `See Alchemist.` Unresolved `![[embeds]]` are
omitted from Homebrewery preview and exports instead of exposing vault paths.

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
