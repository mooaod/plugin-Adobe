# Social Artboard Presets / พรีเซ็ตอาร์ตบอร์ดโซเชียล

A CEP panel for Adobe Illustrator that creates standard social-media artboards
and exports selected artboards. / แผง CEP สำหรับ Adobe Illustrator เพื่อสร้าง
อาร์ตบอร์ดขนาดมาตรฐานสำหรับโซเชียลมีเดียและส่งออกอาร์ตบอร์ดที่เลือก

## Create and export / สร้างและส่งออก

1. Select one or more presets, then choose **Create Selected Presets**. New
   artboards are placed after the existing artboards and named from the preset.
   / เลือกพรีเซ็ตอย่างน้อยหนึ่งรายการ แล้วกด **Create Selected Presets**
   ระบบจะเพิ่มอาร์ตบอร์ดต่อจากอาร์ตบอร์ดเดิมและตั้งชื่อตามพรีเซ็ต
2. Select the artboards to export, choose a destination folder and select
   **PNG**, **JPG**, or **WebP**, then choose **Export Selected**. / เลือก
   อาร์ตบอร์ดที่จะส่งออก ระบุโฟลเดอร์ปลายทาง เลือก **PNG**, **JPG** หรือ
   **WebP** แล้วกด **Export Selected**

Exports are blocked when two selected artboards would create the same sanitized
filename (including names that differ only by letter case). Rename or deselect
one of the artboards before exporting. / ระบบจะบล็อกการส่งออกเมื่ออาร์ตบอร์ด
ที่เลือกสองรายการจะสร้างชื่อไฟล์ที่ผ่านการปรับแล้วซ้ำกัน (รวมถึงชื่อที่ต่าง
กันเฉพาะตัวพิมพ์เล็ก-ใหญ่) ให้เปลี่ยนชื่อหรือยกเลิกการเลือกรายการหนึ่งก่อน
ส่งออก

## Preset updates and privacy / การอัปเดตพรีเซ็ตและความเป็นส่วนตัว

The panel starts with its bundled catalog, prefers a valid cached catalog when
one exists, and automatically checks for updates at most once per calendar day.
Use **Check Preset Updates** to check immediately at any time. If an update
cannot be reached or is invalid, the valid cached or bundled presets remain
available offline. / แผงจะเริ่มจากแคตตาล็อกที่มาพร้อมโปรแกรม และจะใช้
แคตตาล็อกที่แคชไว้หากยังถูกต้อง จากนั้นตรวจสอบการอัปเดตอัตโนมัติได้ไม่เกิน
วันละหนึ่งครั้ง กด **Check Preset Updates** เพื่อตรวจสอบทันทีได้ทุกเมื่อ
หากเข้าถึงการอัปเดตไม่ได้หรือข้อมูลไม่ถูกต้อง พรีเซ็ตที่แคชไว้หรือที่มาพร้อม
โปรแกรมซึ่งยังถูกต้องจะยังใช้งานแบบออฟไลน์ได้

For preset updates, the panel fetches only the public JSON catalog at
`https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json`.
It does not upload documents, artboards, filenames, export destinations, or
other private project data. / สำหรับการอัปเดตพรีเซ็ต แผงจะดาวน์โหลดเฉพาะ
JSON แคตตาล็อกสาธารณะที่ URL ข้างต้นเท่านั้น และจะไม่อัปโหลดเอกสาร
อาร์ตบอร์ด ชื่อไฟล์ โฟลเดอร์ส่งออก หรือข้อมูลโปรเจ็กต์ส่วนตัวอื่น ๆ

`CSInterface.js` is an unmodified copy of Adobe CEP Resources `CSInterface.js`
(v7.0.0, copyright Adobe Systems Incorporated, 2013). Its included license notice
governs use, modification, and distribution.

## Verify in Illustrator

Copy this extension directory to
`~/Library/Application Support/Adobe/CEP/extensions/ArtboardSizeRenamer`, enable
CEP debug mode, and restart Illustrator. Open **Window → Extensions → Artboard
Size Renamer** and verify square, landscape, portrait, existing-name replacement,
and no-document cases.
