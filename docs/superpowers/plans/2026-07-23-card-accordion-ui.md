# Card Accordion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Artboard Size Renamer CEP panel into the approved dark card-accordion UI while preserving every existing social preset, preflight, rename, and export behavior.

**Architecture:** Keep all Illustrator host calls and pure data models unchanged. Restructure only the static panel markup, add a small DOM-only accordion controller in `client/index.js`, and extend the preflight renderer to produce semantic status rows. `client/style.css` owns the responsive dark card visual treatment. The existing Node VM panel workflow test will verify DOM state and generated result rows without requiring Illustrator.

**Tech Stack:** HTML5, CSS3, ES5-compatible browser JavaScript for Adobe CEP 12, Node.js built-in `node:test` and `node:vm`.

## Global Constraints

- UI copy remains English; developer documents remain bilingual where user-facing decisions are recorded.
- Do not change `host/rename-artboards.jsx`, `host/social-workflow.jsx`, catalog schema, export request shape, or preflight classification rules.
- Maintain existing operation locking, `aria-live` status text, disabled-state behavior, collision confirmation, and verified-export revalidation.
- Work at the manifest minimum width of 300 px; optimise the visual reference at 360 px wide.
- Presets and Preflight start expanded; Export starts collapsed; cards are independently expandable.
- A collapsed card hides content but must not clear any selection, report, destination, format, or active operation state.

---

## File Structure

- `client/index.html` — semantic panel header and three accordion cards; retains every existing control ID consumed by `client/index.js`.
- `client/index.js` — accordion setup and semantic preflight summary/result-row rendering; no host bridge changes.
- `client/style.css` — dark card layout, responsive control spacing, chevrons, status icons/badges, and visible focus treatment.
- `test/panel-workflow.test.cjs` — enriches the fake DOM and verifies accordion state plus status rows.
- `test/panel.test.cjs` — static smoke tests that protect accessible accordion markup and controller wiring.

## Task 1: Semantic accordion panel shell

**Files:**
- Modify: `client/index.html:9-75`
- Modify: `test/panel.test.cjs:6-16`

**Interfaces:**
- Consumes: existing control IDs used by `client/index.js`, including `preset-list`, `preflight-preset-list`, `format-select`, and `export-verified-button`.
- Produces: `.panel-card`, `.accordion-trigger`, and `.accordion-body` DOM nodes with `data-accordion-target`, `aria-expanded`, and `aria-controls` for Task 2.

- [ ] **Step 1: Write the failing static markup tests**

Add a test to `test/panel.test.cjs` that reads `client/index.html` and requires all three card identities, default expansion states, and accessible trigger wiring:

```js
test('panel markup provides accessible independent accordion cards', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /id="presets-trigger"[\s\S]*aria-expanded="true"/);
  assert.match(html, /id="preflight-trigger"[\s\S]*aria-expanded="true"/);
  assert.match(html, /id="export-trigger"[\s\S]*aria-expanded="false"/);
  assert.match(html, /aria-controls="presets-body"/);
  assert.match(html, /aria-controls="preflight-body"/);
  assert.match(html, /aria-controls="export-body"/);
  assert.match(html, /id="export-body"[\s\S]*hidden/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/panel.test.cjs`

Expected: FAIL because the current document has plain `<section>` elements and no accordion IDs.

- [ ] **Step 3: Replace the static shell while preserving existing IDs**

Replace the current `<main>` content with a compact top bar and three cards. The exact controls must remain inside the named body nodes so existing JavaScript references remain valid:

