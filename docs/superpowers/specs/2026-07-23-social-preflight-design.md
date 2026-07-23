# Social Media Preflight — Design / ระบบตรวจงาน Social Media

## Outcome / ผลลัพธ์

Add a rule-first **Preflight** section to Artboard Size Renamer. A designer
selects the social presets required for a delivery, runs a check, then sees
which required artboards pass, need renaming, are missing, or are duplicated.
The panel can create missing artboards, rename artboards that have the correct
size, and export only the verified set.

เพิ่มส่วน **Preflight** แบบตรวจตามกติกาให้กับ Artboard Size Renamer นักออกแบบ
เลือก preset social ที่ต้องส่งในงาน กดตรวจ แล้วเห็นว่า Artboard ใดผ่าน,
ต้องเปลี่ยนชื่อ, ขาด หรือซ้ำกัน จากนั้น panel สามารถสร้าง Artboard ที่ขาด,
เปลี่ยนชื่อรายการที่ขนาดถูกต้อง และ export เฉพาะชุดที่ผ่านการตรวจได้

## Users and primary workflow / ผู้ใช้และขั้นตอนหลัก

The first release serves a designer preparing a social-media campaign in an
open Illustrator document. They choose the required platform sizes in the
Preflight section and select **Run Preflight**. The panel compares the current
artboards with the selected presets by exact pixel dimensions and the existing
canonical preset name:

`<preset-id>_<width>x<height> px`

รุ่นแรกใช้กับนักออกแบบที่กำลังเตรียมงาน social media ในเอกสาร Illustrator
ที่เปิดอยู่ ผู้ใช้เลือกขนาดแพลตฟอร์มที่จำเป็นในส่วน Preflight แล้วกด
**Run Preflight** ระบบเปรียบเทียบ Artboard ปัจจุบันกับ preset ที่เลือก โดยใช้
ขนาดพิกเซลตรงตัวและชื่อมาตรฐานข้างต้น

The result contains four statuses:

- **Pass / ผ่าน** — exactly one artboard has the required size and canonical name.
- **Rename / เปลี่ยนชื่อ** — exactly one artboard has the required size but a different name.
- **Missing / ขาด** — no artboard has the required size.
- **Duplicate / ซ้ำ** — more than one artboard has the required size. A duplicate is
  never automatically renamed or exported as verified because the intended one
  cannot be known safely.

The designer may select **Create Missing** to add all missing presets using the
existing artboard-creation host function, then run Preflight again. They may
select **Rename Fixable** to rename every Rename result to its canonical name,
then run Preflight again. Once there are no Missing or Duplicate results,
**Export Verified Set** exports the passing artboards using the existing format
and destination choices. Existing filename-collision and overwrite protections
remain in effect.

## Scope / ขอบเขต

Included:

- A Preflight section below the preset creation section and above Export.
- Independent preset checkboxes for the required delivery set; none are
  selected on panel startup.
- A deterministic, pure preflight model that classifies selected presets from
  preset id, dimensions, and listed artboards.
- Status summary: number passed, renameable, missing, and duplicate.
- Per-result list that names the required preset and the matching artboard(s).
- **Create Missing**, **Rename Fixable**, and **Export Verified Set** actions.
- Host-side support for renaming selected artboards by index, with structured
  success and failure results.
- Tests for the model, panel workflow, and host rename behaviour.

Included in Thai: ส่วน Preflight, checkbox เลือกชุดงานที่ต้องส่ง,
สถานะผลตรวจ, ปุ่มสร้างรายการที่ขาด, ปุ่มแก้ชื่อ และปุ่ม export เฉพาะชุดผ่านตรวจ
พร้อม test ครอบคลุมกติกาธุรกิจและการเรียก Illustrator

Not included:

- Custom reusable preflight profiles, project manifests, or brand kits.
- Image-content checks such as logo presence, safe zones, font licensing,
  text accuracy, colour profile, or AI visual analysis.
