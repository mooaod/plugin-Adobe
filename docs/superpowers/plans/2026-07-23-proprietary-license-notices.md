# Proprietary License and Third-Party Notices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual proprietary Moo_Ai license, Adobe third-party notices, trademark/no-affiliation disclosures, and regenerate the signed ZXP with those legal files at its root.

**Architecture:** Repository-owned legal files define Moo_Ai and Adobe rights separately. The deterministic release allowlist and its mirrored Bash validation add both legal files, while Node tests lock their wording and packaging policy. The existing external certificate, Keychain secret, Adobe signer, DigiCert timestamp, verification, and portable checksum workflow create a replacement release only after the source changes pass.

**Tech Stack:** Markdown/plain text, Bash 3.2+, Node.js test runner, Adobe ZXPSignCmd 4.1.3, macOS Keychain, DigiCert RFC 3161 timestamp, `unzip`, `cmp`, `shasum`.

## Global Constraints

- The license owner name is exactly `Moo_Ai`.
- The license is proprietary, not open source.
- Lawful recipients may install and use unmodified copies for personal or internal business use, subject to the scope obtained from Moo_Ai.
- Copying beyond installation and one archival backup, modification, derivative works, redistribution, resale, rental, sublicensing, and source publication require prior written permission from Moo_Ai.
- Reverse engineering restrictions apply only to the extent permitted by applicable law.
- Adobe and other third-party materials are excluded from Moo_Ai's ownership claim.
- `client/CSInterface.js` remains an unmodified Adobe CEP Resources v7.0.0 file with its embedded Adobe notice intact.
- English license terms control; Thai text is a convenience translation.
- State that Artboard Size Renamer is not affiliated with, sponsored by, or endorsed by Adobe, Meta, or Google.
- Use Adobe, Adobe Illustrator, Instagram, Facebook, YouTube, and Google only referentially; do not add third-party logos.
- Package only `CSXS/`, `assets/`, `catalog/`, `client/`, `host/`, `README.md`, `LICENSE`, and `THIRD_PARTY_NOTICES.md`.
- Never package `.git`, `.DS_Store`, `node_modules`, `test`, `docs`, `releases`, certificates, passwords, or signing tools.
- Preserve the existing Adobe signer, external certificate path, Keychain secret handling, DigiCert timestamp, verify-before-publish behavior, and portable checksum format.
- Final outputs remain `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp` and `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256`.
- This implementation improves licensing clarity but does not claim to be legal advice or guarantee freedom from disputes.

---

### Task 1: Add legal documents and enforce their inclusion

**Files:**
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `release-files.txt`
- Modify: `scripts/build-signed-zxp.sh`
- Modify: `test/release.test.cjs`

**Interfaces:**
- Produces: `LICENSE` and `THIRD_PARTY_NOTICES.md`, the legal documents shipped at the ZXP root.
- Produces: the exact ordered release inputs `CSXS`, `assets`, `catalog`, `client`, `host`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`.
- Consumes: the existing release fixture and deterministic package workflow.

- [ ] **Step 1: Extend the focused tests first**

In `test/release.test.cjs`, change the expected release paths to:

```js
const EXPECTED_RELEASE_PATHS = [
  'CSXS',
  'assets',
  'catalog',
  'client',
  'host',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md'
];

