# Third-party notices and acknowledgements

BrewVault PDF is distributed under its own MIT License. Third-party components
remain subject to their respective licenses; the project license does not
replace or narrow those terms.

## Homebrewery

Homebrewery is an open-source project by Scott Tolksdorf and the NaturalCrit
contributors. It provides the Markdown conventions, renderer behavior, and D&D
document themes that motivate BrewVault PDF's default output.

- Project: <https://github.com/naturalcrit/homebrewery>
- License: MIT
- Copyright: Copyright (c) 2016 Scott Tolksdorf
- Current source baseline for the planned port:
  `f88d6fd844863add0d0dde01bea2c6fb069c4bdd`

Before Homebrewery code or assets are bundled, copy its complete MIT notice into
the release attribution bundle and record the exact pinned revision here. Do
not present BrewVault PDF as an official NaturalCrit or Homebrewery product.

## Obsidian sample plugin

The initial TypeScript/esbuild/ESLint scaffold is adapted from the official
Obsidian sample plugin.

- Project: <https://github.com/obsidianmd/obsidian-sample-plugin>
- License: BSD Zero Clause License (0BSD)
- Copyright: Copyright (C) 2020-2026 by Dynalist Inc.

The 0BSD license permits use, modification, and distribution without requiring
its notice to be reproduced. This acknowledgement is retained voluntarily to
credit the source project.

Obsidian is a product of Dynalist Inc. BrewVault PDF is an independent community
project and is not affiliated with or endorsed by Obsidian.

## Dungeons & Dragons references

Dungeons & Dragons and related marks are property of Wizards of the Coast. This
project is an unofficial document-rendering tool and is not affiliated with or
endorsed by Wizards of the Coast.

## BrewVault lineage

The planned Markdown IR, Homebrewery serializer, pagination, verification, and
export-safety work originates in the earlier BrewVault standalone application.
When code is ported, preserve its Git provenance where practical and identify
material adaptations in milestone reports.

## npm dependencies

Development and future runtime dependencies are recorded in `package-lock.json`.
Every dependency keeps its own license. Before the first public release, CI must
generate and review a complete production dependency-license inventory and
include all notices required by bundled runtime dependencies.
