[BrewVault guide](./README.md) › Mobile support

# Mobile support

**Note:** Current releases are tested on Android devices only. Behavior on iOS
may vary.

## Preview

Mobile preview scales each fixed-size page to the available screen space
without changing page count, columns, wrapping, tables, or explicit page
boundaries.

## PDF export

On mobile, the styled PDF commands first save a collision-safe `.brew.html`
file in the configured export folder. BrewVault then opens a dialog where
**Open in Browser** asks Android to open the saved file with its default
application. In the browser, use **Share → Print → Save as PDF**.

The HTML file remains available if the handoff is cancelled or fails.
