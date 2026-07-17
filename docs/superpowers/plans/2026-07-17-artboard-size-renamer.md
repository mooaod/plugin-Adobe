# Artboard Size Renamer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Adobe Illustrator CEP panel that renames every artboard in the active document to its pixel size.

**Architecture:** A CEP manifest declares an Illustrator panel and preloads an ExtendScript file. The browser panel calls `CSInterface.evalScript`; the host script measures artboard rectangles, changes names, and returns JSON to the panel.

**Tech Stack:** CEP 7, HTML/CSS/JavaScript, Adobe CSInterface, Illustrator ExtendScript, Node.js built-in test runner.

## Global Constraints

- Host: Adobe Illustrator (`ILST`) 19.0 or later.
- Exact name format: `<width>x<height> px`.
- Round dimensions to whole pixels.
- Rename only when the user clicks **Rename All Artboards**.
- No network, filesystem, export, or third-party runtime dependencies.

---

## File structure

- `CSXS/manifest.xml`: declares the Illustrator CEP panel and host script path.
- `client/index.html`, `client/style.css`, `client/index.js`: panel UI and behavior.
- `client/CSInterface.js`: unmodified Adobe CEP bridge.
- `host/rename-artboards.jsx`: naming helpers and Illustrator DOM action.
- `test/*.test.cjs`: Node test runner tests.
- `README.md`: loading and verification guide.
- `package.json`: no-dependency test command.

### Task 1: Add a tested CEP extension shell

**Files:**
- Create: `CSXS/manifest.xml`, `client/index.html`, `client/style.css`, `package.json`, `.gitignore`, `README.md`
- Create: `test/manifest.test.cjs`

**Interfaces:**
- Produces: panel elements `#rename-button` and `#status`; host script path `./host/rename-artboards.jsx`.

- [ ] **Step 1: Write the failing manifest test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('registers an Illustrator CEP panel', () => {
  const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');
  assert.match(manifest, /Host Name="ILST" Version="19\.0"/);
  assert.match(manifest, /<ScriptPath>\.\/host\/rename-artboards\.jsx<\/ScriptPath>/);
  assert.match(manifest, /<Type>Panel<\/Type>/);
});
```

- [ ] **Step 2: Confirm failure**

Run: `node --test test/manifest.test.cjs`

Expected: FAIL because `CSXS/manifest.xml` does not exist.

- [ ] **Step 3: Add the smallest working shell**

Create `CSXS/manifest.xml` with this full manifest:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest ExtensionBundleId="com.aibd.artboardsizerenamer" ExtensionBundleVersion="1.0.0" Version="7.0">
  <ExtensionList><Extension Id="com.aibd.artboardsizerenamer.panel" Version="1.0.0" /></ExtensionList>
  <ExecutionEnvironment>
    <HostList><Host Name="ILST" Version="19.0" /></HostList>
    <LocaleList><Locale Code="All" /></LocaleList>
    <RequiredRuntimeList><RequiredRuntime Name="CSXS" Version="7.0" /></RequiredRuntimeList>
  </ExecutionEnvironment>
  <DispatchInfoList><Extension Id="com.aibd.artboardsizerenamer.panel"><DispatchInfo>
    <Resources><MainPath>./client/index.html</MainPath><ScriptPath>./host/rename-artboards.jsx</ScriptPath></Resources>
    <UI><Type>Panel</Type><Menu>Artboard Size Renamer</Menu><Geometry><Size><Width>300</Width><Height>180</Height></Size></Geometry></UI>
  </DispatchInfo></Extension></DispatchInfoList>
</ExtensionManifest>
```

Create an HTML page that loads `CSInterface.js` then `index.js`, contains button `id="rename-button"` and a live-status element `id="status"`. Add a compact dark-compatible stylesheet. Add `package.json` with `"test": "node --test"`; add `.gitignore` with `.DS_Store`, `node_modules/`, and `*.zxp`. README must state that `CSInterface.js` comes unmodified from Adobe CEP Resources.