```html
<main class="panel-shell">
  <header class="panel-header">
    <h1>Artboard Size Renamer</h1>
    <button class="header-menu" type="button" aria-label="Panel menu" disabled>☰</button>
  </header>

  <section class="panel-card" aria-labelledby="presets-trigger">
    <button id="presets-trigger" class="accordion-trigger" type="button"
      aria-expanded="true" aria-controls="presets-body" data-accordion-target="presets-body">
      <span>Presets</span><span class="chevron" aria-hidden="true"></span>
    </button>
    <div id="presets-body" class="accordion-body">
      <p class="card-helper">Required delivery sizes</p>
      <div id="preset-list" class="checklist"></div>
      <button id="create-presets-button" type="button" disabled>Create Selected Presets</button>
      <p id="status" role="status" aria-live="polite">Ready</p>
      <div class="catalog-tools">
        <span id="catalog-info" class="meta">Loading presets…</span>
        <button id="update-presets-button" class="secondary" type="button">Check Preset Updates</button>
      </div>
      <div class="custom-preset-form" aria-labelledby="custom-preset-heading">
        <h3 id="custom-preset-heading">Add custom preset</h3>
        <label for="custom-preset-id">Unique ID</label>
        <input id="custom-preset-id" type="text" placeholder="my-banner">
        <label for="custom-preset-label">Label</label>
        <input id="custom-preset-label" type="text" placeholder="My Banner">
        <div class="dimension-fields">
          <div><label for="custom-preset-width">Width</label><input id="custom-preset-width" type="number" min="1" step="1" placeholder="1200"></div>
          <div><label for="custom-preset-height">Height</label><input id="custom-preset-height" type="number" min="1" step="1" placeholder="628"></div>
        </div>
        <button id="add-custom-preset-button" class="secondary" type="button">Add Custom Preset</button>
      </div>
      <div class="utility"><button id="rename-button" class="secondary" type="button">Rename Artboards</button></div>
    </div>
  </section>

  <section class="panel-card" aria-labelledby="preflight-trigger">
    <button id="preflight-trigger" class="accordion-trigger" type="button"
      aria-expanded="true" aria-controls="preflight-body" data-accordion-target="preflight-body">
      <span>Preflight</span><span class="chevron" aria-hidden="true"></span>
    </button>
    <div id="preflight-body" class="accordion-body">
      <p class="card-helper accent">Run Preflight to verify delivery requirements.</p>
      <p class="card-helper">Required delivery sizes</p>
      <div id="preflight-preset-list" class="checklist"></div>
      <button id="run-preflight-button" type="button" disabled>Run Preflight</button>
      <div id="preflight-summary" class="preflight-summary" role="status" aria-live="polite"></div>
      <div id="preflight-results"></div>
      <div class="preflight-actions">
        <button id="create-missing-button" class="secondary" type="button" disabled>Create Missing</button>
        <button id="rename-fixable-button" class="secondary" type="button" disabled>Rename Fixable</button>
      </div>
    </div>
  </section>

  <section class="panel-card" aria-labelledby="export-trigger">
    <button id="export-trigger" class="accordion-trigger" type="button"
      aria-expanded="false" aria-controls="export-body" data-accordion-target="export-body">
      <span>Export</span><span class="chevron" aria-hidden="true"></span>
    </button>
    <div id="export-body" class="accordion-body" hidden>
      <label for="format-select">Format</label>
      <select id="format-select"><option value="png">PNG</option><option value="jpg">JPG</option></select>
      <label for="destination-input">Destination folder</label>
      <input id="destination-input" type="text" placeholder="/path/to/export folder">
      <div id="artboard-list" class="checklist"></div>
      <p id="collision-warning" class="warning" aria-live="polite"></p>
      <button id="export-button" type="button" disabled>Export Selected</button>
      <button id="export-verified-button" type="button" disabled>Export Verified Set</button>
    </div>
  </section>
</main>
```