const RELEASE_FILE_PATHS = new Set([
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md'
]);
```

Replace the fixture setup that assumes only the last allowlist entry is a file:

```js
EXPECTED_RELEASE_PATHS.forEach((entry) => {
  const entryPath = path.join(fixtureRoot, entry);
  if (RELEASE_FILE_PATHS.has(entry)) {
    fs.writeFileSync(entryPath, `${entry} fixture\n`);
  } else {
    fs.mkdirSync(entryPath);
  }
});
```

Add these tests:

```js
test('legal documents define proprietary and third-party rights', () => {
  const license = fs.readFileSync('LICENSE', 'utf8');
  const notices = fs.readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');

  assert.match(license, /MOO_AI PROPRIETARY SOFTWARE LICENSE/);
  assert.match(license, /Copyright \(c\) 2026 Moo_Ai/);
  assert.match(license, /personal or internal business use/);
  assert.match(license, /prior written permission from Moo_Ai/);
  assert.match(license, /to the extent permitted by applicable law/);
  assert.match(license, /Third-Party Materials/);
  assert.match(license, /terminates automatically/);
  assert.match(license, /AS IS/);
  assert.match(license, /English version controls/);
  assert.match(license, /คำแปลภาษาไทย/);

  assert.match(notices, /client\/CSInterface\.js/);
  assert.match(notices, /CSInterface - v7\.0\.0/);
  assert.match(notices, /Copyright 2013 Adobe Systems Incorporated/);
  assert.match(notices, /Adobe CEP Resources/);
  assert.match(notices, /Adobe Software Development Kit License/);
  assert.match(notices, /does not replace or modify Adobe's terms/);
});

test('README disclaims affiliation and identifies trademark owners bilingually', () => {
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(readme, /not affiliated with, sponsored by, or endorsed by Adobe, Meta, or Google/);
  assert.match(readme, /ไม่เกี่ยวข้อง ไม่ได้รับการสนับสนุน และไม่ได้รับการรับรองโดย Adobe, Meta หรือ Google/);
  assert.match(readme, /Adobe and Adobe Illustrator/);
  assert.match(readme, /Instagram and Facebook/);
  assert.match(readme, /YouTube and Google/);
  assert.match(readme, /All trademarks are the property of their respective owners/);
  assert.match(readme, /เครื่องหมายการค้าทั้งหมดเป็นทรัพย์สินของเจ้าของแต่ละราย/);
});
```

Extend the release-script policy test:

```js
assert.match(script, /LICENSE/);
assert.match(script, /THIRD_PARTY_NOTICES\.md/);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test test/release.test.cjs
```

Expected: failures because `LICENSE` and `THIRD_PARTY_NOTICES.md` do not exist and the current allowlist/build script/README do not contain the approved legal entries and wording.

- [ ] **Step 3: Create the bilingual proprietary `LICENSE`**

Create `LICENSE` with this exact content:

```text
MOO_AI PROPRIETARY SOFTWARE LICENSE

Copyright (c) 2026 Moo_Ai. All rights reserved.

IMPORTANT: PLEASE READ THIS LICENSE BEFORE INSTALLING OR USING ARTBOARD SIZE
RENAMER. BY INSTALLING OR USING THE SOFTWARE, YOU AGREE TO THESE TERMS.

1. Ownership

Except for Third-Party Materials identified below, Artboard Size Renamer and
its original source code, documentation, and visual assets are owned by Moo_Ai
and protected by applicable copyright and other intellectual property laws.
No ownership rights are transferred to you.

2. Limited License Grant

If you lawfully obtained the Software from Moo_Ai or an authorized distribution
channel, Moo_Ai grants you a limited, non-exclusive, non-transferable,
revocable license to install and use unmodified copies of the Software for
personal or internal business use, only within the user, device, or organization
scope authorized when you obtained it. You may make one archival backup copy.

3. Restrictions

Unless Moo_Ai gives prior written permission, you may not:

- copy the Software except as necessary for an authorized installation and one
  archival backup;
- modify, adapt, translate, or create derivative works from the Software;
- distribute, publish, upload, share, sell, resell, rent, lease, sublicense,
  transfer, or otherwise make the Software or its source code available to
  another person or entity;
- remove or alter copyright, trademark, attribution, or proprietary notices; or
- reverse engineer, decompile, disassemble, or otherwise attempt to discover
  source code or internal methods, except to the extent permitted by applicable
  law where that right cannot lawfully be restricted.

4. Third-Party Materials

This license applies only to materials owned by Moo_Ai. Third-Party Materials,
including Adobe client/CSInterface.js, remain subject to their respective
copyright notices and license terms described in THIRD_PARTY_NOTICES.md.
Moo_Ai does not claim ownership of those materials, and this license does not
replace, expand, or restrict any third-party license.

5. Trademarks and No Affiliation

Third-party names and trademarks are used only to describe compatibility or
preset destinations. Artboard Size Renamer is an independent Moo_Ai product
and is not affiliated with, sponsored by, or endorsed by Adobe, Meta, or Google.

6. Termination

This license terminates automatically if you breach these terms. Upon
termination, you must stop using the Software and destroy all copies under your
control, except where retention is required by applicable law.

7. Disclaimer of Warranty

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE IS PROVIDED
"AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

8. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MOO_AI WILL NOT BE LIABLE
FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
DAMAGES, OR FOR LOSS OF DATA, PROFITS, REVENUE, BUSINESS, OR GOODWILL, ARISING
FROM OR RELATED TO THE SOFTWARE OR ITS USE.

9. Permissions

Requests for redistribution, modification, resale, source access, or other
rights not granted here must be submitted to Moo_Ai through the official
distribution channel and approved in writing.

10. Language

The English version controls if the English and Thai texts conflict. The Thai
text below is provided for convenience only.

คำแปลภาษาไทยเพื่อความสะดวก

ลิขสิทธิ์ (c) 2026 Moo_Ai สงวนลิขสิทธิ์

โปรดอ่านข้อกำหนดนี้ก่อนติดตั้งหรือใช้งาน Artboard Size Renamer
การติดตั้งหรือใช้งานซอฟต์แวร์ถือว่าคุณยอมรับข้อกำหนดนี้

1. ความเป็นเจ้าของ

ยกเว้นส่วนประกอบของบุคคลที่สามที่ระบุไว้ Artboard Size Renamer ตลอดจน
ซอร์สโค้ด เอกสาร และทรัพย์สินทางภาพที่สร้างขึ้นสำหรับผลิตภัณฑ์นี้เป็นของ
Moo_Ai และได้รับความคุ้มครองตามกฎหมาย ไม่มีการโอนกรรมสิทธิ์ให้แก่ผู้ใช้

2. สิทธิ์ใช้งานแบบจำกัด

ผู้ที่ได้รับซอฟต์แวร์อย่างถูกต้องจาก Moo_Ai หรือช่องทางที่ได้รับอนุญาต
มีสิทธิ์แบบจำกัด ไม่ผูกขาด โอนไม่ได้ และเพิกถอนได้ ในการติดตั้งและใช้งาน
สำเนาที่ไม่ถูกแก้ไขเพื่อการใช้งานส่วนตัวหรือภายในธุรกิจ ตามขอบเขตผู้ใช้
อุปกรณ์ หรือองค์กรที่ได้รับอนุญาตเมื่อรับซอฟต์แวร์ และทำสำเนาสำรองเพื่อ
เก็บรักษาได้หนึ่งชุด

3. ข้อจำกัด

หากไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจาก Moo_Ai ห้ามคัดลอกนอกเหนือจาก
การติดตั้งที่ได้รับอนุญาตและสำเนาสำรองหนึ่งชุด ห้ามดัดแปลง แปล สร้างงาน
ต่อเนื่อง แจก เผยแพร่ อัปโหลด แบ่งปัน ขาย ขายต่อ ให้เช่า ให้สิทธิ์ช่วง โอน
เปิดเผยซอร์สโค้ด ลบประกาศสิทธิ์ หรือทำวิศวกรรมย้อนกลับ เว้นแต่กฎหมายที่
ใช้บังคับให้สิทธิ์ดังกล่าวและไม่อนุญาตให้จำกัดสิทธิ์นั้น

4. ส่วนประกอบของบุคคลที่สาม

ข้อกำหนดนี้ใช้เฉพาะทรัพย์สินของ Moo_Ai ส่วนประกอบของบุคคลที่สาม รวมถึง
Adobe client/CSInterface.js อยู่ภายใต้ลิขสิทธิ์และข้อกำหนดของเจ้าของที่ระบุ
ใน THIRD_PARTY_NOTICES.md โดย Moo_Ai ไม่ได้อ้างกรรมสิทธิ์ในส่วนดังกล่าว

5. เครื่องหมายการค้าและความไม่เกี่ยวข้อง

ชื่อและเครื่องหมายการค้าของบุคคลที่สามใช้เพื่ออธิบายความเข้ากันได้หรือ
ปลายทางของพรีเซ็ตเท่านั้น Artboard Size Renamer เป็นผลิตภัณฑ์อิสระของ
Moo_Ai และไม่เกี่ยวข้อง ไม่ได้รับการสนับสนุน และไม่ได้รับการรับรองโดย
Adobe, Meta หรือ Google

6. การสิ้นสุดสิทธิ์

สิทธิ์ใช้งานสิ้นสุดโดยอัตโนมัติเมื่อฝ่าฝืนข้อกำหนด ผู้ใช้ต้องหยุดใช้งานและ
ทำลายสำเนาทั้งหมดที่ควบคุมอยู่ เว้นแต่กฎหมายกำหนดให้เก็บรักษา

7. การปฏิเสธการรับประกันและจำกัดความรับผิด

เท่าที่กฎหมายอนุญาต ซอฟต์แวร์ให้ใช้งานตามสภาพจริงและตามที่มีอยู่ โดยไม่มี
การรับประกันใด ๆ และ Moo_Ai ไม่รับผิดสำหรับความเสียหายทางอ้อม ความเสียหาย
พิเศษ ความเสียหายสืบเนื่อง การสูญเสียข้อมูล กำไร รายได้ ธุรกิจ หรือชื่อเสียง
ที่เกิดจากหรือเกี่ยวข้องกับซอฟต์แวร์

8. การขออนุญาต

สิทธิ์อื่นที่ไม่ได้ให้ไว้ รวมถึงการแจก ดัดแปลง ขายต่อ หรือเข้าถึงซอร์สโค้ด
ต้องขอผ่านช่องทางเผยแพร่อย่างเป็นทางการของ Moo_Ai และได้รับอนุญาตเป็น
ลายลักษณ์อักษร

หากข้อความภาษาอังกฤษและภาษาไทยขัดกัน ให้ใช้ข้อความภาษาอังกฤษเป็นหลัก
```

- [ ] **Step 4: Create Adobe third-party notices**

Create `THIRD_PARTY_NOTICES.md`:

```markdown
# Third-Party Notices / ประกาศส่วนประกอบของบุคคลที่สาม

## Adobe CSInterface

This product includes `client/CSInterface.js`, an unmodified copy of
**CSInterface - v7.0.0** from Adobe CEP Resources.

Copyright 2013 Adobe Systems Incorporated. All Rights Reserved.

The file retains Adobe's original copyright and license notice. Its use,
modification, and distribution are governed by the Adobe notice embedded in
the file and the Adobe Software Development Kit License for the Common
Extensibility Platform:

- Adobe CEP Resources:
  <https://github.com/Adobe-CEP/CEP-Resources>
- Adobe Software Development Kit License:
  <https://github.com/Adobe-CEP/CEP-Resources/blob/master/License/GenSDK_IHC-en_US-20120323_1224.pdf>

Adobe and its licensors retain all rights in this file. The Moo_Ai proprietary
license applies only to materials owned by Moo_Ai and does not replace or
modify Adobe's terms.

ผลิตภัณฑ์นี้มีไฟล์ `client/CSInterface.js` ซึ่งเป็นสำเนาที่ไม่แก้ไขของ
**CSInterface - v7.0.0** จาก Adobe CEP Resources และยังคงข้อความลิขสิทธิ์
และข้อความอนุญาตของ Adobe ไว้ครบถ้วน

ลิขสิทธิ์และสิทธิ์ในไฟล์ดังกล่าวยังเป็นของ Adobe และผู้ให้สิทธิ์ของ Adobe
การใช้งาน การแก้ไข และการแจกอยู่ภายใต้ข้อความภายในไฟล์และ Adobe Software
Development Kit License for the Common Extensibility Platform ตามลิงก์ข้างต้น
ข้อกำหนด proprietary ของ Moo_Ai ใช้เฉพาะทรัพย์สินของ Moo_Ai และไม่แทนที่
หรือเปลี่ยนแปลงข้อกำหนดของ Adobe

## Trademarks / เครื่องหมายการค้า

Adobe and Adobe Illustrator are trademarks or registered trademarks of Adobe
in the United States and/or other countries. Instagram and Facebook are
trademarks of Meta Platforms, Inc. YouTube and Google are trademarks of
Google LLC. All trademarks are the property of their respective owners.

Adobe และ Adobe Illustrator เป็นเครื่องหมายการค้าหรือเครื่องหมายการค้า
จดทะเบียนของ Adobe ในสหรัฐอเมริกาและ/หรือประเทศอื่น Instagram และ Facebook
เป็นเครื่องหมายการค้าของ Meta Platforms, Inc. YouTube และ Google เป็น
เครื่องหมายการค้าของ Google LLC เครื่องหมายการค้าทั้งหมดเป็นทรัพย์สินของ
เจ้าของแต่ละราย
```

- [ ] **Step 5: Add the bilingual README disclosure**

Append this section to `README.md` before `## Signed ZXP installation / การติดตั้ง Signed ZXP`:

```markdown
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
```

- [ ] **Step 6: Update both exact release allowlists**

Replace `release-files.txt` with:

```text
CSXS
assets
catalog
client
host
README.md
LICENSE
THIRD_PARTY_NOTICES.md
```

In `scripts/build-signed-zxp.sh`, extend the generated expected allowlist:

```bash
printf '%s\n' \
  CSXS \
  assets \
  catalog \
  client \
  host \
  README.md \
  LICENSE \
  THIRD_PARTY_NOTICES.md > "$expected_allowlist"
```

- [ ] **Step 7: Run focused and full tests**

Run:

```bash
node --test test/release.test.cjs
npm test
/bin/bash -n scripts/build-signed-zxp.sh
git diff --check
```

Expected: all 11 focused release tests pass (the existing 9 plus the two new legal tests), the full suite has 68 tests with zero failures, Bash syntax passes, and `git diff --check` prints nothing.

- [ ] **Step 8: Confirm Adobe's embedded notice is unchanged**

Run:

```bash
git diff --exit-code HEAD -- client/CSInterface.js
sed -n '1,16p' client/CSInterface.js
```

Expected: no diff; the output identifies Adobe Systems Incorporated, copyright 2013, and the embedded permission notice.

- [ ] **Step 9: Commit Task 1**

```bash
git add LICENSE THIRD_PARTY_NOTICES.md README.md release-files.txt scripts/build-signed-zxp.sh test/release.test.cjs
git commit -m "docs: add proprietary license and third-party notices"
```

### Task 2: Regenerate and verify the legally complete Signed ZXP

**Files:**
- Replace ignored artifact: `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp`
- Replace ignored artifact: `releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256`

**Interfaces:**
- Consumes: Task 1's exact eight-entry allowlist and legal documents.
- Consumes: the existing external Adobe signer, certificate, and Keychain item.
- Produces: a signed, timestamped ZXP containing both legal documents and a portable checksum.

- [ ] **Step 1: Run source verification before signing**

Run:

```bash
npm test
/bin/bash -n scripts/build-signed-zxp.sh
git diff --check
```

Expected: 68 tests pass with zero failures and both static checks exit 0.

- [ ] **Step 2: Back up the current release without overwriting it**

Run:

```bash
release_backup="$(mktemp -d /private/tmp/artboard-size-renamer-legal-release.XXXXXX)"
mv releases/ArtboardSizeRenamer-v1.0.0-signed.zxp "$release_backup/"
mv releases/ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256 "$release_backup/"
printf '%s\n' "$release_backup"
```

Expected: the two final paths are absent and the backup directory contains the previously verified release. Keep this shell session open so the same validated `release_backup` variable is used for restoration or cleanup.

- [ ] **Step 3: Build through the secure release script**

Run in the approved non-sandboxed release context:

```bash
scripts/build-signed-zxp.sh
```

Expected: signing succeeds, Adobe verification reports a valid timestamp and signature, checksum prints `OK`, and both final artifacts are published. If the command fails, move both backup files from the exact `release_backup` directory back to `releases/` and stop.

- [ ] **Step 4: Verify archive policy and legal documents**

Run:

```bash
signed_zxp="releases/ArtboardSizeRenamer-v1.0.0-signed.zxp"
unzip -t "$signed_zxp"
unzip -Z1 "$signed_zxp" | sort > /private/tmp/artboard-size-renamer-legal-contents.txt
rg -n '^(LICENSE|THIRD_PARTY_NOTICES\.md)$' /private/tmp/artboard-size-renamer-legal-contents.txt
unzip -p "$signed_zxp" LICENSE > /private/tmp/artboard-size-renamer-packaged-license.txt
unzip -p "$signed_zxp" THIRD_PARTY_NOTICES.md > /private/tmp/artboard-size-renamer-packaged-notices.md
cmp LICENSE /private/tmp/artboard-size-renamer-packaged-license.txt
cmp THIRD_PARTY_NOTICES.md /private/tmp/artboard-size-renamer-packaged-notices.md
if rg -q '(^|/)(\.DS_Store|\.git|node_modules|test|docs|releases)(/|$)|\.p12$|ZXPSignCmd|password|passwd' /private/tmp/artboard-size-renamer-legal-contents.txt; then
  printf 'Forbidden release content detected\n' >&2
  exit 1
fi
```

Expected: ZIP integrity passes; both legal filenames are listed once at the root; both `cmp` commands exit 0; forbidden-content scan exits 0.

- [ ] **Step 5: Independently verify signature, timestamp, and portable checksum**

Run in the approved non-sandboxed release context:

```bash
tool_path="/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd"
tool_hash="$(shasum -a 256 "$tool_path" | awk '{print $1}')"
test "$tool_hash" = "bc773fae0b97416fc7a462e7dadcc00270428a9913480c9b78b5606ff1cfb095"
arch -x86_64 "$tool_path" -verify releases/ArtboardSizeRenamer-v1.0.0-signed.zxp -certinfo
(
  cd releases
  shasum -a 256 -c ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256
  awk '{print $2}' ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256 | rg -x 'ArtboardSizeRenamer-v1.0.0-signed.zxp'
)
```

Expected: signer hash matches, certificate DN is `/C=TH/ST=Bangkok/O=Moo_Ai/CN=Artboard Size Renamer`, timestamp is valid, signature verification succeeds, checksum prints `OK`, and the checksum contains only the portable basename.

- [ ] **Step 6: Remove the obsolete backup only after all verification passes**

Validate and remove only the Task 2 temporary backup:

```bash
case "$release_backup" in
  /private/tmp/artboard-size-renamer-legal-release.*)
    rm -rf -- "$release_backup"
    ;;
  *)
    printf 'Refusing to remove unexpected backup path: %s\n' "$release_backup" >&2
    exit 1
    ;;
esac
```

Expected: the temporary backup is removed. The current release and checksum remain under `releases/`.

- [ ] **Step 7: Run final repository and secret checks**

Run:

```bash
npm test
git diff --check
git status --short
git ls-files '*.p12' 'ZXPSignCmd*'
secret_scan_status=0
git grep -n -E -- 'BEGIN( [A-Z0-9]+)? PRIVATE KEY|Moo_Ai Artboard Size Renamer Signing[^[:space:]]+[[:alnum:]/+=]{12,}' || secret_scan_status=$?
if [ "$secret_scan_status" -eq 0 ]; then
  printf 'Potential tracked secret detected\n' >&2
  exit 1
elif [ "$secret_scan_status" -ne 1 ]; then
  exit "$secret_scan_status"
fi
```

Expected: 68 tests pass; no tracked source diff; release artifacts remain ignored; both tracked-file listings print nothing; the wrapped secret scan exits 0 only when no private key or literal Keychain password is found.
