# ลบ Custom Preset — แบบออกแบบ / Custom Preset Deletion — Design

## ผลลัพธ์ / Outcome

ผู้ใช้ลบได้เฉพาะ preset ที่เพิ่มเองจาก panel โดย preset มาตรฐานจาก catalog
จะไม่แสดงปุ่มลบและยังคงอยู่หลังการอัปเดต catalog เสมอ

Users can delete only presets they added in the panel. Built-in catalog presets
never show a delete control and remain available after catalog updates.

## ขอบเขต / Scope

- แสดงปุ่ม **Delete / ลบ** เฉพาะแถวของ Custom Preset
- เมื่อกดปุ่ม ให้ถามยืนยันด้วยชื่อ preset ก่อนลบ
- เมื่อตอบยืนยัน ให้ลบ preset จากไฟล์ `social-presets-custom.json` ในพื้นที่ข้อมูล
  ผู้ใช้ แล้วแสดงรายการใหม่ทันที
- เมื่อตอบยกเลิก หรือบันทึกไฟล์ไม่สำเร็จ ให้ไม่เปลี่ยนรายการ
- ไม่เพิ่มความสามารถลบ ซ่อน หรือแก้ไข preset มาตรฐานในงานนี้

- Show a **Delete / ลบ** button only on Custom Preset rows.
- Clicking it asks for confirmation naming the preset.
- After confirmation, remove the preset from `social-presets-custom.json` in the
  user-data area and immediately re-render the list.
- Cancelling or a failed write leaves the list unchanged.
- This work does not add deletion, hiding, or editing for built-in presets.

## รูปแบบหน้าจอและข้อมูล / UI and Data Flow

`renderCatalog()` จะรู้ว่ารายการใดเป็น custom จาก custom-preset store ที่อ่าน
และตรวจสอบแล้ว จึงสร้างปุ่ม Delete บนแถวนั้นเท่านั้น ปุ่มจะเรียก
`window.confirm()` ก่อนแก้ไข array ในหน่วยความจำ จากนั้นบันทึกด้วย
`persistCustomPresets()` หากเขียนสำเร็จเท่านั้นจึง render catalog ใหม่

`renderCatalog()` identifies custom rows from the validated custom-preset store
and renders a Delete button only for those rows. The button calls
`window.confirm()` before mutating the in-memory array, then persists via
`persistCustomPresets()`. The catalog re-renders only after a successful write.

## ข้อผิดพลาดและความปลอดภัย / Errors and Safety

- ข้อความยืนยันต้องระบุชื่อ preset ที่กำลังจะลบ
- ถ้ายกเลิก จะไม่เขียนไฟล์และรายการยังเหมือนเดิม
- ถ้าบันทึกไม่สำเร็จ ให้คืนค่าในหน่วยความจำและแจ้งผู้ใช้
- การลบต้องไม่กระทบ catalog cache หรือการอัปเดตจาก GitHub

- The confirmation message names the preset being deleted.
- Cancelling performs no file write and preserves the rendered list.
- A failed write restores in-memory state and reports the error.
- Deletion must not change the catalog cache or GitHub update behavior.

## การตรวจสอบ / Verification

- Panel tests พิสูจน์ว่าปุ่มลบปรากฏเฉพาะ custom preset
- ยืนยันการลบแล้วไฟล์ custom store และรายการ UI อัปเดต
- ยกเลิกและบันทึกล้มเหลวต้องไม่ลบข้อมูล
- รัน `npm test` ทั้งชุดหลังการเปลี่ยนแปลง

- Panel tests prove Delete appears only on custom presets.
- Confirmed deletion updates the custom store and UI list.
- Cancellation and failed persistence cannot remove data.
- Run the complete `npm test` suite after the change.
