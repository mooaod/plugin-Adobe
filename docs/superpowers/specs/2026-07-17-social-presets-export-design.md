# การสร้าง Artboard Social และ Export อัตโนมัติ — แบบออกแบบ

## ผลลัพธ์

ขยาย Artboard Size Renamer ให้เป็นเครื่องมือทำงาน social media ที่สร้าง
Artboard มาตรฐานและ export ไฟล์ด้วยชื่อที่คาดเดาได้ ขนาดมาตรฐานจะอัปเดตจาก
catalog JSON ที่มีเวอร์ชันบน GitHub ส่วน preset ที่ผู้ใช้สร้างเองจะเก็บในเครื่อง
และไม่ถูกเขียนทับ

## ผู้ใช้และ workflow หลัก

นักออกแบบเริ่มจาก Artboard ของแคมเปญ เปิด extension เลือกชุด preset social
แล้วสร้าง Artboard ที่มีชื่อให้โดยอัตโนมัติ จากนั้นเลือก Artboard ที่จะ export,
เลือก PNG, JPG หรือ WebP และ export โดยใช้ชื่อไฟล์ที่สอดคล้องกับแพลตฟอร์ม

## ขอบเขตงาน

- สร้าง Artboard จากชุด preset social ที่ติดมากับปลั๊กอิน:
  - Instagram Feed: 1080x1080 px
  - Instagram Portrait: 1080x1350 px
  - Instagram Story / Reel: 1080x1920 px
  - Facebook Post: 1200x630 px
  - YouTube Thumbnail: 1280x720 px
- ตั้งชื่อ Artboard ที่สร้างเป็น `<preset-slug>_<width>x<height> px`
- export Artboard ที่เลือกหรือทั้งหมดเป็น PNG, JPG หรือ WebP
- ตั้งชื่อไฟล์เป็น `<artboard-name>.<extension>` หลังแทนที่อักขระที่ใช้ในชื่อไฟล์
  ไม่ได้ และไม่เติมชื่อไฟล์ Illustrator ไว้ข้างหน้า
- เตือนก่อน export เมื่อชื่อไฟล์หลังแปลงแล้วซ้ำกัน
- เก็บ preset ที่ผู้ใช้สร้างและ catalog ที่ cache ไว้ในโฟลเดอร์ข้อมูลผู้ใช้ แยกจาก
  โฟลเดอร์ติดตั้ง extension
- มี catalog แบบ offline ติดมากับ extension
- ตรวจ catalog จาก GitHub อัตโนมัติอย่างมากวันละหนึ่งครั้งเมื่อเปิด panel
- มีปุ่ม **ตรวจสอบการอัปเดต preset** เพื่อให้ผู้ใช้ตรวจทันที
- ดาวน์โหลด catalog ผ่าน HTTPS เท่านั้น และไม่ส่ง artwork, ชื่อเอกสาร, ข้อมูล
  Artboard หรือ analytics ออกไป
- หากออฟไลน์, GitHub ใช้งานไม่ได้ หรือ catalog ที่ดาวน์โหลดมาไม่ถูกต้อง ให้ใช้
  catalog ล่าสุดที่ผ่านการตรวจสอบต่อไปโดยไม่ขัดจังหวะการสร้างหรือ export
- แสดงเวอร์ชัน catalog, แหล่งข้อมูล (bundled/cache) และวันที่อัปเดตล่าสุดใน panel

## ข้อตกลงของ GitHub catalog

URL ของ catalog จะกำหนดในจุดเดียวของ source code โดย URL เริ่มต้นเป็น GitHub
raw-content แบบ HTTPS ที่ชี้ไปยัง `social-presets.json` ซึ่งมีโครงสร้างดังนี้:

```json
{
  "schemaVersion": 1,
  "catalogVersion": "1.0.0",
  "updatedAt": "2026-07-17",
  "presets": [
    {
      "id": "instagram-feed",
      "label": "Instagram Feed",
      "width": 1080,
      "height": 1080
    }
  ]
}
```

จะปฏิเสธ catalog หาก schema version ไม่ใช่ `1`, catalog version ว่าง, preset ID
ซ้ำกัน หรือ width/height ไม่ใช่จำนวนเต็มบวก

## สิ่งที่ไม่ทำในรุ่นแรก

- ไม่จัด layout หรือย่อขยาย artwork แบบ responsive อัตโนมัติ
- ไม่มีระบบลงชื่อเข้าใช้, analytics, cloud storage, server-side code หรือ publish
  ไปยังแพลตฟอร์มโดยอัตโนมัติ
- ไม่มีการ retry เครือข่ายเองเป็นวงวน: ตรวจเฉพาะตอนเปิด panel วันละครั้ง หรือเมื่อ
  ผู้ใช้กดปุ่มตรวจสอบ
- ไม่เขียนทับไฟล์ export ที่มีอยู่โดยไม่มีการยืนยันจากผู้ใช้

## โครงสร้างระบบ

CEP browser panel รับผิดชอบการโต้ตอบ, การแสดง catalog, การเก็บค่าในเครื่อง และ
การเรียก HTTPS ส่วน ExtendScript รับผิดชอบงาน Illustrator DOM ได้แก่ การสร้าง
Artboard และ export ไฟล์ Panel ส่งเฉพาะคำสั่ง JSON ที่ผ่านการตรวจสอบแล้วไปยัง
host script และแสดงผลลัพธ์แบบมีโครงสร้าง

## การจัดการข้อผิดพลาด

- ไม่มีเอกสารเปิดอยู่: ปิดการสร้าง/export และแสดงข้อความชัดเจน
- ไม่มี preset ที่ผ่านการตรวจสอบ: ใช้ catalog bundled หรือ cache เดิม พร้อมแจ้งว่า
  เหตุใด remote update จึงถูกละเว้น
- ค่า export ไม่ถูกต้อง: ไม่เริ่ม export และระบุฟิลด์ที่ผิด
- ชื่อไฟล์ซ้ำ: แสดงชื่อที่ชนกันและให้ผู้ใช้ตัดสินใจก่อน export
- host export ล้มเหลว: รายงาน Artboard ที่ผิดพลาด และเก็บไฟล์อื่นที่ export สำเร็จไว้

## การตรวจสอบ

- Unit test ตรวจการอ่าน catalog, การปฏิเสธ ID ซ้ำ, ขนาดที่ต้องเป็นจำนวนเต็มบวก,
  การทำความสะอาดชื่อไฟล์ และการตรวจชื่อชนกัน
- Host test แบบ mock ตรวจ rect/ชื่อ Artboard ที่สร้างและอาร์กิวเมนต์ export
- Panel test ครอบคลุมการตรวจอัปเดตด้วยปุ่ม, การจำกัดวันละครั้ง, การ fallback
  เมื่อออฟไลน์ และการแสดงสถานะ update
- ทดสอบด้วย Illustrator จริง: สร้าง Artboard ครบทั้งห้าขนาด, export ทุก format,
  ยืนยันชื่อไฟล์ และตรวจว่าขณะออฟไลน์ยังใช้ catalog ที่ cache ได้

