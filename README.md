# Social Artboard Presets / พรีเซ็ตอาร์ตบอร์ดโซเชียล

A CEP panel for Adobe Illustrator that creates standard social-media artboards
and exports selected artboards. / แผง CEP สำหรับ Adobe Illustrator เพื่อสร้าง
อาร์ตบอร์ดขนาดมาตรฐานสำหรับโซเชียลมีเดียและส่งออกอาร์ตบอร์ดที่เลือก

## Create and export / สร้างและส่งออก

1. Select one or more presets, then choose **Create Selected Presets**. New
   artboards are placed after the existing artboards and named from the preset.
   / เลือกพรีเซ็ตอย่างน้อยหนึ่งรายการ แล้วกด **Create Selected Presets**
   ระบบจะเพิ่มอาร์ตบอร์ดต่อจากอาร์ตบอร์ดเดิมและตั้งชื่อตามพรีเซ็ต
2. Select the artboards to export, choose a destination folder and an available
   format, then choose **Export Selected**. The panel checks every output first.
   If files already exist, it lists all conflicts and exports nothing until you
   explicitly confirm overwriting them. / เลือกอาร์ตบอร์ดที่จะส่งออก ระบุ
   โฟลเดอร์ปลายทางและรูปแบบที่ใช้ได้ แล้วกด **Export Selected** แผงจะตรวจสอบ
   ไฟล์ผลลัพธ์ทั้งหมดก่อน หากมีไฟล์อยู่แล้ว ระบบจะแสดงรายการที่ซ้ำทั้งหมดและ
   จะยังไม่ส่งออกจนกว่าคุณจะยืนยันการเขียนทับอย่างชัดเจน

PNG and JPG remain available in Illustrator 19. WebP requires a compatible
Illustrator version and appears in the format menu only when the running host
provides WebP export support. / PNG และ JPG ยังคงใช้งานได้ใน Illustrator 19
ส่วน WebP ต้องใช้ Illustrator เวอร์ชันที่รองรับ และจะแสดงในเมนูรูปแบบเฉพาะ
เมื่อโปรแกรมที่กำลังใช้งานรองรับการส่งออก WebP เท่านั้น

Exports are blocked when two selected artboards would create the same sanitized
filename (including names that differ only by letter case). Rename or deselect
one of the artboards before exporting. / ระบบจะบล็อกการส่งออกเมื่ออาร์ตบอร์ด
ที่เลือกสองรายการจะสร้างชื่อไฟล์ที่ผ่านการปรับแล้วซ้ำกัน (รวมถึงชื่อที่ต่าง
กันเฉพาะตัวพิมพ์เล็ก-ใหญ่) ให้เปลี่ยนชื่อหรือยกเลิกการเลือกรายการหนึ่งก่อน
ส่งออก

Use **Add custom preset** to save a preset with a unique ID, label, width, and
height. Custom presets are stored separately on your computer and merged with
bundled or downloaded presets by ID, so catalog updates cannot delete them. /
ใช้ **Add custom preset** เพื่อบันทึกพรีเซ็ตด้วย ID ที่ไม่ซ้ำ ป้ายชื่อ ความกว้าง
และความสูง พรีเซ็ตที่กำหนดเองจะถูกเก็บแยกไว้ในคอมพิวเตอร์และรวมกับพรีเซ็ต
ที่มากับโปรแกรมหรือที่ดาวน์โหลดตาม ID ดังนั้นการอัปเดตแคตตาล็อกจะไม่ลบ
พรีเซ็ตเหล่านี้

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

## License, trademarks, and no affiliation / สิทธิ์ เครื่องหมายการค้า และความไม่เกี่ยวข้อง

Original Moo_Ai code and assets are proprietary and licensed under
[`LICENSE`](LICENSE). Adobe `client/CSInterface.js` is governed separately as
described in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Artboard Size Renamer is an independent Moo_Ai product and is not affiliated
with, sponsored by, or endorsed by Adobe, Meta, or Google. Adobe and Adobe
Illustrator are trademarks or registered trademarks of Adobe in the United
States and/or other countries. Instagram and Facebook are trademarks of Meta
Platforms, Inc. YouTube and Google are trademarks of Google LLC. Product names
are used only to describe compatibility and preset destinations. All trademarks
are the property of their respective owners.

โค้ดและทรัพย์สินต้นฉบับของ Moo_Ai เป็น proprietary software และอยู่ภายใต้
[`LICENSE`](LICENSE) ส่วน Adobe `client/CSInterface.js` อยู่ภายใต้ข้อกำหนด
แยกต่างหากตาม [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

Artboard Size Renamer เป็นผลิตภัณฑ์อิสระของ Moo_Ai และไม่เกี่ยวข้อง
ไม่ได้รับการสนับสนุน และไม่ได้รับการรับรองโดย Adobe, Meta หรือ Google
Adobe และ Adobe Illustrator เป็นเครื่องหมายการค้าหรือเครื่องหมายการค้า
จดทะเบียนของ Adobe ในสหรัฐอเมริกาและ/หรือประเทศอื่น Instagram และ Facebook
เป็นเครื่องหมายการค้าของ Meta Platforms, Inc. YouTube และ Google เป็น
เครื่องหมายการค้าของ Google LLC ชื่อผลิตภัณฑ์ใช้เพื่ออธิบายความเข้ากันได้
และปลายทางของพรีเซ็ตเท่านั้น เครื่องหมายการค้าทั้งหมดเป็นทรัพย์สินของ
เจ้าของแต่ละราย

## Signed ZXP installation / การติดตั้ง Signed ZXP

The signed release is `ArtboardSizeRenamer-v1.0.0-signed.zxp`. Install it with a ZXP-capable Adobe extension installer, fully quit Illustrator, then reopen Illustrator and choose **Window → Extensions → Artboard Size Renamer**. Verify the downloaded file against the accompanying `.sha256` file before installation.

ไฟล์สำหรับแจกคือ `ArtboardSizeRenamer-v1.0.0-signed.zxp` ให้ติดตั้งด้วยเครื่องมือติดตั้ง Adobe extension ที่รองรับ ZXP จากนั้นปิด Illustrator ให้หมด เปิดใหม่ แล้วไปที่ **Window → Extensions → Artboard Size Renamer** ควรตรวจสอบไฟล์ด้วย `.sha256` ที่ให้มาด้วยก่อนติดตั้ง

This direct-distribution build uses a self-signed certificate from `Moo_Ai`; it is not an Adobe Marketplace listing. / รุ่นแจกโดยตรงนี้ใช้ self-signed certificate ของ `Moo_Ai` และยังไม่ใช่รายการบน Adobe Marketplace

The Adobe signing tool accepts the certificate password only as a command-line
argument. Run the signing workflow only in a trusted local user session: the
password is briefly visible to same-user process inspection, but is never
logged or written to disk. / เครื่องมือเซ็นของ Adobe รับรหัสผ่านใบรับรองผ่าน
command line เท่านั้น จึงควรรัน workflow นี้เฉพาะใน session ของผู้ใช้ภายในเครื่อง
ที่เชื่อถือได้: ผู้ใช้คนเดียวกันอาจตรวจพบรหัสผ่านได้ชั่วคราว แต่ระบบจะไม่บันทึก
หรือเขียนรหัสผ่านลงดิสก์
