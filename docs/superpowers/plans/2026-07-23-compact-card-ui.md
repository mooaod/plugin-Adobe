# Compact Card UI Implementation Plan / แผนปรับ Compact Card UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Illustrator-native compact sizing while retaining the approved Card Accordion interface and all existing plugin behavior.

**เป้าหมาย:** คืนขนาด UI ให้กะทัดรัดใกล้เคียง Panel ของ Illustrator โดยคง Card Accordion และการทำงานเดิมทั้งหมด

**Architecture:** Keep HTML, JavaScript, host scripts, and data contracts unchanged. Add a focused static CSS contract test, then reduce only typography, spacing, control, card, chevron, and semantic-status dimensions in `client/style.css`.

**สถาปัตยกรรม:** ไม่แก้ HTML, JavaScript, host script หรือ data contract เพิ่ม static test สำหรับสัญญาขนาด CSS แล้วลดเฉพาะตัวอักษร ระยะห่าง control การ์ด chevron และแถวสถานะใน `client/style.css`

**Tech Stack:** CSS3, Node.js `node:test`.

## Global Constraints

- Root font must be 13 px.
- Panel title must be 16 px.
- Accordion title must be 15 px.
- Preserve Card Accordion borders, status colours, focus indicators, responsive wrapping, and reduced-motion support.
- Preserve usability at 300 px and optimise at 360 px.
- Modify only `client/style.css` and focused stylesheet regression tests.
- Do not change HTML structure, JavaScript behavior, host scripts, catalog data, preflight classification, export requests, operation locks, or accordion state.
- UI copy remains English; developer documentation records user-facing decisions in English and Thai.

---

## File Structure / โครงสร้างไฟล์

- `client/style.css` — owns compact typography, spacing, controls, cards, responsive layout, and semantic status presentation.
- `test/panel.test.cjs` — statically protects the approved compact sizing contract without requiring Illustrator.

## Task 1: Restore compact Illustrator panel density / คืนความกะทัดรัดแบบ Panel ของ Illustrator

**Files:**
- Modify: `client/style.css:1-242`
- Modify: `test/panel.test.cjs:33-51`

**Interfaces:**
- Consumes: the existing `.panel-header`, `.header-menu`, `.panel-card`, `.accordion-trigger`, `.accordion-body`, `.check-item`, `.preflight-summary-row`, `.preflight-status-icon`, and `.preflight-status-badge` markup classes.
- Produces: a CSS-only compact sizing contract; no runtime API or workflow change.

- [ ] **Step 1: Write the failing compact stylesheet test**

Append these assertions to `panel stylesheet defines card, accordion, and semantic status treatments`:

```js
assert.match(css, /:root\s*\{[^}]*font:\s*13px\/1\.4/);
assert.match(css, /h1\s*\{[^}]*font-size:\s*16px/);
assert.match(css, /\.accordion-trigger\s*\{[^}]*padding:\s*10px\s+12px;[^}]*font-size:\s*15px/);
assert.match(css, /\.panel-card\s*\{[^}]*margin:\s*0\s+0\s+8px;[^}]*border-radius:\s*6px/);
assert.match(css, /\.preflight-summary-row\s*\{[^}]*grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\)\s+auto;[^}]*font-size:\s*13px/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/panel.test.cjs
```

Expected: FAIL because the current stylesheet uses a 16 px root font, 24 px panel title, 21 px accordion title, 12 px card gap, and 10 px card radius.

- [ ] **Step 3: Implement the compact CSS values**

Keep all selectors and behavior, but apply these exact sizing values:

```css
:root { font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
button { padding: 7px 10px; border-radius: 4px; }
select, input { padding: 7px 8px; border-radius: 4px; }
label { margin: 8px 0 4px; }
h1 { font-size: 16px; }
h2 { font-size: 14px; }
h3 { font-size: 12px; }

.panel-header { gap: 8px; padding: 10px 12px; }
.header-menu { width: 28px; min-height: 28px; padding: 1px 4px; font-size: 17px; }
.panel-card { margin: 0 0 8px; border-radius: 6px; }
.accordion-trigger { gap: 10px; padding: 10px 12px; font-size: 15px; }
.chevron { width: 8px; height: 8px; border-right-width: 2px; border-bottom-width: 2px; }
.accordion-body { padding: 0 12px 12px; }
.card-helper { margin: 5px 0 8px; }
.checklist { max-height: 150px; margin: 6px 0 10px; }
.check-item { gap: 7px; padding: 6px 4px; }
.catalog-tools { gap: 8px; margin-top: 8px; }
.custom-preset-form { margin-top: 12px; padding-top: 12px; }
.custom-preset-form button { margin-top: 8px; }
.utility-divider { margin: 14px 0 10px; }
#status { margin-top: 8px; }
.preflight-summary { margin-top: 10px; }
.preflight-summary-row {
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 8px 4px;
  font-size: 13px;
}
.preflight-status-icon { width: 22px; height: 22px; }
.preflight-status-badge { min-width: 78px; padding: 5px 8px; border-radius: 4px; }
.preflight-result { padding: 5px 7px; }
.preflight-actions { gap: 8px; margin-top: 10px; }
```

Update the existing `@media (max-width: 320px)` rule to retain compact values:

```css
@media (max-width: 320px) {
  .panel-header,
  .accordion-body { padding-left: 10px; padding-right: 10px; }
  .accordion-trigger { padding: 9px 10px; font-size: 14px; }
  .preflight-summary-row { grid-template-columns: 26px 1fr; font-size: 12px; }
}
```

Do not remove the existing responsive action stacking, catalog stacking, long-name wrapping, focus, status-colour, or reduced-motion rules.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
node --test test/panel.test.cjs
npm test
git diff --check
```

Expected: focused test and full suite PASS with zero failures; whitespace check produces no output.

- [ ] **Step 5: Install and verify in Illustrator**

1. Back up the installed `client/style.css`.
2. Copy the verified `client/style.css` into `/Users/aibd/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer/client/style.css`.
3. Close and reopen only the Artboard Size Renamer panel.
4. Verify the collapsed card headers are compact and visually close to the original UI density.
5. Expand Presets and Preflight; verify controls remain readable and vertically scrollable.
6. Resize toward 360 px and 300 px; verify no horizontal clipping and long names still wrap.

- [ ] **Step 6: Commit the compact UI**

```bash
git add client/style.css test/panel.test.cjs
git commit -m "fix: restore compact Illustrator panel sizing"
```

## Plan Review / การตรวจแผน

- Spec coverage: compact typography, spacing, controls, cards, status rows, 300 px behavior, and live Illustrator verification are covered.
- Placeholder scan: no deferred or ambiguous implementation steps remain.
- Interface consistency: the plan changes CSS values only and preserves every existing selector and runtime contract.
