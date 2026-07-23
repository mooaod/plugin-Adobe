# สเปก Signed ZXP / Signed ZXP Design

## เป้าหมาย / Goal

สร้างแพ็กเกจ `ArtboardSizeRenamer-v1.0.0-signed.zxp` สำหรับแจกโดยตรง โดยใช้เครื่องมือ `ZXPSignCmd` ของ Adobe และ self-signed certificate ที่ไม่เสียค่าใช้จ่าย

Create `ArtboardSizeRenamer-v1.0.0-signed.zxp` for direct distribution using Adobe `ZXPSignCmd` and a free self-signed certificate.

## ข้อมูล Certificate / Certificate identity

- Country: `TH`
- State/Province: `Bangkok`
- Organization: `Moo_Ai`
- Common Name: `Artboard Size Renamer`

## การเก็บความลับ / Secret storage

- สร้างรหัสผ่านแบบสุ่มที่มีความแข็งแรงสูง
- เก็บรหัสผ่านใน macOS Keychain ภายใต้ service name เฉพาะของ `Moo_Ai Artboard Size Renamer Signing`
- เก็บไฟล์ `.p12` นอก repository ที่ `~/Library/Application Support/Moo_Ai/Signing/`
- ห้ามพิมพ์รหัสผ่านลง log, เอกสาร, Git commit, command output หรือไฟล์ release
- ห้ามเพิ่ม `.p12`, certificate password หรือ signing tool binary ลง Git

## เครื่องมือ / Tooling

- ดาวน์โหลด `ZXPSignCmd` จาก repository ทางการของ Adobe CEP
- เก็บเครื่องมือไว้นอก repository ใต้ `~/Library/Application Support/Moo_Ai/ZXPSignCmd/`
- ตรวจสอบว่า binary เรียกใช้งานได้ก่อนสร้าง certificate หรือ release

## โครงสร้างแพ็กเกจ / Package contents

แพ็กเฉพาะรายการต่อไปนี้จาก source tree:

- `CSXS/`
- `assets/`
- `catalog/`
- `client/`
- `host/`
- `README.md`

ZXP ต้องไม่รวม `.git`, `.DS_Store`, `node_modules`, `test`, `docs`, `releases`, certificate, password หรือ signing tool

## ขั้นตอนเซ็น / Signing flow

1. รัน test suite ของโปรเจกต์
2. สร้าง staging directory จาก allowlist ข้างต้น
3. สร้างหรือใช้ self-signed certificate ของ `Moo_Ai`
4. ดึงรหัส certificate จาก macOS Keychain โดยไม่แสดงค่า
5. ใช้ `ZXPSignCmd` สร้าง ZXP พร้อม timestamp
6. หาก timestamp หรือการเซ็นล้มเหลว ให้หยุดและไม่เผยแพร่ไฟล์ผลลัพธ์
7. ตรวจ signature ด้วย `ZXPSignCmd -verify`
8. ตรวจโครงสร้างและรายการไฟล์ใน ZXP
9. สร้างไฟล์ SHA-256

## ผลลัพธ์ / Deliverables

- `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp`
- `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256`
- คู่มือสั้นสำหรับติดตั้ง Signed ZXP และข้อจำกัดของ self-signed certificate

## เกณฑ์ผ่าน / Acceptance criteria

- `npm test` ผ่านทั้งหมด
- `ZXPSignCmd -verify` ยืนยันว่า signature ถูกต้อง
- ZXP มีเฉพาะไฟล์จาก allowlist
- SHA-256 verification ผ่าน
- ไม่มี certificate หรือ secret อยู่ใน repository และ release artifacts
- การสร้าง Signed ZXP ไม่มีค่าใช้จ่ายจาก certificate หรือเครื่องมือ

## ขอบเขตที่ไม่ทำ / Non-goals

- ไม่ซื้อ commercial certificate
- ไม่ส่งขึ้น Adobe Marketplace ในรอบนี้
- ไม่สร้าง GitHub Actions signing workflow
- ไม่รับประกันพฤติกรรมของ third-party ZXP installers ทุกตัว
