# Social Presets and Export Workflow — Design

## Outcome

Extend Artboard Size Renamer into a social-media workflow tool that creates
standard social artboards and exports them with predictable file names. Standard
size presets update from a versioned JSON catalog hosted in GitHub; user-created
presets are local and are never overwritten.

## Users and core workflow

A designer starts with one campaign artboard, opens the extension, selects a
social preset set, and creates named artboards. They then choose which
artboards to export, select PNG, JPG, or WebP, and export assets using
platform-aware filenames.

## Scope

- Create artboards from a built-in social preset set:
  - Instagram Feed: 1080x1080 px
  - Instagram Portrait: 1080x1350 px
  - Instagram Story / Reel: 1080x1920 px
  - Facebook Post: 1200x630 px
  - YouTube Thumbnail: 1280x720 px
- Name generated boards as `<preset-slug>_<width>x<height> px`.
- Export selected or all artboards as PNG, JPG, or WebP.
- Use a filename rule `<artboard-name>.<extension>` after sanitizing invalid
  filename characters; do not prefix the Illustrator document filename.
- Warn before export when sanitized filenames would collide.
- Store custom presets and the cached catalog in the extension's user-data
  directory, separate from the installed extension.
- Bundle an offline catalog with the extension.
- Automatically check the GitHub catalog at most once per calendar day when
  the panel opens.
- Include a **Check Preset Updates** control for an immediate user-initiated
  check.
- Download catalog data through HTTPS only; do not upload artwork, document
  names, artboard data, or analytics.
- If offline, GitHub is unavailable, or the downloaded catalog is invalid,
  retain the last valid cached catalog without blocking creation or export.
- Show catalog version, source (bundled/cache), and last successful update
  date in the panel.

## GitHub catalog contract

The catalog URL is configurable in one location in the extension source. The
initial production URL is a GitHub raw-content HTTPS URL for
`social-presets.json`. The JSON document contains:

```json
{
  "schemaVersion": 1,
  "catalogVersion": "1.0.0",
  "updatedAt": "2026-07-17",
  "presets": [
    {
      "id": "instagram-feed",
      "label": "Instagram Feed",
      "width": 1080,
      "height": 1080
    }
  ]
}
```

Validation rejects a catalog unless the schema version is `1`, the catalog
version is a non-empty string, each preset ID is unique, and every width and
height is a positive whole number.

## Non-goals

- No responsive relayout or automatic scaling of artwork.
- No account sign-in, analytics, cloud storage, server-side code, or automatic
  publishing.
- No automatic network retry loop; checks happen only at panel open once per
  day or when the user presses the update control.
- No overwrite of existing exported files without a confirmation in a later
  release.

## Architecture

The CEP browser panel owns user interactions, catalog display, local
preferences, and HTTPS retrieval. ExtendScript owns Illustrator DOM work:
creating artboards, duplicating content only when explicitly selected in a
future feature, and exporting files. The panel sends only validated,
JSON-serialized commands to the host script and renders structured results.

## Error handling

- No open document: disable create/export actions and show the existing clear
  error.
- No valid presets: retain bundled or cached catalog and state why the remote
  update was ignored.
- Invalid export configuration: do not start export; identify the exact field.
- Filename collision: show the colliding filenames and require a user decision
  before export.
- Host export failure: report the affected artboard and preserve all other
  completed output.

## Verification

- Unit tests validate catalog parsing, duplicate rejection, positive integer
  dimensions, filename sanitization, and collision detection.
- Mocked host tests prove generated artboard rectangles/names and export
  command arguments.
- Panel tests cover manual update, daily update suppression, offline fallback,
  and update status rendering.
- Manual Illustrator test creates all five social boards, exports all formats,
  confirms file names, then verifies an offline session still uses the cached
  catalog.

