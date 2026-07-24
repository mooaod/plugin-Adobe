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

## Preflight before delivery

Before exporting a social-media delivery set, select the required presets and
choose **Run Preflight**. Each requirement receives one of four results:
**Pass** means that there is exactly one same-size artboard with the canonical
name; **Rename** means that one same-size artboard can be renamed to the
canonical name; **Missing** means that no same-size artboard exists; and
**Duplicate** means that more than one same-size artboard exists. Multiple
same-size artboards are Duplicate even when one has the canonical name.

Use this safe sequence, performing the mutation steps only when their result
is present: **Run Preflight → Create Missing → Run Preflight → Rename Fixable →
Run Preflight → Export Verified Set**. Each mutation clears the previous report,
so always rerun Preflight before taking the next action. Duplicate requires
manual resolution: remove or resize the extra artboard, then rerun Preflight.
**Export Verified Set** remains disabled while Missing or Duplicate exists.
After the final Preflight confirms the set is ready, choose the export
destination and format, then use **Export Verified Set** to export only the
passing required artboards. Existing filename-collision and overwrite
confirmation safeguards still apply.

### Manual Illustrator verification

1. Open a document with one correctly named Instagram Feed artboard, one
   differently named Instagram Portrait artboard, and no Story artboard.
2. Select those three requirements and run Preflight. Confirm that Pass,
   Rename, and Missing appear respectively.
3. Select Create Missing, then run Preflight again. Confirm that Story becomes
   Pass.
4. Select Rename Fixable, then run Preflight again. Confirm that Portrait
   becomes Pass and its name is canonical.
5. Add a second 1080 × 1080 artboard, run Preflight again, and confirm that
   Duplicate appears and Export Verified Set is disabled.
6. Remove or resize the duplicate, rerun Preflight, choose an export
   destination and format, then confirm that Export Verified Set exports only
   the passing required artboards. Confirm that PNG, JPG, and (when offered by
   the running Illustrator version) WebP capabilities match the panel state.

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

The signed release is `ArtboardSizeRenamer-v1.1.0-signed.zxp`. Install it with a
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
