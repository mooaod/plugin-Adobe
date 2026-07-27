# Custom Preset Delete Confirmation Modal Implementation Plan / แผนพัฒนา Modal ยืนยันการลบ Custom Preset

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal / เป้าหมาย:** Replace CEP's native `JavaScript Confirm` for Custom Preset deletion with an accessible, Compact UI in-panel modal that never exposes the extension file path.

**Architecture / โครงสร้าง:** Add static modal markup to `client/index.html` and Compact UI styling to `client/style.css`. `client/index.js` owns one pending preset and its trigger, opens or cancels the modal without writing, and calls the existing persistence/rollback path only after the modal's Delete action. Keep Export overwrite confirmation unchanged.

**Tech Stack / เทคโนโลยี:** Adobe CEP 7, browser JavaScript compatible with older Chromium, HTML/CSS, CEP filesystem API, Node.js built-in test runner, fake DOM workflow tests.

## Global Constraints / ข้อกำหนดรวม

- Use a `div` with `role="dialog"` instead of HTML `<dialog>`.
- The dialog title is exactly **Delete Custom Preset?**
- The message names the pending preset and does not include a `file://` path.
- **Cancel** receives focus when the modal opens.
- **Delete** uses a red destructive treatment.
- Cancel and `Esc` close the modal without writing.
- Clicking the backdrop does not dismiss the modal.
- Only Custom Presets remain deletable; built-in and remote presets remain unchanged.
- Existing custom-store rollback behavior remains intact after a failed write.
- Export overwrite confirmation remains on its existing workflow.
- New documentation remains bilingual in Thai and English.

---

## File Structure / โครงสร้างไฟล์

- `client/index.html`: static accessible confirmation-modal markup, hidden initially.
- `client/style.css`: fixed overlay, compact modal layout, and destructive Delete action.
- `client/index.js`: pending-delete state, open/cancel/confirm handlers, focus handling, and the existing persistence path without `window.confirm()`.
- `test/panel.test.cjs`: static markup and Compact UI CSS contract.
- `test/panel-workflow.test.cjs`: fake DOM focus/keyboard support and end-to-end modal behavior.

### Task 1: Accessible Compact UI modal shell / โครง Modal ที่เข้าถึงได้และกะทัดรัด

**Files:**
- Modify: `test/panel.test.cjs`
- Modify: `client/index.html`
- Modify: `client/style.css`

**Interfaces:**
- Consumes: the existing Compact UI color, type, button, and focus-visible styles.
- Produces: `#delete-preset-modal`, `#delete-preset-modal-title`, `#delete-preset-modal-message`, `#cancel-delete-preset-button`, and `#confirm-delete-preset-button` for `client/index.js`.

- [ ] **Step 1: Write failing markup and CSS tests / เขียน test ให้ fail ก่อน**

Append to `test/panel.test.cjs`:

```js
test('panel provides an accessible hidden custom preset delete modal', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /<div\b(?=[^>]*\bid="delete-preset-modal")(?=[^>]*\brole="dialog")(?=[^>]*\baria-modal="true")(?=[^>]*\baria-labelledby="delete-preset-modal-title")(?=[^>]*\baria-describedby="delete-preset-modal-message")(?=[^>]*\bhidden)[^>]*>/);
  assert.match(html, /<h2 id="delete-preset-modal-title">Delete Custom Preset\?<\/h2>/);
  assert.match(html, /<p id="delete-preset-modal-message"><\/p>/);
  assert.match(html, /<button id="cancel-delete-preset-button"[^>]*>Cancel<\/button>/);
  assert.match(html, /<button id="confirm-delete-preset-button"[^>]*>Delete<\/button>/);
});

test('panel stylesheet defines the compact destructive modal treatment', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'style.css'), 'utf8');

  assert.match(css, /\.modal-overlay\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/);
  assert.match(css, /\.modal-overlay\[hidden\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.confirmation-modal\s*\{[^}]*max-width:\s*320px/);
  assert.match(css, /\.modal-actions\s*\{[^}]*display:\s*flex/);
  assert.match(css, /button\.destructive\s*\{[^}]*border-color:\s*#b94a4a/);
});
```

