# Artboard Size Renamer Panel Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom, monochrome Artboard-and-dimensions icon to the Illustrator CEP extension list.

**Architecture:** Keep a human-editable SVG source in `assets/` and derive 1× and 2× PNG assets from it. Declare the PNG files with the CEP `<Icons>` block inside the panel's manifest UI section, so Illustrator can choose the appropriate dark-theme icon and high-DPI variant.

**Tech Stack:** SVG 1.1, PNG, Adobe CEP manifest XML, Node.js test runner, macOS `sips`.

## Global Constraints

- Use the selected monochrome, light-gray line icon style for Illustrator's dark UI.
- The icon contains a rectangular Artboard outline plus horizontal and vertical size arrows; it contains no text.
- The normal-density asset is exactly 16 × 16 px and the high-density asset is exactly 32 × 32 px, named with the `@2X` suffix.
- Only the CEP extension-list icon changes; the panel UI and workflow behavior must not change.
- Keep an editable SVG source in `assets/` and use relative paths from the extension root in `CSXS/manifest.xml`.

---

### Task 1: Create and verify the reusable icon assets

**Files:**
- Create: `assets/artboard-size-renamer-icon.svg`
- Create: `assets/artboard-size-renamer-icon-dark.png`
- Create: `assets/artboard-size-renamer-icon-dark@2X.png`
- Test: `test/manifest.test.cjs`

**Interfaces:**
- Produces: `./assets/artboard-size-renamer-icon-dark.png` and `./assets/artboard-size-renamer-icon-dark@2X.png`, both referenced by the CEP manifest in Task 2.
- Consumes: no runtime code or external package.

- [ ] **Step 1: Write the failing asset assertions**

Add this test to `test/manifest.test.cjs`:

```js
function readPngDimensions(filePath) {
  const png = fs.readFileSync(filePath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

test('ships normal and high-DPI dark panel icon assets', () => {
  const normalIcon = 'assets/artboard-size-renamer-icon-dark.png';
  const retinaIcon = 'assets/artboard-size-renamer-icon-dark@2X.png';

  assert.equal(fs.existsSync(normalIcon), true);
  assert.equal(fs.existsSync(retinaIcon), true);
  assert.deepEqual(readPngDimensions(normalIcon), { width: 16, height: 16 });
  assert.deepEqual(readPngDimensions(retinaIcon), { width: 32, height: 32 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/manifest.test.cjs`

Expected: FAIL because the two PNG icon files do not exist.

- [ ] **Step 3: Create the SVG master and PNG derivatives**

Create `assets/artboard-size-renamer-icon.svg` with a transparent 32 × 32 viewBox, `#D9D9D9` strokes, a rounded rectangular Artboard outline, corner handles, and horizontal/vertical double-ended dimension arrows. Do not include text, backgrounds, gradients, or raster content.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <g stroke="#D9D9D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="7" y="7" width="18" height="18" rx="1"/>
    <path d="M4 7V4h3M25 4h3v3M28 25v3h-3M7 28H4v-3"/>
    <path d="M10 12h12M10 12l2-2M10 12l2 2M22 12l-2-2M22 12l-2 2"/>
    <path d="M20 15v7M20 15l-2 2M20 15l2 2M20 22l-2-2M20 22l2-2"/>
  </g>
