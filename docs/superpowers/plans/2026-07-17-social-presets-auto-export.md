# Social Presets and Automatic Export — แผนพัฒนา / Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**เป้าหมาย / Goal:** เพิ่มการสร้าง Artboard social และ export อัตโนมัติ พร้อม preset catalog ที่ใช้งาน offline ได้และอัปเดตจาก GitHub ได้

**โครงสร้าง / Architecture:** CEP panel จัดการ preset, export configuration, cache และ HTTPS update; ExtendScript จัดการ Illustrator DOM สำหรับสร้าง Artboard และ export. Catalog มาตรฐานอยู่บน GitHub และมีสำเนา bundled/cache

**เทคโนโลยี / Tech Stack:** CEP 7, HTML/CSS/JavaScript, CSInterface, Illustrator ExtendScript, Node.js built-in test runner, GitHub raw-content JSON

## ข้อกำหนดรวม / Global Constraints

- รองรับ Adobe Illustrator `ILST` 19.0 ขึ้นไป
- URL catalog คือ `https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json`
- Catalog รับเฉพาะ HTTPS และ `schemaVersion: 1`
- ไม่ส่ง artwork, ชื่อเอกสาร, ข้อมูล Artboard หรือ analytics ออกนอกเครื่อง
- ตรวจ update อัตโนมัติได้ไม่เกินหนึ่งครั้งต่อวัน; ผู้ใช้กดตรวจได้ทันที
- ใช้ bundled หรือ cached catalog เดิมเมื่อออฟไลน์/remote ผิดพลาด/JSON ไม่ผ่าน validation
- ไม่เขียนทับ custom preset ของผู้ใช้
- ชื่อ Artboard ใหม่: `<preset-slug>_<width>x<height> px`
- export PNG, JPG และ WebP; ชื่อไฟล์: `<artboard-name>.<extension>` หลัง sanitize
- ห้าม export เมื่อชื่อไฟล์หลัง sanitize ซ้ำ และต้องรายงานชื่อที่ชนกัน
- เอกสารใหม่ใน `docs/` เป็นสองภาษา ไทยและ English

---

## โครงสร้างไฟล์ / File Structure

- `catalog/social-presets.json`: catalog bundled
- `client/catalog.js`: catalog validation, cache และ daily-update policy
- `client/export-model.js`: sanitize ชื่อและตรวจ collision
- `host/social-workflow.jsx`: สร้าง Artboard, รายการ Artboard และ export
- `client/index.html`, `client/style.css`, `client/index.js`: UI
- `test/catalog.test.cjs`, `test/export-model.test.cjs`, `test/social-workflow.test.cjs`, `test/panel-workflow.test.cjs`: test
- `README.md`: วิธีใช้สองภาษา
- `social-presets.json` ใน GitHub repository `mooaod/plugin-Adobe`: catalog remote

### Task 1: Catalog ที่ตรวจสอบได้ / Validated preset catalog

**Files:**
- Create: `catalog/social-presets.json`, `client/catalog.js`, `test/catalog.test.cjs`

**Interfaces:**
- Produces: `CATALOG_URL`, `validateCatalog(value)`, `selectCatalog(bundled, cached)`, `shouldCheckToday(lastCheckedAt, now)`.
- `validateCatalog` returns `{ok:true,catalog}` or `{ok:false,error}`.

- [ ] **Step 1: Write the failing test / เขียน test ที่ต้อง fail ก่อน**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../client/catalog.js');