- [ ] **Step 2: Run tests and verify red / รัน test และยืนยันว่า fail**

Run:

```bash
node --test --test-name-pattern='accessible hidden custom preset delete modal|compact destructive modal treatment' test/panel.test.cjs
```

Expected: 2 failures because the modal markup and styles do not exist.

- [ ] **Step 3: Add the minimal accessible markup / เพิ่ม markup ขั้นต่ำ**

Insert before the script tags at the end of `client/index.html`:

```html
    <div id="delete-preset-modal" class="modal-overlay" role="dialog"
      aria-modal="true" aria-labelledby="delete-preset-modal-title"
      aria-describedby="delete-preset-modal-message" hidden>
      <div class="confirmation-modal">
        <h2 id="delete-preset-modal-title">Delete Custom Preset?</h2>
        <p id="delete-preset-modal-message"></p>
        <div class="modal-actions">
          <button id="cancel-delete-preset-button" class="secondary" type="button">Cancel</button>
          <button id="confirm-delete-preset-button" class="destructive" type="button">Delete</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 4: Add Compact UI modal styles / เพิ่ม style แบบ Compact UI**

Append before the existing `@media (max-width: 320px)` block in `client/style.css`:

```css
.modal-overlay {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, .66);
}

.modal-overlay[hidden] { display: none; }

.confirmation-modal {
  width: 100%;
  max-width: 320px;
  padding: 16px;
  border: 1px solid #5a5a5a;
  border-radius: 6px;
  background: #292929;
  box-shadow: 0 10px 28px rgba(0, 0, 0, .45);
}

