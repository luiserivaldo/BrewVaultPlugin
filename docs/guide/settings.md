[BrewVault guide](./README.md) › Settings

# Plugin settings

Open **Settings → BrewVault** to configure the plugin.

| Setting | Default | Effect |
| --- | --- | --- |
| Choose theme | Player's Handbook | Controls the live preview and normal HTML/PDF export appearance, unless a note sets [`bv_theme`](./properties.md). |
| Submit custom stylesheet | None | Validates and stores a selected local `.css` file as a selectable theme. |
| Default edition | 2024 | Edition used by the block picker and by insert commands that do not name one. See [Commands](./commands.md#inserting-blocks). |
| Edition-specific block commands | Off | Adds a command for each edition's variant of a block, such as **Insert PHB 2014: Spell**, so it can have its own hotkey. Takes effect immediately. See [Commands](./commands.md#inserting-blocks). |
| Mobile PDF export | Browser handoff | Mobile method used by the generic and theme-specific PDF commands: **Browser handoff** or **Direct PDF (image pages)**. Desktop always exports directly. See [Mobile support](./mobile.md#pdf-export). |
| Export folder | `BrewVault-Exports` | Sets the vault-relative output folder. BrewVault creates it automatically. |
| Page width (px) | `816px` | Controls rendered page width; the default represents 8.5 inches at 96 CSS dpi. |
| Page height (px) | `1056px` | Controls rendered page height; the default represents 11 inches at 96 CSS dpi. |
| Re-render debounce (ms) | `250ms` | Sets how long BrewVault waits after typing before refreshing the preview. |

Custom export paths remain unchanged. Installations using the former exact
default `BrewVault Exports` are automatically migrated to `BrewVault-Exports`.

## Custom CSS styles

Use **Submit custom stylesheet** to select a local `.css` file. Add this
metadata tag inside a CSS comment to control the name shown under
**Choose theme**:

```css
/* @brewvault-theme: Midnight Parchment */

.brewvault-theme-custom .brewPage {
	background: #171717;
	color: #f3ead3;
}
```

If the tag is absent, BrewVault assigns `Custom_Style_1`, then
`Custom_Style_2`, and so on. Submitted CSS must contain valid rules, may use
embedded `data:` resources, and cannot import stylesheets or load other resource
URLs. Every style selector must include `.brewvault-theme-custom` so that user
CSS cannot affect the surrounding Obsidian interface. Custom styles are stored
locally in the plugin settings. Removing the currently selected custom style
returns **Choose theme** to the default Player's Handbook theme.

## Theme per note

A note can override **Choose theme** with a `bv_theme` property. See
[Note properties](./properties.md#bv_theme-theme-for-one-note).
