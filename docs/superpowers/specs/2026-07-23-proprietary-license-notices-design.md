# Proprietary License and Third-Party Notices Design

## เป้าหมาย / Goal

เพิ่มเอกสารสิทธิ์สำหรับโค้ดที่ `Moo_Ai` เป็นเจ้าของ พร้อมประกาศสิทธิ์ของ Adobe
และข้อความเครื่องหมายการค้า เพื่อให้ repository และ Signed ZXP ระบุสิทธิ์ได้
ชัดเจนก่อนแจกหรือขาย

Add clear licensing for code owned by `Moo_Ai`, Adobe third-party notices, and
trademark disclosures so both the repository and Signed ZXP communicate the
applicable rights before distribution or sale.

เอกสารนี้ออกแบบเพื่อลดความเสี่ยงและเพิ่มความชัดเจน ไม่ใช่คำปรึกษากฎหมายหรือ
การรับประกันว่าจะไม่มีข้อพิพาท

This design improves clarity and reduces risk; it is not legal advice or a
guarantee against disputes.

## ขอบเขต / Scope

### รวมในงาน / In scope

- เพิ่ม `LICENSE` สำหรับโค้ดต้นฉบับและทรัพย์สินที่ `Moo_Ai` เป็นเจ้าของ
- เพิ่ม `THIRD_PARTY_NOTICES.md` สำหรับ Adobe `client/CSInterface.js`
- เพิ่มข้อความสองภาษาเรื่องความไม่เกี่ยวข้องและเครื่องหมายการค้าใน `README.md`
- เพิ่มเอกสารทั้งสองใน release allowlist และ Signed ZXP
- เพิ่ม automated tests ป้องกันเอกสารหรือประกาศสิทธิ์หายจาก release
- สร้าง Signed ZXP และ checksum ใหม่หลังเอกสารเปลี่ยน

### ไม่รวมในงาน / Out of scope

- ระบบ license key, activation, subscription หรือ DRM
- หน้าต่างกดยอมรับ EULA ใน installer
- การยื่น Adobe Marketplace
- การจดทะเบียนลิขสิทธิ์หรือเครื่องหมายการค้า
- คำแนะนำทางกฎหมายเฉพาะประเทศหรือการรับรองจากทนาย

## แนวทางสิทธิ์ของ Moo_Ai / Moo_Ai License Model

`LICENSE` จะเป็น proprietary end-user license ไม่ใช่ open-source license:

- `Moo_Ai` สงวนลิขสิทธิ์ในโค้ดและทรัพย์สินที่สร้างขึ้นสำหรับปลั๊กอินนี้
- ผู้ที่ได้รับปลั๊กอินอย่างถูกต้องสามารถติดตั้งและใช้งานสำเนาที่ไม่ถูกแก้ไข
  เพื่อการใช้งานส่วนตัวหรือภายในธุรกิจ
- ห้ามคัดลอก ดัดแปลง สร้างงานต่อเนื่อง แจกต่อ ขายต่อ ให้เช่า ให้สิทธิ์ช่วง
  หรือเผยแพร่ source code โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจาก `Moo_Ai`
- ห้าม reverse engineer, decompile หรือพยายามค้นหา source code เท่าที่กฎหมาย
  อนุญาตให้จำกัดได้
- ห้ามลบข้อความลิขสิทธิ์หรือประกาศสิทธิ์
- สิทธิ์ของ Adobe และบุคคลที่สามไม่รวมอยู่ในการอ้างสิทธิ์ของ `Moo_Ai`
- ซอฟต์แวร์ให้ใช้งานตามสภาพจริง พร้อมข้อจำกัดการรับประกันและความรับผิดเท่าที่
  กฎหมายอนุญาต
- สิทธิ์ใช้งานสิ้นสุดเมื่อผู้ใช้ฝ่าฝืนข้อกำหนด และต้องหยุดใช้/ทำลายสำเนา

The `LICENSE` will be a proprietary end-user license, not an open-source
license:

- `Moo_Ai` retains copyright in original code and assets created for the plugin.
- A lawful recipient may install and use unmodified copies for personal or
  internal business use.
- Copying, modification, derivative works, redistribution, resale, rental,
  sublicensing, or source publication require prior written permission.
- Reverse engineering, decompilation, and source discovery are prohibited to
  the extent such restrictions are permitted by applicable law.
- Copyright and rights notices may not be removed.
- Adobe and other third-party materials are expressly excluded from Moo_Ai's
  ownership claim.
- The software is provided as-is, with warranty and liability limitations to
  the maximum extent permitted by law.
- The license terminates upon breach, requiring use to stop and copies to be
  destroyed.

