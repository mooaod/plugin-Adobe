# Artboard Size Renamer — Design

## Outcome

Create an Adobe Illustrator CEP extension panel that renames every artboard in the
active document from its physical size. The standard name format is
`<width>x<height> px`, such as `1080x1080 px`.

## Scope

- One CEP panel titled **Artboard Size Renamer**.
- A **Rename All Artboards** button.
- For each artboard, calculate width and height from its artboard rectangle.
- Round dimensions to whole pixels and overwrite the current artboard name.
- Show a completion or error message in the panel.

## Non-goals

- No presets, unit selector, partial rename, undo-history UI, file export, or
  cloud services in the first release.
- The plugin will not rename anything until the user presses the button.

## Architecture

- `CSXS/manifest.xml` declares an Illustrator CEP panel and loads its host script.
- A small HTML/CSS panel supplies the button and status region.
- Browser JavaScript calls ExtendScript through Adobe's `CSInterface.evalScript`.
- The ExtendScript controller validates that a document is open, loops through
  all artboards, measures each rectangle, creates the name, and updates it.

## Data flow and errors

1. User opens the panel and presses **Rename All Artboards**.
2. The plugin checks for an active document.
3. It renames every artboard in that document.
4. The panel reports the number renamed, or a clear error if no document is
   open or Illustrator rejects the operation.

## Verification

- A sample document containing square, landscape, and portrait artboards
  receives names `1080x1080 px`, `1920x1080 px`, and `1080x1920 px`.
- Existing artboard names are replaced.
- With no document open, pressing the button does not fail silently.
