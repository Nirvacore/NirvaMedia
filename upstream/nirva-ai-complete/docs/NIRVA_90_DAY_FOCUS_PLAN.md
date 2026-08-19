# 🎯 Nirva 90-Day Focus Plan

> **หลักการเดียวของเอกสารนี้:** 90 วันข้างหน้า Nirva ทำ**สิ่งเดียว**ให้ชนะ — ที่เหลือทั้งหมดใน [Constitution](NIRVA_CONSTITUTION.md) และ [Roadmap](NIRVA_PLATFORM_ROADMAP.md) ยังอยู่ครบ แค่**รอคิว**
>
> ที่มา: บทวิเคราะห์อุปสรรคสู่ระดับโลก — ศัตรูหมายเลขหนึ่งคือการทำทุกอย่างพร้อมกัน

---

## The Wedge (สิ่งเดียวที่เลือก)

**Nirva Studio OS สำหรับครีเอเตอร์และ SME ไทย**

> จับไอเดียด้วยเสียง → AI แปลงเป็นคอนเทนต์ → โพสต์ขึ้นแพลตฟอร์มจริง — จบในที่เดียว เป็นภาษาไทยที่เข้าใจคนไทย

### ทำไม wedge นี้

| เหตุผล | หลักฐาน |
|--------|---------|
| ของมีอยู่แล้ว 70% | Prototype 8 หน้า + NLE + NMD + Telegram connector ทำงานจริงแล้วบน branch นี้ |
| จุดต่างที่ยักษ์ไม่มี | NLE เข้าใจไทย/สำเนียง/บริบท ลึกกว่า Canva/Buffer/Notion ทุกตัว |
| เก็บเงินได้เร็ว | ครีเอเตอร์/SME จ่ายรายเดือนอยู่แล้วกับเครื่องมือ 3–5 ตัวที่ Nirva แทนได้ |
| ป้อน ecosystem ในอนาคต | ทุก capture เข้า Knowledge Hub → เป็นฐานของ ERP/CRM ในปีถัด ๆ ไป |

---

## เป้าหมาย 90 วัน (วัดได้ ข้อเดียวต่อเรื่อง)

| ตัวชี้วัด | เป้า |
|-----------|------|
| ผู้ใช้จริงที่ใช้ ≥3 วัน/สัปดาห์ | **10 คน** |
| โพสต์ที่เผยแพร่ผ่าน Nirva จริง | **300 โพสต์** |
| ลูกค้าจ่ายเงินรายแรก ๆ | **10 ราย** (฿299–590/เดือน) |
| รายได้ recurring แรก | **≥ ฿3,000/เดือน** ภายในวันที่ 90 |

> ตัวเลขเล็กโดยตั้งใจ — 10 คนที่**กลับมาใช้ทุกวัน**มีค่ากว่า 1,000 คนที่ลองแล้วหาย

---

## Sprint 1 — วันที่ 1–30: "Founder ใช้เองทุกวัน"