## ประกาศบุคคลที่สาม / Third-Party Notice

`THIRD_PARTY_NOTICES.md` จะระบุว่า:

- `client/CSInterface.js` เป็นสำเนาที่ไม่แก้ไขจาก Adobe CEP Resources
  เวอร์ชัน 7.0.0
- ลิขสิทธิ์และสิทธิ์ทั้งหมดในไฟล์ดังกล่าวเป็นของ Adobe และผู้ให้สิทธิ์ของ Adobe
- การใช้งานอยู่ภายใต้ Adobe CEP SDK License และข้อความ license notice ภายในไฟล์
- proprietary license ของ `Moo_Ai` ไม่แทนที่ ไม่ขยาย และไม่จำกัดสิทธิ์ของ Adobe
- มีลิงก์ตรงไปยัง Adobe CEP Resources และ Adobe SDK License

`THIRD_PARTY_NOTICES.md` will identify the unmodified Adobe file, its version
and copyright owner, the governing Adobe CEP SDK License and embedded notice,
and the fact that Moo_Ai's proprietary terms do not replace Adobe's terms.

## เครื่องหมายการค้าและความไม่เกี่ยวข้อง / Trademarks and No Affiliation

เพิ่มหัวข้อสองภาษาใน `README.md` ที่ระบุว่า:

- Artboard Size Renamer เป็นผลิตภัณฑ์อิสระของ `Moo_Ai`
- ไม่เกี่ยวข้อง ไม่ได้รับการสนับสนุน และไม่ได้รับการรับรองโดย Adobe, Meta
  หรือ Google
- Adobe และ Adobe Illustrator เป็นเครื่องหมายการค้าหรือเครื่องหมายการค้า
  จดทะเบียนของ Adobe ในสหรัฐอเมริกาและ/หรือประเทศอื่น
- Instagram และ Facebook เป็นเครื่องหมายการค้าของ Meta Platforms, Inc.
- YouTube และ Google เป็นเครื่องหมายการค้าของ Google LLC
- ชื่อผลิตภัณฑ์ถูกใช้เพื่ออธิบายความเข้ากันได้และขนาดพรีเซ็ตเท่านั้น
- เครื่องหมายการค้าทั้งหมดเป็นทรัพย์สินของเจ้าของแต่ละราย

The wording will be referential only, avoid Adobe or platform logos, and avoid
any statement suggesting sponsorship, certification, partnership, or approval.

## การบรรจุ Release / Release Packaging

`release-files.txt` จะมีรายการตามลำดับดังนี้:

1. `CSXS`
2. `assets`
3. `catalog`
4. `client`
5. `host`
6. `README.md`
7. `LICENSE`
8. `THIRD_PARTY_NOTICES.md`

Release policy tests and the build script's exact allowlist must use the same
ordered list. The new legal files must be present at the ZXP root.

The existing Adobe signer, certificate, Keychain workflow, DigiCert timestamp,
signature verification, forbidden-file scan, and portable SHA-256 workflow
remain unchanged.

## การทดสอบและการยืนยัน / Testing and Verification

Automated tests will verify:

- `LICENSE` exists and identifies `Moo_Ai`, proprietary restrictions,
  third-party exclusions, applicable-law exception, warranty disclaimer, and
  termination.
- `THIRD_PARTY_NOTICES.md` identifies Adobe `CSInterface.js`, version 7.0.0,
  retained copyright/license notice, and Adobe license links.
- README contains Thai and English no-affiliation and trademark language.
- The exact release allowlist contains both legal files.
- Release fixture success still produces a portable checksum.
- Signing or verification failure still publishes nothing.

Final release checks will verify:

- full test suite and Bash syntax pass;
- the regenerated ZXP has a valid signature and timestamp;
- checksum verification passes;
- `LICENSE` and `THIRD_PARTY_NOTICES.md` exist at the archive root;
- the packaged legal files byte-match repository files;
- no certificate, password, signing tool, test, docs, or repository metadata is
  packaged.

## เกณฑ์สำเร็จ / Acceptance Criteria

- Repository และ Signed ZXP มี proprietary license และ third-party notice
  เหมือนกัน
- ผู้ใช้เห็นคำปฏิเสธความเกี่ยวข้องและข้อความเครื่องหมายการค้าสองภาษา
- Adobe notice เดิมใน `client/CSInterface.js` ไม่ถูกแก้หรือลบ
- ไม่มีข้อความที่อ้างหรือสื่อว่า Adobe, Meta หรือ Google รับรองปลั๊กอิน
- Signed ZXP ใหม่ผ่าน timestamp, signature, checksum และ package-policy checks
- ไม่มี secret หรือ signing material เข้า Git หรือ Signed ZXP
