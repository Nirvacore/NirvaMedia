# 🗺️ Nirva Platform Roadmap — Next Steps สำหรับทีม Nirva

> แผนการสร้าง **Nirva Platform** ทั้งระบบ — ต่อยอดจาก [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md)
>
> สำหรับ sprint plan ของ Nirva AI Core Dashboard (แอปนี้) ดู [ROADMAP.md](../ROADMAP.md)

---

## ภาพรวม Phase

| Phase | ชื่อ | จุดเน้น |
|-------|-----|---------|
| 1 | Foundation | Architecture · Cost Code · Design System · Database กลาง — **สำคัญที่สุด** |
| 2 | Platform Services | บริการกลางที่ทุกโมดูลใช้ร่วมกัน |
| 3 | Nirva Language Engine | ระบบภาษากลาง (NLE) |
| 4 | Nirva Media | Content creation + publishing (NMD) |
| 5 | AI Integration | AI Gateway รองรับหลายผู้ให้บริการ |
| 6 | SDK และ API | SDK ทุกแพลตฟอร์ม + เอกสารสำหรับนักพัฒนาภายนอก |
| 7 | Security | ความปลอดภัยและความเสถียรของระบบ |
| 8 | Documentation | เอกสารครบทุกด้าน |

---

## Phase 1 : Foundation (สำคัญที่สุด)

### 1. ออกแบบ NirvaOS Architecture

- กำหนดโครงสร้างระบบทั้งหมด
- แยก Core Services และ Modules
- วางมาตรฐาน API
- วางระบบ Authentication และ Permission
- ออกแบบ Event Bus และ Service Communication

### 2. สร้าง Cost Code มาตรฐาน

กำหนดรหัสสำหรับทุกโปรเจกต์:

| Code | Project |
|------|---------|
| NOS | NirvaOS |
| NAI | Nirva AI |
| NMD | Nirva Media |
| NLE | Nirva Language Engine |
| NKB | Nirva Knowledge Hub |
| NCL | Nirva Cloud |
| NCM | Nirva Commerce |
| NWO | Nirva Work |
| NER | Nirva ERP |
| NCRM | Nirva CRM |

> ทุกโมดูลและเอกสารต้องอ้างอิง Cost Code เดียวกัน
> (รายละเอียด NMD-xxxx และ NLE-xxxx ดู [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md))
>
> **รายการอ้างอิงหลักฉบับเต็ม (18 รหัส รวม NFI, NAN, NAU, NMP, NSC, NID, NWF, NAPI):** [NIRVA_CONSTITUTION.md → Cost Code Standards](NIRVA_CONSTITUTION.md#cost-code-standards-18-รหัส)

### 3. สร้าง Design System

กำหนดมาตรฐาน:

- สี
- Font
- Icon
- Button
- Card
- Form
- Layout
- Responsive Design
- Accessibility

ให้ทุกแอปมีหน้าตาและประสบการณ์ใช้งานที่สอดคล้องกัน
(จุดเริ่มต้น: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — Minimal Garden)

### 4. ออกแบบ Database กลาง

กำหนดข้อมูลหลัก:

- Users
- Organizations
- Teams
- Roles
- Permissions
- Languages
- Knowledge
- Files
- Media
- AI Memory
- Projects
- Notifications
- Audit Logs

> หลีกเลี่ยงการสร้างข้อมูลซ้ำในแต่ละโมดูล

---

## Phase 2 : Platform Services

สร้างบริการกลางที่ทุกโมดูลเรียกใช้ร่วมกัน:

- Authentication
- User Management
- Organization Management
- Language Engine
- AI Gateway
- File Storage
- Notification Service
- Search Service
- Analytics Service
- Billing Service
- Workflow Engine
- API Gateway

---

## Phase 3 : Nirva Language Engine

- รองรับหลายภาษา
- Localization
- Translation
- Voice
- Subtitle
- OCR
- Search ข้ามภาษา
- API กลางสำหรับทุกแอป

รายละเอียดเต็ม: [NIRVA_MEDIA_NLE_VISION.md → Project 2](NIRVA_MEDIA_NLE_VISION.md#project-2--nirva-language-engine-nle)

---

## Phase 4 : Nirva Media

- AI Writer
- AI Image
- AI Video
- AI Voice
- Publish Engine
- Automation
- Analytics
- Team Collaboration

รายละเอียดเต็ม: [NIRVA_MEDIA_NLE_VISION.md → Project 1](NIRVA_MEDIA_NLE_VISION.md#project-1--nirva-media)

---

## Phase 5 : AI Integration

รองรับผู้ให้บริการ AI หลายรายผ่าน **AI Gateway**:

- Large Language Models
- Image Models
- Video Models
- Voice Models
- Embedding Models

> ออกแบบให้สามารถ**เปลี่ยนผู้ให้บริการได้โดยไม่ต้องแก้โค้ดทั้งระบบ**

---

## Phase 6 : SDK และ API

พัฒนา SDK สำหรับ:

- Web
- Android
- iOS
- Desktop

พร้อมเอกสาร API สำหรับนักพัฒนาภายนอก

---

## Phase 7 : Security

- Encryption
- RBAC
- Audit Logs
- Backup
- Disaster Recovery
- Monitoring
- Rate Limiting
- API Keys

---

## Phase 8 : Documentation

จัดทำ:

- System Architecture
- Database Design
- API Documentation
- Coding Standards
- UI Guidelines
- Deployment Guide
- Operations Manual

---

## เป้าหมาย

สร้าง Platform ที่:

- ขยายได้ง่าย (Scalable)
- เปลี่ยนผู้ให้บริการ AI ได้
- รองรับหลายภาษา
- รองรับผู้ใช้ทั่วโลก
- ใช้โครงสร้างเดียวกันทุกผลิตภัณฑ์
- ลดต้นทุนการพัฒนาและการบำรุงรักษาในระยะยาว

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md) — Vision v1.0 ของ Nirva Media + NLE
- [NIRVA_ECOSYSTEM.md](NIRVA_ECOSYSTEM.md) — ภาพรวมผลิตภัณฑ์ทั้งหมดของ Nirvacore
- [NIRVA_BRAIN_OS.md](NIRVA_BRAIN_OS.md) — Master Vision ของ Nirva AI Workspace
- [ROADMAP.md](../ROADMAP.md) — Sprint plan ของ Nirva AI Core Dashboard