เป้า: วงจร capture → content → publish **ใช้งานจริงในชีวิตประจำวันของ Founder** (user #0)

- [x] Voice capture จริง (browser MediaRecorder + STT ผ่าน provider) ✅ NLE `/transcribe` + Whisper/echo provider
- [x] เชื่อม Content Studio → NMD variants → publish ครบใน UI ✅ Publish panel: เลือกแพลตฟอร์ม → กดปุ่มเดียว → อนุมัติ+variants+โพสต์ (ทดสอบฟรีด้วย `NMD_DEMO_CONNECTORS=1`)
- [x] **LINE OA connector** (Messaging API — broadcast/push) ✅ ตั้ง `LINE_CHANNEL_ACCESS_TOKEN` แล้วใช้ได้เลย
- [ ] Founder โพสต์คอนเทนต์จริงของ Nirva ผ่าน Nirva เท่านั้น ตลอด 30 วัน (dogfood)
- [ ] จดทุก friction ที่เจอ → เป็น backlog ของ Sprint 2

**Definition of done:** Founder ไม่ต้องเปิดแอปอื่นเลยตั้งแต่ไอเดียจนโพสต์

## Sprint 2 — วันที่ 31–60: "10 ผู้ใช้จริง"

เป้า: closed beta กับคนจริงที่ไม่ใช่เรา

- [ ] ชวนครีเอเตอร์/SME ไทย 10–15 คน (คนรู้จัก, กลุ่ม Facebook, ลูกค้าเดิมของ BEST)
- [ ] Onboarding ภาษาไทย ≤ 10 นาที ถึงโพสต์แรก
- [ ] คุยกับผู้ใช้**ทุกสัปดาห์** — feedback จริงกำหนด backlog ไม่ใช่ blueprint
- [ ] แก้ top-3 pains ทุกสัปดาห์ · ship ทุกศุกร์
- [ ] วัด: activation (โพสต์แรกภายใน 24 ชม.), retention (กลับมาในสัปดาห์ที่ 2)

**Definition of done:** ผู้ใช้ ≥7 คนกลับมาใช้เองโดยไม่ต้องตาม

## Sprint 3 — วันที่ 61–90: "เงินจริง"

เป้า: พิสูจน์ว่ามีคนจ่าย

- [ ] แพ็กเกจเดียว เรียบง่าย: **฿399/เดือน** (unlimited capture + 3 ช่องทางโพสต์) — ปรับตาม feedback
- [ ] เก็บเงินแบบง่ายก่อน: PromptPay/โอน + ใบเสร็จ (billing system จริงรอ Phase หลัง)
- [ ] ขอ testimonial + case study 3 ชิ้นจากผู้ใช้ที่ได้ผลจริง
- [ ] **Decision point วันที่ 90:** ถ้าถึงเป้า → ระดมทีม/ทุนขยาย wedge · ถ้าไม่ถึง → วิเคราะห์ว่า wedge ผิดหรือ execution ผิด แล้วปรับ **ไม่ใช่เพิ่ม scope**

---

## 🚫 สิ่งที่จงใจไม่ทำใน 90 วันนี้

รายการนี้สำคัญเท่ากับรายการที่ทำ — ทุกข้อ "ดี" แต่**ยังไม่ใช่ตอนนี้**:

- ❌ ERP / CRM / Commerce / Finance / Cloud / Marketplace
- ❌ ขยายองค์กร AI 100+ agents ตาม Org Blueprint (ใช้เท่าที่มี)
- ❌ เอกสาร governance เพิ่ม (13 ฉบับพอแล้วสำหรับ phase นี้)
- ❌ SDK / Developer Platform / Community Translation
- ❌ Video editing / Live Studio / Auto Dub
- ❌ Connector เกิน 3 ช่องทางแรก (Telegram, LINE OA, Facebook Page)
- ❌ Multi-cloud / Kubernetes / scale infrastructure (ยังไม่มี load ให้ scale)
- ❌ ภาษาอื่นนอกจากไทย + อังกฤษ (NLE รองรับแล้ว แต่ไม่ต้อง localize UI เพิ่ม)

> กติกา: อยากเพิ่มอะไรใน 90 วันนี้ ต้องตอบได้ว่า**ตัดข้อไหนออกแทน**

---

## จังหวะรายสัปดาห์ (Cadence)

| วัน | กิจกรรม |
|-----|---------|
| จันทร์ | เลือก top-3 ของสัปดาห์จาก feedback |
| อังคาร–พฤหัส | สร้าง (AI agents ช่วยเต็มกำลังตาม [Execution Plan](NIRVA_MASTER_EXECUTION_PLAN.md)) |
| ศุกร์ | **Ship** + คุยกับผู้ใช้อย่างน้อย 2 คน |
| เสาร์–อาทิตย์ | พัก (10 ปีคือมาราธอน ไม่ใช่สปรินต์เดียว) |

---

## ความเชื่อมโยงกับแผนใหญ่

90 วันนี้**คือ** Phase ต่าง ๆ ของ [Master Execution Plan](NIRVA_MASTER_EXECUTION_PLAN.md) ที่ถูกจัดลำดับใหม่ตามลูกค้า:

- Voice capture จริง = Roadmap "Real Voice Transcription" (เลื่อนขึ้น)
- LINE OA connector = NMD-1700 Publisher (ต่อจาก Telegram)
- ผู้ใช้ 10 คน = ข้อมูลจริงชุดแรกเข้า Knowledge Hub (Phase 2)
- รายได้ = runway สำหรับ Phase 3–5 โดยไม่ต้องรีบระดมทุน

---

*เอกสารนี้หมดอายุวันที่ 90 — วันนั้นเขียนแผน 90 วันถัดไปจากข้อมูลจริง ไม่ใช่จากจินตนาการ*
