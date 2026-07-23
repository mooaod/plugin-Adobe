# Compact Card UI Design / สเปก Compact Card UI

## Summary / สรุป

Reduce the Card Accordion interface to Illustrator-native panel density while
preserving the approved visual hierarchy, accordion structure, and every
existing workflow.

ลดขนาด Card Accordion ให้มีความหนาแน่นใกล้เคียง Panel มาตรฐานของ Illustrator
โดยคงลำดับชั้นทางภาพ โครงสร้าง Accordion และการทำงานเดิมทั้งหมด

## Root Cause / สาเหตุ

The redesign increased the root font from 13 px to 16 px, the panel title to
24 px, accordion titles to 21 px, and expanded most padding values. In a CEP
panel on a Retina display, that density appears materially larger than the
original interface and consumes excessive vertical space.

งานออกแบบรอบก่อนเพิ่มตัวอักษรพื้นฐานจาก 13 px เป็น 16 px เพิ่มชื่อ Panel เป็น
24 px หัวข้อ Accordion เป็น 21 px และเพิ่ม padding หลายตำแหน่ง เมื่อแสดงใน CEP
บนจอ Retina จึงดูใหญ่กว่า UI เดิมและใช้พื้นที่แนวตั้งมากเกินไป

## Approved Direction / แนวทางที่อนุมัติ

Use the existing Card Accordion UI with compact Illustrator-native sizing:

- Root font: 13 px.
- Panel title: 16 px.
- Accordion title: 15 px.
- Compact buttons, inputs, checklist rows, status rows, icons, badges, and
  vertical spacing.
- Card borders, status colours, focus indicators, responsive wrapping, and
  reduced-motion support remain.
- The panel remains usable at 300 px and optimised at 360 px.

ใช้ Card Accordion เดิม แต่ปรับเป็นขนาดกะทัดรัดแบบ Panel ของ Illustrator:

- ตัวอักษรพื้นฐาน 13 px
- ชื่อ Panel 16 px
- หัวข้อ Accordion 15 px
- ลดขนาดปุ่ม ช่องกรอก รายการเลือก แถวสถานะ ไอคอน badge และช่องว่างแนวตั้ง
- คงขอบการ์ด สีสถานะ focus indicator การตัดคำ responsive และ reduced motion
- ใช้งานได้ที่ความกว้าง 300 px และเหมาะที่สุดที่ 360 px

## Scope / ขอบเขต

Modify only `client/style.css` and focused stylesheet regression tests.
Do not change HTML structure, JavaScript behavior, host scripts, catalog data,
preflight classification, export requests, operation locks, or accordion
state.

แก้เฉพาะ `client/style.css` และ regression test ของ stylesheet ห้ามเปลี่ยน
โครงสร้าง HTML พฤติกรรม JavaScript host script ข้อมูล catalog การจำแนก
Preflight คำขอ Export operation lock หรือสถานะ Accordion

## Verification / การตรวจสอบ

- Automated tests protect the compact font and spacing contract.
- The full existing test suite must remain green.
- Install the CSS into the CEP extension and reopen the panel.
- Verify collapsed and expanded cards at approximately 360 px and 300 px.
- Confirm controls remain reachable with vertical scrolling and long dynamic
  names continue to wrap.

- ใช้ automated test ป้องกันค่าขนาดตัวอักษรและระยะห่างแบบ Compact
- ชุดทดสอบเดิมทั้งหมดต้องผ่าน
- ติดตั้ง CSS ลง CEP extension แล้วเปิด Panel ใหม่
- ตรวจการ์ดทั้งตอนพับและขยายที่ประมาณ 360 px และ 300 px
- ตรวจว่าปุ่มทั้งหมดเข้าถึงได้ด้วยการเลื่อนแนวตั้งและชื่อยาวยังตัดคำได้