</svg>
```

Create the PNGs with:

```bash
sips -s format png -z 16 16 assets/artboard-size-renamer-icon.svg --out assets/artboard-size-renamer-icon-dark.png
sips -s format png -z 32 32 assets/artboard-size-renamer-icon.svg --out assets/artboard-size-renamer-icon-dark@2X.png
```

- [ ] **Step 4: Run the focused test to verify the assets**

Run: `node --test test/manifest.test.cjs`

Expected: PASS after Task 2's manifest assertion is not yet added; dimensions are 16 × 16 and 32 × 32.

- [ ] **Step 5: Commit the asset work**

```bash
git add assets/artboard-size-renamer-icon.svg assets/artboard-size-renamer-icon-dark.png assets/artboard-size-renamer-icon-dark@2X.png test/manifest.test.cjs
git commit -m "feat: add artboard size extension icon assets"
```

### Task 2: Register the icon in the Illustrator CEP manifest

**Files:**
- Modify: `CSXS/manifest.xml:11-20`
- Modify: `test/manifest.test.cjs`

**Interfaces:**
- Consumes: the two PNG assets produced by Task 1.
- Produces: a `<Icons>` block inside the panel's `<UI>` element that CEP resolves relative to the extension root.

- [ ] **Step 1: Write the failing manifest assertion**

Add this test:

```js
test('declares dark normal and high-DPI panel icons', () => {
  const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');

  assert.match(manifest, /<Icon Type="DarkNormal">\.\/assets\/artboard-size-renamer-icon-dark\.png<\/Icon>/);
  assert.match(manifest, /<Icon Type="DarkRollOver">\.\/assets\/artboard-size-renamer-icon-dark\.png<\/Icon>/);
  assert.match(manifest, /<Icon Type="Normal">\.\/assets\/artboard-size-renamer-icon-dark\.png<\/Icon>/);
  assert.match(manifest, /<Icon Type="RollOver">\.\/assets\/artboard-size-renamer-icon-dark\.png<\/Icon>/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/manifest.test.cjs`

Expected: FAIL because `CSXS/manifest.xml` does not yet contain the `<Icons>` block.

- [ ] **Step 3: Add the CEP icon declarations**

Inside `CSXS/manifest.xml`, place this block in `<UI>` after `<Menu>` and before `<Geometry>`:

```xml
<Icons>
  <Icon Type="Normal">./assets/artboard-size-renamer-icon-dark.png</Icon>
  <Icon Type="RollOver">./assets/artboard-size-renamer-icon-dark.png</Icon>
  <Icon Type="DarkNormal">./assets/artboard-size-renamer-icon-dark.png</Icon>
  <Icon Type="DarkRollOver">./assets/artboard-size-renamer-icon-dark.png</Icon>
</Icons>
```

The CEP convention resolves `artboard-size-renamer-icon-dark@2X.png` automatically on high-DPI displays when it exists beside the normal asset.

- [ ] **Step 4: Run the full verification suite**

Run: `npm test`

Expected: all tests pass.

Then run:

```bash
file assets/artboard-size-renamer-icon-dark.png assets/artboard-size-renamer-icon-dark@2X.png
git diff --check
```

Expected: both files are PNG images with 16 × 16 and 32 × 32 dimensions; no whitespace errors.

- [ ] **Step 5: Commit the manifest registration**

```bash
git add CSXS/manifest.xml test/manifest.test.cjs
git commit -m "feat: register custom CEP panel icon"
```

### Task 3: Install and visually validate the CEP bundle

**Files:**
- Copy from: `CSXS/manifest.xml`
- Copy from: `assets/artboard-size-renamer-icon-dark.png`
- Copy from: `assets/artboard-size-renamer-icon-dark@2X.png`
- Copy to: `~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/`

**Interfaces:**
- Consumes: committed icon assets and manifest registration from Tasks 1–2.
- Produces: an installed CEP bundle ready for Illustrator restart and visual inspection.

- [ ] **Step 1: Copy the updated manifest and assets into the installed bundle**

```bash
cp CSXS/manifest.xml "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/CSXS/manifest.xml"
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/assets"
cp assets/artboard-size-renamer-icon-dark.png "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/assets/artboard-size-renamer-icon-dark.png"
cp assets/artboard-size-renamer-icon-dark@2X.png "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/assets/artboard-size-renamer-icon-dark@2X.png"
```

- [ ] **Step 2: Verify installed files match the source bundle**

```bash
cmp CSXS/manifest.xml "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/CSXS/manifest.xml"
cmp assets/artboard-size-renamer-icon-dark.png "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/assets/artboard-size-renamer-icon-dark.png"
cmp assets/artboard-size-renamer-icon-dark@2X.png "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/assets/artboard-size-renamer-icon-dark@2X.png"
```

Expected: every command exits with status 0 and prints no output.

- [ ] **Step 3: Validate visually in Illustrator**

Tell the user to fully quit Illustrator with `Cmd + Q`, reopen it, then open `Window → Extensions`. Confirm that Artboard Size Renamer displays the new Artboard-and-dimensions icon instead of the generic placeholder.
