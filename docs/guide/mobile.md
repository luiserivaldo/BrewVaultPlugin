[BrewVault guide](./README.md) › Mobile support

# Mobile support

**Note:** Current releases are tested on Android devices only. Behavior on iOS
may vary.

## Preview

Mobile preview scales each fixed-size page to the available screen space
without changing page count, columns, wrapping, tables, or explicit page
boundaries.

## PDF export

Obsidian mobile has no print API, so mobile PDF export offers two methods:

- **Browser handoff** (default) saves a self-contained `.brew.html` file, then
  opens it in a browser. Use **Share → Print → Save as PDF**.
- **Direct PDF (image pages)** draws every paginated page with Obsidian's own
  rendering engine, stores each page as an image, and writes the PDF straight
  to the export folder. No browser or other app is involved.

| | Browser handoff | Direct PDF (image pages) |
| --- | --- | --- |
| Steps after the command | Open in Browser → Share → Print → Save as PDF | None; the PDF is saved automatically |
| Leaves Obsidian | Yes, an installed browser does the printing | No |
| Text | Selectable, searchable, and copyable | Not selectable or searchable; each page is a picture |
| Links | Kept by most browsers | Not clickable |
| Sharpness | Vector text at any zoom | About 192 dpi; sharp in print, soft at high zoom |
| File size | Small | Larger; about 250–350 KB per parchment page, more on pages with large images |
| Speed | Depends on the browser | About a quarter of a second per page on a recent Android phone; a 48-page document took 18 s |
| Leftover files | A `.brew.html` file next to the PDF | The PDF only |
| Styling | The browser's print engine | Obsidian's renderer; matches the preview |

Choose **Direct PDF** to share or print a finished document quickly without
leaving Obsidian. Choose **Browser handoff** when readers need to search, copy,
or click links, or when file size matters.

## Choosing a method

**Settings → BrewVault → Mobile PDF export** sets the method used by
**Export current file as BrewVault PDF** and the theme-specific PDF commands.
Two mobile-only commands pick a method for one export, whatever the setting
says:

| Mobile command | Method | Theme |
| --- | --- | --- |
| **Export current file as BrewVault PDF** | Mobile PDF export setting | Selected theme |
| **Export current file as BrewVault PDF in PHB/DMG/SRD/Blank style** | Mobile PDF export setting | Named theme |
| **Export current file as BrewVault PDF via browser** | Browser handoff | Selected theme |
| **Export current file as BrewVault PDF directly (image pages)** | Direct PDF (image pages) | Selected theme |

The two method-specific commands do not appear on desktop, where every PDF
command exports directly.

## Browser handoff

BrewVault first saves a collision-safe `.brew.html` file in the configured
export folder. It then opens a dialog where **Open in Browser** asks Android to
open the saved file with its default application. In the browser, use
**Share → Print → Save as PDF**.

The HTML file remains available if the handoff is cancelled or fails.

## Direct PDF (image pages)

A notice shows page progress while BrewVault renders. The PDF is then written
to the export folder with the same naming as desktop exports; see
[Export file names](./commands.md#export-file-names). Keep Obsidian open in
the foreground until the export finishes: Android pauses background apps, and
the export resumes when you return.