.confirmation-modal h2 { margin-bottom: 8px; }
.confirmation-modal p { margin: 0; color: #dedede; overflow-wrap: anywhere; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

button.destructive {
  border-color: #b94a4a;
  color: #fff;
  background: #a33a3a;
}

button.destructive:not(:disabled):hover { background: #bd4545; }
```

- [ ] **Step 5: Run targeted tests and verify green / ยืนยัน test เฉพาะส่วน**

Run:

```bash
node --test --test-name-pattern='accessible hidden custom preset delete modal|compact destructive modal treatment' test/panel.test.cjs
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit the modal shell / commit โครง Modal**

```bash
git add client/index.html client/style.css test/panel.test.cjs
git commit -m "feat: add custom preset delete modal"
```

### Task 2: Safe modal interaction and persistence / การโต้ตอบและบันทึกอย่างปลอดภัย

**Files:**
- Modify: `test/panel-workflow.test.cjs`
- Modify: `client/index.js`

**Interfaces:**
- Consumes: the five modal element IDs from Task 1, `operationBusy()`, `persistCustomPresets()`, `renderCatalog()`, `activeBaseCatalog`, and `catalogSource`.
- Produces: `openDeletePresetDialog(preset, trigger)`, `closeDeletePresetDialog(restoreFocus)`, and `confirmDeletePreset()`; deletion no longer invokes `window.confirm()`.

- [ ] **Step 1: Extend the fake DOM for modal focus and keyboard events / เพิ่ม fake DOM สำหรับ focus และ keyboard**

In `FakeElement` in `test/panel-workflow.test.cjs`, replace `dispatch(type)` and add `focus()`:

```js
  dispatch(type, event) {
    if (this.listeners[type]) {
      this.listeners[type].call(this, event || { target: this });
    }
  }

  focus() {
    this.focused = true;
  }
```

Add these IDs to the `ids` array in `fakeDocument()`:

```js
    'delete-preset-modal', 'delete-preset-modal-message',
    'cancel-delete-preset-button', 'confirm-delete-preset-button'
```

Set the initial state immediately after the IDs are created:

```js
  elements['delete-preset-modal'].hidden = true;
```

- [ ] **Step 2: Replace native-confirm tests with failing modal tests / เปลี่ยน test เดิมเป็น Modal ที่ต้อง fail**

Replace the confirmed and cancelled deletion tests with:

```js
test('opens an in-panel named confirmation without native confirm', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    }
  });

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');

  assert.equal(panel.document.elements['delete-preset-modal'].hidden, false);
  assert.match(
    panel.document.elements['delete-preset-modal-message'].textContent,
    /Saved Custom/
  );
  assert.equal(panel.document.elements['cancel-delete-preset-button'].focused, true);
  assert.equal(panel.confirmMessages.length, 0);
  assert.equal(panel.writes.length, 0);
});

test('deletes a custom preset only after modal confirmation', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    }
  });

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');
  panel.document.elements['confirm-delete-preset-button'].dispatch('click');

  const customWrite = panel.writes.find(function (write) {
    return write.filePath.indexOf('social-presets-custom.json') >= 0;
  });
  assert.deepEqual(JSON.parse(customWrite.data), { schemaVersion: 1, presets: [] });
  assert.equal(panel.document.elements['delete-preset-modal'].hidden, true);
  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.match(panel.document.elements.status.textContent, /Deleted custom preset Saved Custom/);
});

test('cancels custom preset deletion without writing and restores focus', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    }
  });
  const deleteButton = panel.document.elements['preset-list'].children[1].children[3];

  deleteButton.dispatch('click');
  panel.document.elements['cancel-delete-preset-button'].dispatch('click');

  assert.equal(panel.document.elements['delete-preset-modal'].hidden, true);
  assert.equal(panel.writes.length, 0);
  assert.equal(deleteButton.focused, true);
  assert.equal(panel.document.elements['preset-list'].children.length, 2);
});

test('Escape cancels custom preset deletion without writing', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    }
  });
  let prevented = false;

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');
  panel.document.elements['delete-preset-modal'].dispatch('keydown', {
    key: 'Escape',
    preventDefault: function () { prevented = true; }
  });

  assert.equal(prevented, true);
  assert.equal(panel.document.elements['delete-preset-modal'].hidden, true);
  assert.equal(panel.writes.length, 0);
});
```

Update the write-failure test so it clicks the modal confirmation after the row Delete button:

```js
  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');
  panel.document.elements['confirm-delete-preset-button'].dispatch('click');
```

Update the operation-lock assertion to verify the modal remains hidden:

```js
  deleteButton.dispatch('click');
  assert.equal(panel.document.elements['delete-preset-modal'].hidden, true);
```

- [ ] **Step 3: Run modal workflow tests and verify red / รัน test และยืนยันว่า fail**

Run:

```bash
node --test --test-name-pattern='in-panel named confirmation|only after modal confirmation|cancels custom preset deletion|Escape cancels|keeps a custom preset|locks custom preset deletion' test/panel-workflow.test.cjs
```

Expected: failures show that the current row action still calls `window.confirm()` and no modal handlers exist.

- [ ] **Step 4: Bind modal elements and pending state / เชื่อม element และ pending state**

Add beside the existing element bindings at the top of `client/index.js`:

```js
  var deletePresetModal = document.getElementById('delete-preset-modal');
  var deletePresetModalMessage = document.getElementById('delete-preset-modal-message');
  var cancelDeletePresetButton = document.getElementById('cancel-delete-preset-button');
  var confirmDeletePresetButton = document.getElementById('confirm-delete-preset-button');
```

Add beside the existing state variables:

```js
  var pendingDeletePreset = null;
  var pendingDeleteTrigger = null;
```

- [ ] **Step 5: Replace native confirmation with modal state functions / เปลี่ยน native confirm เป็นฟังก์ชัน Modal**

Replace `deleteCustomPreset(preset)` with:

```js
  function closeDeletePresetDialog(restoreFocus) {
    var trigger = pendingDeleteTrigger;
    pendingDeletePreset = null;
    pendingDeleteTrigger = null;
    deletePresetModal.hidden = true;
    if (restoreFocus && trigger && trigger.focus) {
      trigger.focus();
    }
  }

  function openDeletePresetDialog(preset, trigger) {
    if (operationBusy()) {
      updateOperationState();
      return;
    }
    pendingDeletePreset = preset;
    pendingDeleteTrigger = trigger;
    deletePresetModalMessage.textContent =
      'Delete custom preset "' + preset.label + '"? This cannot be undone.';
    deletePresetModal.hidden = false;
    if (cancelDeletePresetButton.focus) {
      cancelDeletePresetButton.focus();
    }
  }

  function deleteCustomPreset(preset) {
    var index;
    for (index = 0; index < customPresets.length; index += 1) {
      if (customPresets[index].id === preset.id) {
        customPresets.splice(index, 1);
        if (!persistCustomPresets()) {
          customPresets.splice(index, 0, preset);
          setStatus('Could not delete the custom preset.');
          return;
        }
        renderCatalog(activeBaseCatalog, catalogSource);
        setStatus('Deleted custom preset ' + preset.label + '.');
        return;
      }
    }
  }

  function confirmDeletePreset() {
    var preset = pendingDeletePreset;
    closeDeletePresetDialog(false);
    if (preset) {
      deleteCustomPreset(preset);
    }
  }
```

Replace the row Delete listener with:

```js
        deleteButton.addEventListener('click', (function (customPreset) {
          return function () {
            openDeletePresetDialog(customPreset, this);
          };
        }(preset)));
```

- [ ] **Step 6: Bind Cancel, Delete, and Escape / เชื่อม Cancel, Delete และ Escape**

Before `initializeAccordions()` at the bottom of `client/index.js`, add:

```js
  cancelDeletePresetButton.addEventListener('click', function () {
    closeDeletePresetDialog(true);
  });
  confirmDeletePresetButton.addEventListener('click', confirmDeletePreset);
  deletePresetModal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDeletePresetDialog(true);
    }
  });
```

Do not add a click handler to `.modal-overlay`; backdrop clicks intentionally do nothing.

- [ ] **Step 7: Run targeted tests and verify green / ยืนยัน test เฉพาะส่วน**

Run:

```bash
node --test --test-name-pattern='in-panel named confirmation|only after modal confirmation|cancels custom preset deletion|Escape cancels|keeps a custom preset|locks custom preset deletion' test/panel-workflow.test.cjs
```

Expected: all selected modal, rollback, and operation-lock tests pass.

- [ ] **Step 8: Run the full verification suite / ตรวจทั้งชุด**

Run:

```bash
npm test
git diff --check
```

Expected: all tests pass with zero failures and `git diff --check` exits 0.

- [ ] **Step 9: Commit the behavior / commit พฤติกรรม**

```bash
git add client/index.js test/panel-workflow.test.cjs
git commit -m "feat: confirm custom preset deletion in panel"
```

### Task 3: Install and verify in Illustrator / ติดตั้งและทดสอบใน Illustrator

**Files:**
- Copy from: `client/index.html`, `client/style.css`, `client/index.js`
- Copy to: `~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/`

**Interfaces:**
- Consumes: verified runtime files from Tasks 1 and 2.
- Produces: a locally installed panel build for visual confirmation; no repository source changes.

- [ ] **Step 1: Copy the verified runtime files / คัดลอกไฟล์ที่ตรวจแล้ว**

```bash
cp client/index.html "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/index.html"
cp client/style.css "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/style.css"
cp client/index.js "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/index.js"
```

- [ ] **Step 2: Verify installed files match / ตรวจว่าไฟล์ตรงกัน**

```bash
cmp client/index.html "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/index.html"
cmp client/style.css "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/style.css"
cmp client/index.js "$HOME/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/index.js"
```

Expected: every `cmp` exits 0 with no output.

- [ ] **Step 3: Perform the Illustrator acceptance test / ทดสอบจริงใน Illustrator**

1. Close and reopen **Window → Extensions (Legacy) → Artboard Size Renamer**.
2. Add or locate a Custom Preset.
3. Click its **Delete** button.
4. Verify the in-panel modal names the preset and no `JavaScript Confirm` or
   `file:///` path appears.
5. Click **Cancel** and verify the preset remains.
6. Reopen the modal, press `Esc`, and verify the preset remains.
7. Reopen the modal, click the red **Delete**, and verify the preset disappears.

- [ ] **Step 4: Update the existing Draft PR / อัปเดต Draft PR**

```bash
git push
```

Expected: branch `codex/custom-preset-deletion` updates Draft PR #1 without
changing `main`.
