# สเปกไอคอน Artboard Size Renamer / Artboard Size Renamer Icon Design

## เป้าหมาย / Goal

แทนที่ไอคอนทั่วไปของ CEP extension ในรายการ Extensions ของ Adobe Illustrator ด้วยไอคอนที่สื่อถึง Artboard และการจัดการขนาดได้ชัดเจนในพื้นที่ขนาดเล็ก

Replace the generic CEP extension icon in Adobe Illustrator's Extensions list with an icon that clearly communicates artboards and size management at a small display size.

## รูปแบบที่เลือก / Selected direction

- ไอคอนแบบเส้น (monochrome line icon) สีเทาอ่อนสำหรับพื้นหลังเมนูสีเข้มของ Illustrator
- กรอบ Artboard สี่เหลี่ยมพร้อมจุดมุมแบบเรียบง่าย
- ลูกศรวัดขนาดแนวนอนและแนวตั้งอยู่ภายในกรอบ เพื่อสื่อ `W × H`
- ไม่มีตัวอักษรภายในไอคอน เพื่อคงความชัดเจนที่ขนาด 16 × 16 px

## ทางเทคนิค / Technical delivery

- เก็บ SVG เป็นไฟล์ต้นฉบับที่แก้ไขได้ใน `assets/`
- สร้าง PNG ขนาด 16 × 16 px สำหรับรายการเมนู CEP และ PNG ความละเอียดสูงสำหรับความคมชัดบนจอ Retina
- เพิ่มการอ้างอิงไอคอนใน CEP manifest ตามรูปแบบที่ Illustrator รองรับ
- ติดตั้ง bundle ที่อัปเดตไปยัง `~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer`

## ขอบเขต / Scope

ทำเฉพาะไอคอนสำหรับรายการ extension ไม่เปลี่ยนหน้าตา Panel หรือฟังก์ชันการตั้งชื่อ/สร้าง/ส่งออก Artboard

Only the extension-list icon changes. The panel UI and artboard rename/create/export behavior remain unchanged.

## การตรวจสอบ / Verification

- ตรวจสอบว่า manifest อ้างถึงไฟล์ไอคอนที่มีอยู่จริง
- ตรวจสอบมิติและชนิดไฟล์ PNG
- รันทดสอบโปรเจกต์เดิม
- ให้ผู้ใช้ปิด Illustrator แบบ `Cmd + Q` แล้วเปิดใหม่เพื่อตรวจสอบไอคอนจริง
