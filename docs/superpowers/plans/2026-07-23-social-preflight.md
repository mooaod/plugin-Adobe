# Social Media Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic Social Media Preflight workflow that finds missing, incorrectly named, and duplicate required artboards before verified export.

**Architecture:** A new browser-safe `client/preflight-model.js` classifies selected catalog presets against the current artboard list without Illustrator dependencies. The CEP panel renders and acts on that report, while `host/social-workflow.jsx` receives validated batch rename requests and continues to own Illustrator DOM mutations and exports.

**Tech Stack:** Adobe Illustrator CEP panel (HTML/CSS/ES5 JavaScript), ExtendScript, Node.js built-in test runner and `node:vm`.

## Global Constraints

- Keep the existing UI copy English; maintain design documentation in Thai and English.
- Preflight uses exact width/height equality and canonical names: `<preset-id>_<width>x<height> px`.
- The required-delivery checkbox set is independent of existing Create Presets checkboxes and starts unchecked.
- Never delete, resize, move, or select one of multiple duplicate artboards automatically.
- Keep all checks local; do not upload artwork, document metadata, results, or analytics.
- Reuse existing collision detection and overwrite confirmation for verified exports.
- Do not alter `client/CSInterface.js`.

---

### Task 1: Add the pure preflight classification model

**Files:**
- Create: `client/preflight-model.js`
- Create: `test/preflight-model.test.cjs`
- Modify: `client/index.html:74-77`
- Modify: `test/panel-workflow.test.cjs:15-18,197-200`

**Interfaces:**
- Consumes: `presets: Array<{id:string,label:string,width:number,height:number}>`; `artboards: Array<{index:number,name:string,width:number,height:number}>`.
- Produces: global `buildPreflightReport(presets, artboards)` and CommonJS export of the same function.
- Returns: `{summary:{pass:number,rename:number,missing:number,duplicate:number},results:Array<{preset:Object,status:'pass'|'rename'|'missing'|'duplicate',artboards:Array<Object>}>}`.

- [ ] **Step 1: Write the failing model tests**

Create `test/preflight-model.test.cjs`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPreflightReport } = require('../client/preflight-model.js');

const feed = { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 };
const portrait = { id: 'instagram-portrait', label: 'Instagram Portrait', width: 1080, height: 1350 };

