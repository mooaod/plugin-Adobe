# Custom Preset Deletion Implementation Plan / แผนพัฒนาการลบ Custom Preset

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal / เป้าหมาย:** Allow users to delete only their own custom presets after explicit confirmation, without changing built-in catalog presets.

**Architecture / โครงสร้าง:** `client/index.js` already owns the validated `customPresets` array and persists it separately from the catalog cache. Extend its renderer to mark custom rows and offer a Delete action only for those rows; after confirmed deletion, persist the changed custom store and re-render from `activeBaseCatalog`. `client/index.html` and `client/style.css` supply the compact row action.

**Tech Stack / เทคโนโลยี:** CEP 7, browser JavaScript, CEP filesystem API, Node.js built-in test runner.

## Global Constraints / ข้อกำหนดรวม

- Delete applies only to entries stored in `social-presets-custom.json`.
- Custom rows display a **Custom** badge beside their Delete action.
- Built-in and downloaded catalog presets never render a Delete control.
- Confirmation must name the custom preset; cancelling writes no data.
- A failed custom-store write restores memory and the rendered list.
- Catalog cache, remote update behavior, and built-in presets must remain unchanged.
- New documentation in `docs/` must be bilingual in Thai and English.

---

## File Structure / โครงสร้างไฟล์

- `client/index.html`: no new form fields; existing preset list remains the rendering target.
- `client/style.css`: styles the compact Custom badge and Delete action on a
  custom-preset row.
- `client/index.js`: determines whether a rendered preset is custom, confirms deletion, persists it, and re-renders only on success.
- `test/panel-workflow.test.cjs`: fake-panel tests for custom-only visibility, confirmation, cancellation, successful persistence, and write failure.

### Task 1: Custom-row Delete control and safe persistence / ปุ่มลบและการบันทึกอย่างปลอดภัย

**Files:**
- Modify: `client/index.js:13-32, 180-206, 510-550`
- Modify: `client/style.css:27-31`
- Test: `test/panel-workflow.test.cjs:540-660`

**Interfaces:**
- Consumes: `customPresets`, `activeBaseCatalog`, `catalogSource`, and `persistCustomPresets()`.
- Produces: `isCustomPreset(preset)`, `deleteCustomPreset(preset)`, a **Custom**
  badge, and a `button` rendered only for custom rows.
- `deleteCustomPreset(preset)` preserves state if confirmation is declined or persistence fails.

- [ ] **Step 1: Write failing tests / เขียน test ที่ต้อง fail ก่อน**

Append focused tests to `test/panel-workflow.test.cjs`:

```js
test('shows Delete only for custom presets', function () {
  const panel = runPanel({
    cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    customState: { schemaVersion: 1, presets: [{ id: 'saved', label: 'Saved', width: 321, height: 654 }] }
  });

  const builtInRow = panel.document.elements['preset-list'].children[0];
  const customRow = panel.document.elements['preset-list'].children[1];
  assert.equal(builtInRow.children.length, 2);
  assert.equal(customRow.children[2].textContent, 'Delete');
});

test('deletes a confirmed custom preset from its separate store', function () {
  const panel = runPanel({
    cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    customState: { schemaVersion: 1, presets: [{ id: 'saved', label: 'Saved', width: 321, height: 654 }] },
    confirmDelete: true
  });
  panel.document.elements['preset-list'].children[1].children[2].dispatch('click');
  const customWrite = panel.writes.find(function (write) {
    return write.filePath.indexOf('social-presets-custom.json') >= 0;
  });
  assert.deepEqual(JSON.parse(customWrite.data), { schemaVersion: 1, presets: [] });
  assert.equal(panel.document.elements['preset-list'].children.length, 1);
});

test('does not delete a custom preset when confirmation is cancelled', function () {
  const panel = runPanel({
    cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    customState: { schemaVersion: 1, presets: [{ id: 'saved', label: 'Saved', width: 321, height: 654 }] },
    confirmDelete: false
  });
  panel.document.elements['preset-list'].children[1].children[2].dispatch('click');
  assert.equal(panel.writes.length, 0);
  assert.equal(panel.document.elements['preset-list'].children.length, 2);
});
```

Extend `runPanel()` so `window.confirm(message)` records messages and returns `options.confirmDelete` when the message begins with `Delete custom preset`.

- [ ] **Step 2: Run tests to verify red / ยืนยันว่า test fail**

Run: `node --test --test-name-pattern='shows Delete|deletes a confirmed|does not delete a custom' test/panel-workflow.test.cjs`  
Expected: FAIL because custom rows have only checkbox and description; no Delete button exists.

- [ ] **Step 3: Implement the minimal row action / เขียน implementation ขั้นต่ำ**

In `client/index.js`, add these helpers before `renderCatalog()`:

```js
function isCustomPreset(preset) {
  var index;
  for (index = 0; index < customPresets.length; index += 1) {
    if (customPresets[index].id === preset.id) {
      return true;
    }
  }
  return false;
}

function deleteCustomPreset(preset) {
  var index;
  if (!window.confirm('Delete custom preset "' + preset.label + '"?')) {
    return;
  }
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
```

Inside the `renderCatalog()` loop, after appending the description, append a button only when `isCustomPreset(preset)` is true:

```js
var deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.className = 'delete-preset-button';
deleteButton.textContent = 'Delete';
deleteButton.addEventListener('click', (function (customPreset) {
  return function () { deleteCustomPreset(customPreset); };
}(preset)));
label.appendChild(deleteButton);
```

Add this style to `client/style.css` so the action does not stretch the row:

```css
.delete-preset-button { margin-left: auto; padding: 3px 7px; color: #ffb4b4; background: transparent; border: 1px solid #8a4b4b; }
.delete-preset-button:hover { background: #5a2f2f; }
```

- [ ] **Step 4: Verify targeted behavior / ยืนยันพฤติกรรมเฉพาะส่วน**

Run: `node --test --test-name-pattern='shows Delete|deletes a confirmed|does not delete a custom' test/panel-workflow.test.cjs`  
Expected: PASS. The test must show no Delete control for the catalog row, an emptied custom store after confirmed deletion, and no write after cancellation.

- [ ] **Step 5: Add the failed-write regression / เพิ่ม regression สำหรับการบันทึกล้มเหลว**

Add this test:

```js
test('keeps a custom preset when deletion cannot be persisted', function () {
  const panel = runPanel({
    cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    customState: { schemaVersion: 1, presets: [{ id: 'saved', label: 'Saved', width: 321, height: 654 }] },
    confirmDelete: true,
    customWriteError: true
  });
  panel.document.elements['preset-list'].children[1].children[2].dispatch('click');
  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  assert.match(panel.document.elements.status.textContent, /Could not delete/);
});
```

Run: `node --test --test-name-pattern='keeps a custom preset' test/panel-workflow.test.cjs`  
Expected: PASS because `deleteCustomPreset()` restores the removed in-memory item when `persistCustomPresets()` returns `false`.

- [ ] **Step 6: Verify the complete suite / รัน test ทั้งหมด**

Run: `npm test && git diff --check`  
Expected: all tests PASS and no whitespace errors.

- [ ] **Step 7: Commit / บันทึก commit**

```bash
git add client/index.js client/style.css test/panel-workflow.test.cjs
git commit -m "feat: delete custom presets safely"
```