test('accepts valid schema 1 catalog', () => {
  const result = catalog.validateCatalog({
    schemaVersion: 1, catalogVersion: '1.0.0', updatedAt: '2026-07-17',
    presets: [{id:'instagram-feed', label:'Instagram Feed', width:1080, height:1080}]
  });
  assert.equal(result.ok, true);
});
test('rejects duplicate IDs', () => {
  const result = catalog.validateCatalog({
    schemaVersion: 1, catalogVersion: '1.0.0', updatedAt: '2026-07-17',
    presets: [{id:'same',label:'One',width:1080,height:1080},{id:'same',label:'Two',width:1080,height:1350}]
  });
  assert.deepEqual(result, {ok:false,error:'Preset IDs must be unique.'});
});
```

- [ ] **Step 2: Confirm red / ยืนยันว่า fail**

Run: `node --test test/catalog.test.cjs`  
Expected: FAIL because `client/catalog.js` does not exist.

- [ ] **Step 3: Implement minimum / เขียน implementation ขั้นต่ำ**

Create `catalog/social-presets.json`:

```json
{"schemaVersion":1,"catalogVersion":"1.0.0","updatedAt":"2026-07-17","presets":[{"id":"instagram-feed","label":"Instagram Feed","width":1080,"height":1080},{"id":"instagram-portrait","label":"Instagram Portrait","width":1080,"height":1350},{"id":"instagram-story-reel","label":"Instagram Story / Reel","width":1080,"height":1920},{"id":"facebook-post","label":"Facebook Post","width":1200,"height":630},{"id":"youtube-thumbnail","label":"YouTube Thumbnail","width":1280,"height":720}]}
```

Set `CATALOG_URL` to the exact global URL. Reject wrong schema version, empty version, duplicate ID, empty label, or dimensions that are not positive whole numbers. Export CommonJS helpers only if `module` exists.

- [ ] **Step 4: Verify green / ยืนยันว่า test ผ่าน**

Run: `node --test test/catalog.test.cjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add catalog/social-presets.json client/catalog.js test/catalog.test.cjs
git commit -m "feat: add validated social preset catalog"
```

### Task 2: Artboard และ export model / Artboard and export model

**Files:**
- Create: `host/social-workflow.jsx`, `client/export-model.js`
- Create: `test/social-workflow.test.cjs`, `test/export-model.test.cjs`

**Interfaces:**
- Produces: `createPresetArtboards(application,presets)`, `listArtboards(application)`, `exportArtboards(application,request)`, `sanitizeFilename(name)`, `findFilenameCollisions(artboards,format)`.
- Host returns JSON `{ok:true,created:[...]}` or `{ok:false,error:"..."}`.

- [ ] **Step 1: Write failing tests / เขียน test ที่ต้อง fail ก่อน**

```js
assert.equal(exportModel.sanitizeFilename('IG: Story/01'), 'IG-Story-01');
assert.deepEqual(exportModel.findFilenameCollisions([{name:'A/B'},{name:'A:B'}], 'png'), ['A-B.png']);
const result = JSON.parse(host.createPresetArtboards(mockApp, [{id:'instagram-feed',width:1080,height:1080}]));
assert.equal(result.created[0].name, 'instagram-feed_1080x1080 px');
assert.deepEqual(JSON.parse(host.exportArtboards(mockApp, {
  artboardIndexes:[0], destination:'/tmp/social', format:'png'
})), {ok:true, exported:['instagram-feed_1080x1080 px.png']});
```

Mock `artboards.add(rect)` and assert width/height are 1080 and the first new board starts 120 points after the current rightmost artboard.

- [ ] **Step 2: Confirm red / ยืนยันว่า fail**

Run: `node --test test/export-model.test.cjs test/social-workflow.test.cjs`  
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement minimum / เขียน implementation ขั้นต่ำ**

Use ES3 in `host/social-workflow.jsx`. Find the maximum `artboardRect[2]`; create boards left-to-right with 120-point gaps and name them with:

```js
function presetArtboardName(preset) {
  return preset.id + '_' + preset.width + 'x' + preset.height + ' px';
}
```

In `client/export-model.js`, replace every run of `<>:"/\|?*` and whitespace by `-`, trim `-` at both ends, use `artboard` when empty, then detect collisions after adding the extension.