test('classifies canonical, renameable, missing, and duplicate required presets', function () {
  const report = buildPreflightReport([feed, portrait, { id: 'story', label: 'Story', width: 1080, height: 1920 }, { id: 'facebook', label: 'Facebook', width: 1200, height: 630 }], [
    { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
    { index: 1, name: 'Portrait Draft', width: 1080, height: 1350 },
    { index: 2, name: 'Facebook A', width: 1200, height: 630 },
    { index: 3, name: 'Facebook B', width: 1200, height: 630 }
  ]);

  assert.deepEqual(report.summary, { pass: 1, rename: 1, missing: 1, duplicate: 1 });
  assert.deepEqual(report.results.map(function (result) { return result.status; }), ['pass', 'rename', 'missing', 'duplicate']);
});

test('uses the canonical name supplied by the preset dimensions', function () {
  assert.equal(buildPreflightReport([feed], [{ index: 7, name: 'wrong', width: 1080, height: 1080 }]).results[0].canonicalName, 'instagram-feed_1080x1080 px');
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test test/preflight-model.test.cjs`

Expected: FAIL because `client/preflight-model.js` does not exist.

- [ ] **Step 3: Implement the smallest browser/CommonJS model**

Create `client/preflight-model.js`:

```js
(function (root) {
  'use strict';
  function canonicalName(preset) {
    return preset.id + '_' + preset.width + 'x' + preset.height + ' px';
  }
  function matchingArtboards(preset, artboards) {
    return artboards.filter(function (artboard) {
      return artboard.width === preset.width && artboard.height === preset.height;
    });
  }
  function buildPreflightReport(presets, artboards) {
    var summary = { pass: 0, rename: 0, missing: 0, duplicate: 0 };
    var results = presets.map(function (preset) {
      var matches = matchingArtboards(preset, artboards);
      var status = matches.length === 0 ? 'missing' : matches.length > 1 ? 'duplicate' :
        matches[0].name === canonicalName(preset) ? 'pass' : 'rename';
      summary[status] += 1;
      return { preset: preset, canonicalName: canonicalName(preset), status: status, artboards: matches };
    });
    return { summary: summary, results: results };
  }
  root.buildPreflightReport = buildPreflightReport;
  if (typeof module !== 'undefined') module.exports = { buildPreflightReport: buildPreflightReport };
}(this));
```

Add `<script src="preflight-model.js"></script>` after `export-model.js` and before `index.js`. In the panel test harness, load the same source with `vm.runInContext(preflightModelSource, context)` before the controller.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/preflight-model.test.cjs test/panel-workflow.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit the model**

```bash
git add client/preflight-model.js client/index.html test/preflight-model.test.cjs test/panel-workflow.test.cjs
git commit -m "feat: add social preflight model"
```

### Task 2: Add validated batch rename support in the Illustrator host

**Files:**
- Modify: `host/social-workflow.jsx:261-275,440-456`
- Modify: `test/social-workflow.test.cjs:9-19,181-224`

**Interfaces:**
- Consumes: `renameArtboards(application, changes)` where `changes` is `Array<{index:number,name:string}>`.
- Produces: `{"ok":true,"renamed":[{"index":0,"name":"instagram-feed_1080x1080 px"}]}` or the existing `errorResult` JSON shape.
- Exposes: `$.global.renameArtboards` and `module.exports.renameArtboards`.

- [ ] **Step 1: Write failing host tests**

Add to `test/social-workflow.test.cjs`:

```js
test('renameArtboards renames validated artboard indexes in ascending order', function () {
  const application = makeApplication([
    { artboardRect: [0, 100, 100, 0], name: 'First' },
    { artboardRect: [120, 100, 220, 0], name: 'Second' }
  ]);
  assert.deepEqual(JSON.parse(host.renameArtboards(application, [
    { index: 1, name: 'second_100x100 px' },
    { index: 0, name: 'first_100x100 px' }
  ])), { ok: true, renamed: [
    { index: 0, name: 'first_100x100 px' },
    { index: 1, name: 'second_100x100 px' }
  ] });
});

test('renameArtboards changes nothing when any requested change is invalid', function () {
  const application = makeApplication([{ artboardRect: [0, 100, 100, 0], name: 'Keep' }]);
  const result = JSON.parse(host.renameArtboards(application, [{ index: 0, name: 'Changed' }, { index: 4, name: 'Nope' }]));
  assert.equal(result.ok, false);
  assert.equal(application.activeDocument.artboards[0].name, 'Keep');
});
```

Also extend the global-scope test with `assert.equal(typeof context.$.global.renameArtboards, 'function');`.

- [ ] **Step 2: Run host tests to verify they fail**

Run: `node --test test/social-workflow.test.cjs`

Expected: FAIL because `renameArtboards` is not exported.

- [ ] **Step 3: Implement all-or-nothing request validation and ordered rename**

Insert before `sanitizeFilename`:

```js
function renameArtboards(application, changes) {
  var document = activeDocument(application);
  var prepared = [];
  var i;
  if (!document) return errorResult('Open an Illustrator document first.');
  if (!changes || typeof changes.length !== 'number' || changes.length === 0) {
    return errorResult('Provide one or more artboards to rename.');
  }
  for (i = 0; i < changes.length; i += 1) {
    if (!changes[i] || typeof changes[i].index !== 'number' || Math.floor(changes[i].index) !== changes[i].index ||
        changes[i].index < 0 || changes[i].index >= document.artboards.length ||
        typeof changes[i].name !== 'string' || !changes[i].name) return errorResult('Provide valid artboard indexes and names.');
    prepared.push({ index: changes[i].index, name: changes[i].name });
  }
  prepared.sort(function (left, right) { return left.index - right.index; });
  for (i = 0; i < prepared.length; i += 1) document.artboards[prepared[i].index].name = prepared[i].name;
  return '{"ok":true,"renamed":[' + prepared.map(function (item) {
    return '{"index":' + item.index + ',"name":' + jsonQuote(item.name) + '}';
  }).join(',') + ']}';
}
```

Register it in both export blocks. Replace `Array.prototype.map` in the JSON assembly only if the target ExtendScript compatibility test requires ES3 syntax; use a `for` loop in that case.

- [ ] **Step 4: Run host tests to verify they pass**

Run: `node --test test/social-workflow.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit the host capability**

```bash
git add host/social-workflow.jsx test/social-workflow.test.cjs
git commit -m "feat: support preflight artboard renaming"
```

### Task 3: Render Preflight and connect safe actions in the panel

**Files:**
- Modify: `client/index.html:36-61,74-77`
- Modify: `client/style.css` (add focused Preflight status/layout styles)
- Modify: `client/index.js:8-34,181-301,481-613`
- Modify: `test/panel-workflow.test.cjs:74-208,414-579`

**Interfaces:**
- Consumes: global `buildPreflightReport(requiredPresets, artboards)` and host calls `createPresetArtboards(app, presets)`, `renameArtboards(app, changes)`, `exportArtboards(app, request)`.
- Produces: functions `selectedPreflightPresets()`, `runPreflight()`, `clearPreflightReport()`, `updatePreflightState()` and `sendExportRequest()` reuse.
- Preflight export request: `{artboardIndexes:number[],destination:string,format:string}` made only from report `pass` results when `summary.missing === 0 && summary.duplicate === 0`.

- [ ] **Step 1: Write failing panel workflow tests**

Add a catalog fixture with Feed, Portrait, Story, and Facebook. Add tests that prove:

```js
test('starts required delivery presets unchecked and disables preflight actions', function () {
  const panel = runPanel({ cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() } });
  assert.equal(panel.document.elements['preflight-preset-list'].children[0].children[0].checked, false);
  assert.equal(panel.document.elements['run-preflight-button'].disabled, true);
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
});

test('runs preflight, creates only missing presets, renames only fixable artboards, and exports pass results', function () {
  const panel = runPanel({
    cacheState: { catalog: fourPresetCatalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'instagram-portrait_1080x1350 px', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true; required[0].children[0].dispatch('change');
  required[1].children[0].checked = true; required[1].children[0].dispatch('change');
  required[2].children[0].checked = true; required[2].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Pass.*1 Rename.*1 Missing/);
  panel.document.elements['create-missing-button'].dispatch('click');
  assert.match(panel.bridge.calls.find(function (call) { return call.indexOf('createPresetArtboards(app, ') === 0; }), /instagram-story/);
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['rename-fixable-button'].dispatch('click');
  assert.match(panel.bridge.calls.find(function (call) { return call.indexOf('renameArtboards\(app, ') === 0; }), /instagram-portrait_1080x1350 px/);
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');
  assert.match(panel.bridge.calls.find(function (call) { return call.indexOf('exportArtboards(app, ') === 0; }), /"artboardIndexes":\[0,1,2\]/);
});
```

Extend `fakeDocument()` with `preflight-preset-list`, `run-preflight-button`, `preflight-summary`, `preflight-results`, `create-missing-button`, `rename-fixable-button`, and `export-verified-button`. Extend the fake bridge to return configurable `renameResults` and a sequence of `artboardResults` for refreshes.

- [ ] **Step 2: Run panel tests to verify they fail**

Run: `node --test test/panel-workflow.test.cjs`

Expected: FAIL because the new DOM ids and Preflight controller code do not exist.

- [ ] **Step 3: Add the Preflight markup and scoped styling**

Add after the create-preset section and before Export:

```html
<section aria-labelledby="preflight-heading">
  <h2 id="preflight-heading">Preflight</h2>
  <p>Required delivery sizes</p>
  <div id="preflight-preset-list" class="checklist"></div>
  <button id="run-preflight-button" type="button" disabled>Run Preflight</button>
  <p id="preflight-summary" role="status" aria-live="polite"></p>
  <div id="preflight-results"></div>
  <button id="create-missing-button" class="secondary" type="button" disabled>Create Missing</button>
  <button id="rename-fixable-button" class="secondary" type="button" disabled>Rename Fixable</button>
</section>
```

Add `<button id="export-verified-button" type="button" disabled>Export Verified Set</button>` inside Export. Use `.preflight-summary`, `.preflight-result`, and status classes `pass`, `rename`, `missing`, `duplicate`; retain the panel’s existing dark colors, compact controls, and accessible live region.

- [ ] **Step 4: Implement report lifecycle and safe buttons**

In `client/index.js`, render a second checkbox list from `activeCatalog.presets` and store `preflightCheckboxes` separately. On requirement changes and every `refreshArtboards` result, call `clearPreflightReport()`.

Use these action rules:

```js
function preflightCanExport(report) {
  return report && report.summary.missing === 0 && report.summary.duplicate === 0 &&
    report.summary.pass > 0;
}
function fixableRenameChanges(report) {
  return report.results.filter(function (result) { return result.status === 'rename'; })
    .map(function (result) { return { index: result.artboards[0].index, name: result.canonicalName }; });
}
```

Use ES5 `for` loops if needed to keep parity with current code style. `Create Missing` sends only `result.preset` from Missing results; `Rename Fixable` sends only the calculated changes; both clear the report before calling `refreshArtboards()`. `Export Verified Set` builds indexes from only Pass results and calls existing `sendExportRequest`; do not duplicate overwrite handling.

- [ ] **Step 5: Run panel tests to verify they pass**

Run: `node --test test/panel-workflow.test.cjs`

Expected: PASS, including all pre-existing catalog, custom preset, host-load, export collision, and overwrite tests.

- [ ] **Step 6: Commit panel workflow**

```bash
git add client/index.html client/index.js client/style.css test/panel-workflow.test.cjs
git commit -m "feat: add social media preflight panel"
```

### Task 4: Verify the release and document the workflow

**Files:**
- Modify: `README.md:5-35`
- Modify: `test/release.test.cjs` only if it maintains an explicit required-file list.

**Interfaces:**
- Consumes: completed panel workflow and test command `npm test`.
- Produces: developer-facing English README instructions for Preflight and live Illustrator verification.

- [ ] **Step 1: Write a failing documentation assertion if release tests enumerate features**

Add only an assertion that is consistent with existing release-test style, for example:

```js
assert.match(readme, /Run Preflight/);
assert.match(readme, /Export Verified Set/);
```

- [ ] **Step 2: Run the focused release test to verify it fails**

Run: `node --test test/release.test.cjs`

Expected: FAIL because README does not yet describe Preflight.

- [ ] **Step 3: Document actual user flow and manual Illustrator verification**

Add a `## Preflight before delivery` README section explaining the four result statuses, that Duplicate requires manual resolution, and that Export Verified Set remains disabled while Missing or Duplicate exists. Include the six manual verification steps from the approved design.

- [ ] **Step 4: Run all automated checks**

Run: `npm test`

Expected: PASS with no failed tests.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 5: Perform live Illustrator verification**

Follow the six steps in `docs/superpowers/specs/2026-07-23-social-preflight-design.md` under **Manual verification**. Record the actual Illustrator version and whether PNG/JPG/WebP capabilities matched the panel state in the commit or handoff notes.

- [ ] **Step 6: Commit documentation and re-run readiness**

```bash
git add README.md test/release.test.cjs
git commit -m "docs: explain social preflight workflow"
python3 /Users/aibd/.codex/skills/gold-rules/scripts/project_readiness.py "/Users/aibd/Documents/DATA/Web_Projects/plugin Adobe"
```

Expected: inspect any remaining Signed ZXP secret warning separately; do not claim release readiness until it is resolved.
