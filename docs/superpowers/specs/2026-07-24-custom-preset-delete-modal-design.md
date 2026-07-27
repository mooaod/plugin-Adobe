# Modal ยืนยันการลบ Custom Preset — แบบออกแบบ / Custom Preset Delete Confirmation Modal — Design

## ผลลัพธ์ / Outcome

เมื่อผู้ใช้กด **Delete** บน Custom Preset ปลั๊กอินจะแสดงกล่องยืนยันภายใน
Artboard Size Renamer แทนหน้าต่าง `JavaScript Confirm` ของ CEP จึงไม่แสดง
พาธ `file:///.../index.html` และมีหน้าตาสอดคล้องกับ Compact UI

When a user clicks **Delete** on a Custom Preset, the plugin shows an in-panel
confirmation modal instead of CEP's native `JavaScript Confirm`. The modal does
not expose the `file:///.../index.html` path and matches the Compact UI.

## แนวทางที่พิจารณา / Considered Approaches

1. **Modal ภายใน panel ด้วย `div role="dialog"` — เลือกใช้ / Selected.**
   รองรับ Chromium รุ่นเก่าของ CEP ควบคุมหน้าตาและ keyboard behavior ได้ และ
   ทดสอบผ่าน fake DOM เดิมได้
2. ใช้ HTML `<dialog>` — ไม่เลือก เพราะ CEP รุ่นเก่าอาจไม่มี native dialog API
   ที่สม่ำเสมอ
3. ใช้ `window.confirm()` ต่อ — ไม่เลือก เพราะแสดง URL ภายในและปรับหน้าตาไม่ได้

1. **In-panel `div role="dialog"` modal — selected.** It is compatible with
   older CEP Chromium versions, fully styleable, keyboard accessible, and
   testable with the existing fake DOM.
2. Native HTML `<dialog>` — rejected because older CEP runtimes may not provide
   consistent dialog support.
3. Keep `window.confirm()` — rejected because it exposes the internal URL and
   cannot match the panel UI.

## โครงสร้างหน้าจอ / UI Structure

- เพิ่ม overlay แบบ fixed ครอบพื้นที่ panel และซ่อนไว้ตอนเริ่มต้น
- กล่องมีหัวข้อ **Delete Custom Preset?**
- ข้อความระบุชื่อ preset ที่กำลังจะลบ
- ปุ่ม **Cancel** เป็นตัวเลือกที่ปลอดภัยและได้รับ focus ตอนเปิด
- ปุ่ม **Delete** ใช้สีแดงเพื่อสื่อว่าเป็น destructive action
- กด `Esc` เท่ากับยกเลิก
- ไม่ปิด dialog เมื่อคลิกพื้นหลัง เพื่อป้องกันการตัดสินใจโดยไม่ตั้งใจ
- ใช้ `role="dialog"`, `aria-modal="true"`, `aria-labelledby` และ
  `aria-describedby`

- Add a fixed overlay over the panel, hidden by default.
- The modal title is **Delete Custom Preset?**
- The message names the preset that will be deleted.
- **Cancel** is the safe default and receives focus when the modal opens.
- **Delete** uses the destructive red treatment.
- `Esc` cancels the operation.
- Clicking the backdrop does not dismiss the modal, avoiding ambiguous input.
- Use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and
  `aria-describedby`.

## การไหลของข้อมูล / Data Flow

`openDeletePresetDialog(preset, trigger)` เก็บ preset ที่รอยืนยัน แสดง modal
และย้าย focus ไปที่ Cancel การยกเลิกจะล้าง pending state, ซ่อน modal และคืน
focus ไปยังปุ่ม Delete เดิม

เมื่อผู้ใช้ยืนยัน `confirmDeletePreset()` จะปิด modal แล้วเรียกขั้นตอนลบและ
บันทึกเดิม ขั้นตอนนี้ยังคงลบเฉพาะ `customPresets`, เขียน
`social-presets-custom.json`, rollback เมื่อเขียนไม่สำเร็จ และ render ใหม่เมื่อ
เขียนสำเร็จเท่านั้น

`openDeletePresetDialog(preset, trigger)` stores the pending preset, reveals the
modal, and moves focus to Cancel. Cancellation clears the pending state, hides
the modal, and restores focus to the original Delete button.

On confirmation, `confirmDeletePreset()` closes the modal and invokes the
existing deletion/persistence path. It still changes only `customPresets`,
writes `social-presets-custom.json`, rolls back after a failed write, and
re-renders only after a successful write.

## สถานะและความปลอดภัย / State and Safety

- เปิด modal ได้ครั้งละหนึ่ง preset เท่านั้น
- ขณะ modal เปิด ปุ่มยืนยันต้องอ้างถึง pending preset เดียวกับชื่อที่แสดง
- เมื่อ host operation กำลังทำงาน ปุ่ม Delete บนแถวยังคง disabled เหมือนเดิม
- การยกเลิกและ `Esc` ต้องไม่เขียนไฟล์
- หลังยืนยันแล้ว pending state ต้องถูกล้างก่อนเริ่มบันทึก
- หาก preset หายไปก่อนยืนยัน ให้ไม่เขียนไฟล์และปิด modal อย่างปลอดภัย
- การยืนยัน overwrite ตอน Export ยังใช้ workflow เดิมและอยู่นอกขอบเขตงานนี้

- Only one preset can be pending at a time.
- While open, the confirmation action must target the same pending preset named
  in the message.
- Row Delete buttons remain disabled during host operations.
- Cancel and `Esc` perform no file write.
- Pending state is cleared before persistence begins.
- If the preset no longer exists at confirmation time, close safely without a
  write.
- Export overwrite confirmation remains unchanged and is outside this scope.

## การตรวจสอบ / Verification

- Markup test ตรวจ accessibility attributes, ข้อความ และสถานะเริ่มต้นที่ซ่อน
- Workflow test ตรวจว่าคลิก Delete เปิด modal พร้อมชื่อ preset โดยไม่เรียก
  `window.confirm()`
- Workflow test ตรวจ Cancel และ `Esc` ว่าไม่เขียนไฟล์และปิด modal
- Workflow test ตรวจ Delete ว่าบันทึก custom store และ render รายการใหม่
- Regression test เดิมสำหรับ write failure และ operation lock ต้องยังผ่าน
- รัน `npm test` และ `git diff --check`
- ทดสอบจริงใน Illustrator ว่าไม่ปรากฏหน้าต่าง `JavaScript Confirm` หรือพาธไฟล์

- A markup test verifies accessibility attributes, copy, and the initial hidden
  state.
- A workflow test verifies that clicking Delete opens the named modal without
  calling `window.confirm()`.
- Workflow tests verify that Cancel and `Esc` close without writing.
- A workflow test verifies that Delete persists the custom store and re-renders.
- Existing write-failure and operation-lock regression tests remain green.
- Run `npm test` and `git diff --check`.
- Verify in Illustrator that no `JavaScript Confirm` window or file path appears.

## ไม่รวมในงานนี้ / Non-goals

- ไม่เปลี่ยน dialog ยืนยัน overwrite ของ Export
- ไม่เพิ่ม undo หลังลบ
- ไม่เพิ่มการลบ preset มาตรฐานหรือ remote preset
- ไม่เปลี่ยน schema หรือที่เก็บข้อมูล

- Do not replace the Export overwrite confirmation.
- Do not add deletion undo.
- Do not allow deletion of built-in or remote presets.
- Do not change the schema or storage location.
