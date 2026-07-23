# Card Accordion UI — Design / แบบออกแบบ UI แบบการ์ดพับได้

## Outcome / ผลลัพธ์

Redesign the Artboard Size Renamer panel to match the approved dark card-based
reference: a compact header, rounded section cards, clear status colours, and
interactive accordion controls. All existing social-preset, preflight, rename,
and export behaviour remains unchanged.

ปรับหน้าตา Artboard Size Renamer ให้ตรงกับภาพอ้างอิงที่อนุมัติ: มีหัว panel
แบบกระชับ, การ์ดมุมโค้งสีเข้ม, สีสถานะที่อ่านง่าย และส่วนที่กดพับ/ขยายได้จริง
โดยฟังก์ชันสร้าง preset, ตรวจ preflight, เปลี่ยนชื่อ และ export เดิมต้องทำงาน
เหมือนเดิมทั้งหมด

## Visual direction / ทิศทางงานภาพ

- Use a dark Illustrator-compatible surface with subtle borders and soft
  shadows; do not mimic a web dashboard with excessive colour or decoration.
- Display the panel title **Artboard Size Renamer** in a compact top bar.
- Use section cards with a clear title and a chevron affordance.
- Preserve English UI copy for this release; design and developer documents
  remain bilingual.
- Keep the layout usable at the manifest minimum width of 300 px, with the
  approved reference optimised around 360 px wide.

## Accordion structure / โครงสร้างส่วนพับได้

The panel contains three independent accordion cards. More than one card may be
open at a time.

| Card | Default state | Purpose |
| --- | --- | --- |
| Presets | Open | Choose social sizes, create selected artboards, and add a custom preset. |
| Preflight | Open | Choose required delivery sizes, run the check, review results, create missing artboards, and rename fixable items. |
| Export | Closed | Select output settings and export selected or verified artboards. |

Each card header is keyboard accessible and toggles its own card only. The
chevron rotates to reflect expanded/collapsed state. Collapsing a card hides
its body without changing checkboxes, report data, destination, format, or any
operation state.

Panel ประกอบด้วยการ์ดพับได้อิสระ 3 ส่วน และเปิดพร้อมกันได้หลายส่วน:
Presets เปิดมาเริ่มต้น, Preflight เปิดมาเริ่มต้น, Export พับไว้เริ่มต้น การพับ
ต้องซ่อนเฉพาะเนื้อหา ไม่ล้างค่าที่ผู้ใช้เลือกหรือผลตรวจ และกดด้วยคีย์บอร์ดได้

## Presets card / การ์ด Presets

The card starts with **Required delivery sizes**, followed by the existing
social preset checklist. Each row has an appropriately sized checkbox, readable
label/dimensions, and a restrained divider between rows. The existing catalog
metadata and update control remain available but move into a small secondary
area so they do not dominate the card.

The **Create Selected Presets** button remains disabled until at least one
preset is selected. The current status message appears immediately below it.
The custom-preset form stays in this card beneath a divider and may use a
compact two-column width/height row.

## Preflight card / การ์ด Preflight

The card leads with blue helper text: **Run Preflight to verify delivery
requirements.** The existing requirement checklist stays available above the
run button. Before a run, result controls remain disabled exactly as they do
today.

After a run, render a compact status summary in this fixed order:

1. Pass — green check icon and green status treatment.
2. Rename — amber warning/edit icon and amber status treatment.
3. Missing — red close/error icon and red status treatment.
4. Duplicate — neutral gray minus icon and gray status treatment.

The left side shows the count and label; the right side uses a matching status
badge. Detailed matching artboard names remain available below the summary so
the user can act safely. **Create Missing** and **Rename Fixable** remain
separate equal-width buttons under the results and retain the existing safety
rules.

ผล Preflight ต้องเรียง ผ่าน, เปลี่ยนชื่อ, ขาด, ซ้ำ พร้อมสี/ไอคอนตามภาพอ้างอิง
และยังแสดงชื่อ Artboard ที่ตรงกันด้านล่างเพื่อให้ผู้ใช้ตรวจได้ก่อนกดแก้ไข
ปุ่มสร้างรายการที่ขาดและแก้ชื่อใช้พื้นที่เท่ากันและคงกฎความปลอดภัยเดิม

## Export card / การ์ด Export

When expanded, show the existing format selection, destination field,
artboard checklist, collision warning, normal export action, and verified
export action. The verified-export action uses the visual primary treatment;
it remains disabled until the existing preflight rules permit it. A collapsed
Export card still presents its title and chevron only.

## Accessibility and state / การเข้าถึงและสถานะ

- Accordion headers are semantic buttons with `aria-expanded` and
  `aria-controls`.
- Every visual status has text as well as colour and icon.
- Focus states remain visible against the dark background.
- Existing `aria-live` status messages, disabled states, and operation locking
  remain intact.
- No host bridge command, preflight classification, export eligibility rule,
  catalog request, or artboard mutation behaviour changes in this UI work.

## Acceptance criteria / เกณฑ์ยอมรับ

1. The panel visually follows the approved dark card reference at 360 px width.
2. Presets and Preflight begin expanded; Export begins collapsed.
3. Each accordion card can be independently expanded and collapsed using mouse
   and keyboard without losing panel state.
4. Preflight results show text, count, icon, and colour for Pass, Rename,
   Missing, and Duplicate in the specified order.
5. Existing selection, create, rename, normal export, verified export,
   collision, and operation-lock behaviour remains unchanged.
6. Automated DOM tests cover accordion state and status-summary rendering;
   existing full test suite remains green.
7. Manual Illustrator verification confirms the panel remains usable when
   docked and when the panel is shorter than its full content height.

## Out of scope / นอกขอบเขต

- No new social presets, host-side capabilities, export formats, or catalog
  protocol changes.
- The top menu icon is decorative in this iteration; it does not open a new
  settings menu.
- No change to the extension manifest geometry beyond any CSS needed to make
  the approved layout scroll correctly within the existing limits.