- Automatic layout resizing, object copying, or deletion of duplicate artboards.
- Cloud storage, sign-in, analytics, or uploading document content.

## Architecture / โครงสร้างระบบ

`client/preflight-model.js` is a browser-compatible pure module. It receives
`presets` and `artboards` and returns an ordered report:

```js
{
  summary: { pass: 1, rename: 1, missing: 1, duplicate: 1 },
  results: [{
    preset: { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 },
    status: 'pass' | 'rename' | 'missing' | 'duplicate',
    artboards: [{ index: 0, name: '...', width: 1080, height: 1080 }]
  }]
}
```

`client/index.js` owns DOM rendering and gathers selected requirement presets.
It reads current artboards via the existing `listArtboards(app)` bridge,
executes the pure model, and enables actions only when their results make them
safe. It constructs JSON-only bridge commands using the existing quoting
pattern.

`host/social-workflow.jsx` adds `renameArtboards(application, changes)`. Each
change has an artboard index and a target name. The host validates the active
document, validates every index/name before changing anything, renames in
ascending index order, and returns structured JSON. It does not delete,
resize, or move any artboard.

## UI and state / หน้าตาและสถานะ

The panel keeps the existing preset selection for creating artboards separate
from the new required-delivery selection. Opening the panel must leave every
checkbox unchecked. Preflight controls are disabled until the host script and
catalog are ready and at least one required preset is selected.

When results are stale because required preset selection changes, creation,
rename, or artboard refresh occurs, the panel clears the report and disables
Export Verified Set. It does not infer that an earlier report is still valid.

Status copy is concise and bilingual-facing UI remains English in this release,
matching the current panel. The design document remains bilingual by the
project convention.

## Error handling and safety / ความผิดพลาดและความปลอดภัย

- With no open Illustrator document, display the host error and do not show a
  passing report.
- With no required preset selected, explain that at least one size must be
  selected and perform no host operation.
- If a requested rename fails, show the returned error, refresh artboards, and
  rerun no automatic follow-up action.
- If creating a missing artboard partially fails, preserve any artboards that
  Illustrator created, report the error, refresh the list, and require another
  manual Preflight run.
- Duplicate artboards remain a warning requiring user resolution. No action
  selects one automatically.
- Export Verified Set reuses the existing filename collision and overwrite
  confirmation flow; it must not overwrite without confirmation.
- No artwork, document name, export destination, results, or analytics leave
  the local computer.

## Acceptance criteria / เกณฑ์ยอมรับ

1. The panel starts with no required preset checked.
2. Selecting one or more required presets and running Preflight classifies each
   selected preset using the four specified statuses.
3. Exact canonical names pass; a same-size artboard with another name is
   renameable; no same-size artboard is missing; multiple same-size artboards
   are duplicate.
4. Create Missing creates only Missing presets and refreshes the report state.
5. Rename Fixable renames only a single same-size candidate for each Rename
   result and refreshes the report state.
6. Export Verified Set is enabled only with no Missing or Duplicate result and
   exports only the Pass artboards using the selected format and destination.
7. Existing automatic naming, normal export, custom presets, catalog updates,
   collision detection, and overwrite confirmation continue to work.
8. Node tests cover all acceptance criteria that do not require a live
   Illustrator host. Manual verification covers the live host actions.

## Manual verification / การตรวจด้วย Illustrator จริง

1. Open a document with one correctly named Instagram Feed artboard, one
   differently named Instagram Portrait artboard, and no Story artboard.
2. Select those three requirements and run Preflight. Confirm Pass, Rename, and
   Missing appear respectively.
3. Select Create Missing, then run Preflight again. Confirm Story becomes Pass.
4. Select Rename Fixable, then run Preflight again. Confirm Portrait becomes
   Pass and its name is canonical.
5. Add a second 1080 × 1080 artboard, run again, and confirm Duplicate appears
   and Export Verified Set is disabled.
6. Remove or resize the duplicate, rerun, choose an export destination and
   format, then confirm Export Verified Set exports only the passing required
   artboards.