Keep the existing Utilities rename button in the Presets card after the custom-preset form, under a divider, so its `rename-button` ID remains available.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test test/panel.test.cjs`

Expected: PASS, including the existing rename-controller smoke test.

- [ ] **Step 5: Commit the semantic shell**

```bash
git add client/index.html test/panel.test.cjs
git commit -m "feat: add accessible panel accordion shell"
```

## Task 2: Accordion controller and preflight status rows

**Files:**
- Modify: `client/index.js:10-40, 279-311, 1088-1098`
- Modify: `test/panel-workflow.test.cjs:45-97, 276-340`

**Interfaces:**
- Consumes: buttons with `.accordion-trigger` and `data-accordion-target`, and body nodes whose IDs match that data attribute.
- Produces: `initializeAccordions()` for card state changes and `renderPreflightReport(report)` output containing `.preflight-summary-row` nodes with `pass`, `rename`, `missing`, and `duplicate` status classes.

- [ ] **Step 1: Write failing VM workflow tests**

Extend `FakeElement` with attribute support and add the accordion trigger/body IDs to `fakeDocument()`:

```js
constructor(id, tagName) {
  this.id = id || '';
  this.tagName = tagName || 'div';
  this.children = [];
  this.dataset = {};
  this.attributes = {};
  this.hidden = false;
  this.listeners = {};
}
setAttribute(name, value) { this.attributes[name] = String(value); }
getAttribute(name) { return this.attributes[name] || null; }
```

Add this test after the existing workflow setup tests:

```js
test('accordion cards toggle independently without resetting preflight selections', function () {
  const panel = runPanel({ bundledCatalog: fourPresetCatalog() });
  const presets = panel.document.elements['presets-body'];
  const exportBody = panel.document.elements['export-body'];
  const exportTrigger = panel.document.elements['export-trigger'];

  panel.document.elements['preflight-preset-list'].children[0].children[0].checked = true;
  exportTrigger.dispatch('click');

  assert.equal(exportBody.hidden, false);
  assert.equal(exportTrigger.getAttribute('aria-expanded'), 'true');
  assert.equal(presets.hidden, false);
  assert.equal(panel.document.elements['preflight-preset-list'].children[0].children[0].checked, true);
});
```

Add a preflight rendering test using a report with all four statuses, asserting four summary rows, the fixed status order, and matching badge text:

```js
assert.deepEqual(
  panel.document.elements['preflight-summary'].children.map(function (row) {
    return row.dataset.status + ':' + row.children[1].textContent;
  }),
  ['pass:2 Pass', 'rename:1 Rename', 'missing:1 Missing', 'duplicate:0 Duplicate']
);
```

- [ ] **Step 2: Run the focused workflow tests to verify they fail**

Run: `node --test test/panel-workflow.test.cjs`

Expected: FAIL because the fake document has no accordion elements and the current preflight summary is one text string.

- [ ] **Step 3: Add the minimal accordion controller**

Near the top-level DOM references in `client/index.js`, add:

```js
function initializeAccordions() {
  var triggers = document.querySelectorAll
    ? document.querySelectorAll('.accordion-trigger')
    : [];
  var i;
  for (i = 0; i < triggers.length; i += 1) {
    triggers[i].addEventListener('click', function () {
      var body = document.getElementById(this.dataset.accordionTarget);
      var expanded = this.getAttribute('aria-expanded') === 'true';
      if (!body) { return; }
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      body.hidden = expanded;
    });
  }
}
```

Call `initializeAccordions();` immediately before `loadBundledCatalog();`. In the test fake document, provide a `querySelectorAll` implementation that returns the three stored trigger elements when called with `.accordion-trigger`.

- [ ] **Step 4: Replace one-line summary text with semantic rows**

Add a fixed status metadata helper and render each row inside `preflightSummary`:

```js
function preflightStatusMeta(status) {
  return {
    pass: { icon: '✓', label: 'Pass' },
    rename: { icon: '!', label: 'Rename' },
    missing: { icon: '×', label: 'Missing' },
    duplicate: { icon: '−', label: 'Duplicate' }
  }[status];
}