Implement `exportArtboards(application, request)` by setting the active artboard
index for each requested board, exporting PNG with `ExportOptionsPNG24`, JPG
with `ExportOptionsJPEG`, and WebP with `ExportOptionsWebP`. Set artboard
clipping for PNG/JPG, pass a basename without an extension to `exportFile`, and
return every created filename or the failed artboard name in the JSON result.

- [ ] **Step 4: Verify green / ยืนยันว่า test ผ่าน**

Run: `node --test test/export-model.test.cjs test/social-workflow.test.cjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add host/social-workflow.jsx client/export-model.js test/social-workflow.test.cjs test/export-model.test.cjs
git commit -m "feat: create social artboards and validate exports"
```

### Task 3: Panel, update และ export / Panel, updates, and export

**Files:**
- Modify: `client/index.html`, `client/style.css`, `client/index.js`
- Create: `test/panel-workflow.test.cjs`

**Interfaces:**
- Consumes: catalog functions, export model, host functions, CSInterface.
- Produces: preset checkboxes, **Create Selected Presets**, format selector, Artboard checklist, **Export Selected**, **Check Preset Updates**, and status.

- [ ] **Step 1: Write failing panel behavior tests / เขียน test ที่ต้อง fail ก่อน**

Use fake DOM and bridge:

```js
assert.equal(fakeBridge.calls[0], 'listArtboards(app)');
assert.equal(updateCalls, 0); // same-day auto update is suppressed
assert.match(status.textContent, /Using cached presets/);
assert.equal(exportButton.disabled, true); // collision blocks export
```

Add a manual-update test proving the button fetches even after a same-day successful check.

- [ ] **Step 2: Confirm red / ยืนยันว่า fail**

Run: `node --test test/panel-workflow.test.cjs`  
Expected: FAIL because social controller behavior is missing.

- [ ] **Step 3: Implement panel / เขียน panel**

Load `catalog.js` and `export-model.js` before `index.js`. Render bundled/cache catalog first. Use `XMLHttpRequest` for the exact HTTPS URL; accept only HTTP 200 plus `validateCatalog` success. Cache only catalog data, catalog source, and last successful check in CEP user-data storage.

On panel open, remote-check only if `shouldCheckToday` is true. The manual control always checks. Call:
- `listArtboards(app)`
- `createPresetArtboards(app, <validated-json>)`
- `exportArtboards(app, <validated-json>)`

Build filenames before export; display collisions and keep Export disabled until none remain.

- [ ] **Step 4: Verify all tests / รัน test ทั้งหมด**

Run: `npm test`  
Expected: all tests PASS without warnings.

- [ ] **Step 5: Commit**

```bash
git add client/index.html client/style.css client/index.js test/panel-workflow.test.cjs
git commit -m "feat: add social preset and export panel"
```

### Task 4: Remote catalog และเอกสาร / Remote catalog and documentation

**Files:**
- Modify: `README.md`
- Create in GitHub repository `mooaod/plugin-Adobe`: `social-presets.json`

**Interfaces:**
- Remote JSON must be byte-for-byte the bundled catalog.
- README documents social board creation, export, update behavior, offline fallback, and privacy.

- [ ] **Step 1: Verify the catalog before publishing / ตรวจ catalog ก่อนเผยแพร่**

Run: `node --test test/catalog.test.cjs`  
Expected: PASS, proving the bundled JSON is valid and the configured URL is exact.

- [ ] **Step 2: Publish and document / เผยแพร่และเขียนเอกสาร**

Create `social-presets.json` on GitHub branch `main` with exactly the bundled content. Update README in Thai and English to describe: preset creation; PNG/JPG/WebP export; collision blocking; daily/manual update; offline fallback; and that only public catalog JSON is fetched.

- [ ] **Step 3: Verify local and remote / ตรวจ local และ remote**

Run: `npm test && curl -fsSL https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json`  
Expected: tests pass and curl prints valid schema version 1 JSON with five presets.

- [ ] **Step 4: Commit local documentation**

```bash
git add README.md
git commit -m "docs: explain social preset updates and export"
```
