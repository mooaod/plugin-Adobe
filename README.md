# Social Artboard Presets

A CEP panel for Adobe Illustrator that creates standard social-media artboards
and exports selected artboards.

## Create and export

1. Select one or more presets, then choose **Create Selected Presets**. New
   artboards are placed after the existing artboards and named from the preset.
2. Select the artboards to export, choose a destination folder and an available
   format, then choose **Export Selected**. The panel checks every output first.
   If files already exist, it lists all conflicts and exports nothing until you
   explicitly confirm overwriting them.

PNG and JPG remain available in Illustrator 19. WebP requires a compatible
Illustrator version and appears in the format menu only when the running host
provides WebP export support.

Exports are blocked when two selected artboards would create the same sanitized
filename, including names that differ only by letter case. Rename or deselect
one of the artboards before exporting.

Use **Add custom preset** to save a preset with a unique ID, label, width, and
height. Custom presets are stored separately on your computer and merged with
bundled or downloaded presets by ID, so catalog updates cannot delete them.

## Preset updates and privacy

The panel starts with its bundled catalog, prefers a valid cached catalog when
one exists, and automatically checks for updates at most once per calendar day.
Use **Check Preset Updates** to check immediately at any time. If an update
cannot be reached or is invalid, the valid cached or bundled presets remain
available offline.

For preset updates, the panel fetches only the public JSON catalog at
`https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json`.
It does not upload documents, artboards, filenames, export destinations, or
other private project data.

`CSInterface.js` is an unmodified copy of Adobe CEP Resources
`CSInterface.js` (v7.0.0, copyright Adobe Systems Incorporated, 2013). Its
included license notice governs use, modification, and distribution.

## Verify in Illustrator

Copy this extension directory to
`~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer`, enable
CEP debug mode, and restart Illustrator. Open **Window → Extensions → Artboard
Size Renamer** and verify square, landscape, portrait, existing-name
replacement, and no-document cases.

## License, trademarks, and no affiliation

Original Moo_Ai code and assets are proprietary and licensed under
[`LICENSE`](LICENSE). Adobe `client/CSInterface.js` is governed separately as
described in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Artboard Size Renamer is an independent Moo_Ai product and is not affiliated
with, sponsored by, or endorsed by Adobe, Meta, or Google. Adobe and Adobe
Illustrator are trademarks or registered trademarks of Adobe in the United
States and/or other countries. Instagram and Facebook are trademarks of Meta
Platforms, Inc. YouTube and Google are trademarks of Google LLC. Product names
are used only to describe compatibility and preset destinations. All trademarks
are the property of their respective owners.

## Signed ZXP installation

The signed release is `ArtboardSizeRenamer-v1.0.0-signed.zxp`. Install it with a
ZXP-capable Adobe extension installer, fully quit Illustrator, then reopen
Illustrator and choose **Window → Extensions → Artboard Size Renamer**. Verify
the downloaded file against the accompanying `.sha256` file before
installation.

This direct-distribution build uses a self-signed certificate from `Moo_Ai`;
it is not an Adobe Marketplace listing.

The Adobe signing tool accepts the certificate password only as a command-line
argument. Run the signing workflow only in a trusted local user session: the
password is briefly visible to same-user process inspection, but is never
logged or written to disk.