- [ ] **Step 4: Confirm the shell passes**

Run: `node --test test/manifest.test.cjs`

Expected: PASS.

### Task 2: Implement and test host-side rename logic

**Files:**
- Create: `host/rename-artboards.jsx`
- Create: `test/rename-artboards.test.cjs`

**Interfaces:**
- Produces: `formatSizeName(width, height)` and `renameAllArtboards(application)`.
- Returns: JSON string `{"ok":true,"renamed":N}` or `{"ok":false,"error":"Open an Illustrator document first."}`.

- [ ] **Step 1: Write the failing unit tests**

```js
require.extensions['.jsx'] = require.extensions['.js'];
const api = require('../host/rename-artboards.jsx');

assert.equal(api.formatSizeName(1920.4, 1079.6), '1920x1080 px');
assert.equal(
  api.renameAllArtboards({ documents: [] }),
  '{"ok":false,"error":"Open an Illustrator document first."}'
);
```

Add a mock document with artboard rectangles `[0, 1080, 1920, 0]` and `[0, 1920, 1080, 0]`; assert it returns `{"ok":true,"renamed":2}` and names become `1920x1080 px` and `1080x1920 px`.

- [ ] **Step 2: Confirm failure**

Run: `node --test test/rename-artboards.test.cjs`

Expected: FAIL because `host/rename-artboards.jsx` does not exist.

- [ ] **Step 3: Implement the ES3-compatible host functions**

```js
function formatSizeName(width, height) {
  return Math.round(width) + 'x' + Math.round(height) + ' px';
}

function renameAllArtboards(application) {
  if (!application.documents || application.documents.length === 0) {
    return '{"ok":false,"error":"Open an Illustrator document first."}';
  }
  var artboards = application.activeDocument.artboards;
  for (var i = 0; i < artboards.length; i += 1) {
    var rect = artboards[i].artboardRect;
    artboards[i].name = formatSizeName(Math.abs(rect[2] - rect[0]), Math.abs(rect[1] - rect[3]));
  }
  return '{"ok":true,"renamed":' + artboards.length + '}';
}

if (typeof module !== 'undefined') {
  module.exports = { formatSizeName: formatSizeName, renameAllArtboards: renameAllArtboards };
}
```

- [ ] **Step 4: Confirm host behavior**

Run: `npm test`

Expected: all tests PASS.

### Task 3: Connect the panel and verify in Illustrator

**Files:**
- Create: `client/CSInterface.js`
- Create: `client/index.js`
- Create: `test/panel.test.cjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `CSInterface.evalScript('renameAllArtboards(app)', callback)`.
- Produces: success and error messages in `#status`, while disabling `#rename-button` during execution.

- [ ] **Step 1: Write the failing controller-source test**

Read `client/index.js` and assert it contains `evalScript`, `renameAllArtboards(app)`, `button.disabled = true`, and `result.renamed`.

- [ ] **Step 2: Confirm failure**

Run: `node --test test/panel.test.cjs`

Expected: FAIL because `client/index.js` does not exist.

- [ ] **Step 3: Implement the panel controller**

Copy Adobe's unmodified `CSInterface.js` from the CEP Resources project into `client/CSInterface.js`. Write `client/index.js` to instantiate `new CSInterface()`, disable the button and show `Renaming…`, then call:

```js
csInterface.evalScript('renameAllArtboards(app)', function (rawResult) {
  var result = JSON.parse(rawResult);
  status.textContent = result.ok ? 'Renamed ' + result.renamed + ' artboard(s).' : result.error;
  button.disabled = false;
});
```

Catch JSON parsing failure to show a retryable error and re-enable the button.

- [ ] **Step 4: Run all automated and manual checks**

Run: `npm test`

Expected: all tests PASS.

Manual check: copy the extension directory to `~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer`; enable CEP debug mode; restart Illustrator; open **Window → Extensions → Artboard Size Renamer**. Verify square, landscape, portrait, replacement of existing names, and no-document behavior.