function appendPreflightSummaryRow(status, count) {
  var meta = preflightStatusMeta(status);
  var row = document.createElement('div');
  var icon = document.createElement('span');
  var countLabel = document.createElement('span');
  var badge = document.createElement('span');
  row.className = 'preflight-summary-row ' + status;
  row.dataset.status = status;
  icon.className = 'preflight-status-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = meta.icon;
  countLabel.textContent = count + ' ' + meta.label;
  badge.className = 'preflight-status-badge';
  badge.textContent = meta.label;
  row.appendChild(icon);
  row.appendChild(countLabel);
  row.appendChild(badge);
  preflightSummary.appendChild(row);
}
```

At the start of `renderPreflightReport(report)`, call `clearElement(preflightSummary)` and then call `appendPreflightSummaryRow` in this exact order: `pass`, `rename`, `missing`, `duplicate`. Keep the existing detailed results loop, including matching artboard names, unchanged.

Update `clearPreflightReport()` to clear summary child nodes rather than assigning only `textContent`:

```js
clearElement(preflightSummary);
preflightSummary.className = 'preflight-summary';
```

- [ ] **Step 5: Run focused workflow tests to verify they pass**

Run: `node --test test/panel-workflow.test.cjs`

Expected: PASS, including existing host-load, cross-lock, rollback, and verified-export scenarios.

- [ ] **Step 6: Commit behavior and rendering changes**

```bash
git add client/index.js test/panel-workflow.test.cjs
git commit -m "feat: add panel accordion behavior and status rows"
```

## Task 3: Dark card visual system and responsive verification

**Files:**
- Modify: `client/style.css:1-45`
- Modify: `test/panel.test.cjs:6-35`

**Interfaces:**
- Consumes: markup and classes from Tasks 1–2: `.panel-shell`, `.panel-header`, `.panel-card`, `.accordion-trigger`, `.accordion-body`, `.preflight-summary-row`, `.preflight-status-icon`, and `.preflight-status-badge`.
- Produces: the approved dark card UI at 360 px and a vertical scrolling panel that remains usable at 300 px.

- [ ] **Step 1: Write failing stylesheet smoke checks**

Add a static test that asserts the stylesheet includes visual hooks required by the approved reference:

```js
test('panel stylesheet defines card, accordion, and semantic status treatments', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'style.css'), 'utf8');
  assert.match(css, /\.panel-card\s*\{/);
  assert.match(css, /\.accordion-trigger\[aria-expanded="true"\]/);
  assert.match(css, /\.preflight-summary-row\.pass/);
  assert.match(css, /\.preflight-summary-row\.rename/);
  assert.match(css, /\.preflight-summary-row\.missing/);
  assert.match(css, /\.preflight-summary-row\.duplicate/);
  assert.match(css, /@media\s*\(max-width:\s*320px\)/);
});
```

- [ ] **Step 2: Run the focused static test to verify it fails**

Run: `node --test test/panel.test.cjs`

Expected: FAIL because current CSS has plain sections and no accordion/status-row selectors.

- [ ] **Step 3: Replace plain section styling with card styling**

Implement the following visual primitives while preserving existing input/button selectors and disabled states:

```css
:root { color-scheme: dark; color: #f4f4f4; background: #202020; }
body { margin: 0; min-width: 300px; background: #202020; }
.panel-shell { padding: 4px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; }
.panel-card { margin: 0 0 12px; overflow: hidden; border: 1px solid #4a4a4a; border-radius: 10px; background: linear-gradient(135deg, #323232, #252525); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
.accordion-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 18px 22px; border: 0; border-radius: 0; color: #f4f4f4; background: transparent; font-size: 21px; font-weight: 700; text-align: left; }
.accordion-trigger:focus-visible { outline: 2px solid #5ca9ff; outline-offset: -4px; }
.chevron { width: 12px; height: 12px; border-right: 3px solid #ddd; border-bottom: 3px solid #ddd; transform: rotate(45deg); transition: transform .15s ease; }
.accordion-trigger[aria-expanded="true"] .chevron { transform: rotate(225deg); }
.accordion-body { padding: 0 22px 22px; }
.accordion-body[hidden] { display: none; }
```

Style checklist rows with generous vertical padding and dividers. Use `.card-helper.accent { color: #65a9ff; }`. Give repair buttons equal flexible width using a `.preflight-actions` wrapper added in Task 1 markup.

Implement status rows as a three-column grid and colour each row using a status-specific border/icon/badge:

```css
.preflight-summary-row { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 12px; padding: 14px 8px; border-top: 1px solid #505050; font-size: 18px; }
.preflight-status-icon { display: grid; width: 30px; height: 30px; place-items: center; border: 2px solid currentColor; border-radius: 50%; font-weight: 700; }
.preflight-status-badge { min-width: 116px; padding: 8px 12px; border: 1px solid currentColor; border-radius: 7px; text-align: center; }
.preflight-summary-row.pass { color: #72db81; }
.preflight-summary-row.rename { color: #f2b43d; }
.preflight-summary-row.missing { color: #ff6565; }
.preflight-summary-row.duplicate { color: #c5c5c5; }
```

Add the required narrow layout rule:

```css
@media (max-width: 320px) {
  .panel-header, .accordion-body { padding-left: 14px; padding-right: 14px; }
  .accordion-trigger { padding: 15px 14px; font-size: 18px; }
  .preflight-summary-row { grid-template-columns: 32px 1fr; font-size: 15px; }
  .preflight-status-badge { grid-column: 2; min-width: 0; }
  .preflight-actions { flex-direction: column; }
}
```

- [ ] **Step 4: Run all automated tests**

Run: `npm test`

Expected: all existing tests plus the new accordion and CSS smoke tests PASS with zero failures.

- [ ] **Step 5: Manually verify in Illustrator**

1. Install the changed `client/` directory into `/Users/aibd/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/`.
2. Restart Illustrator after saving any user documents.
3. Open **Window → Extensions → Artboard Size Renamer**.
4. Confirm Presets and Preflight start open and Export starts closed.
5. Open Export, then collapse Preflight; confirm Export remains open and any selected preset remains selected.
6. Run a preflight report containing at least one Pass, Rename, Missing, and Duplicate result; verify the row order, text, icons, colours, detailed artboard names, and repair button disabled/enabled states.
7. Dock the panel and reduce width toward 300 px; confirm content scrolls and no controls become unreachable.

- [ ] **Step 6: Commit the visual system**

```bash
git add client/style.css client/index.html test/panel.test.cjs
git commit -m "feat: style card accordion panel"
```

## Plan Review

- Spec coverage: Tasks 1–3 cover the approved header, card visual treatment, independent accessible accordion behavior, default expansion state, status colours/icons/order, unchanged business behavior, automated tests, and live Illustrator verification.
- Placeholder scan: no unassigned requirements or deferred implementation steps remain.
- Type consistency: Task 1 creates IDs/classes that Task 2 reads; Task 2 emits classes that Task 3 styles; tests use the same `data-accordion-target`, status names, and element IDs.
