# 📐 Nirva Engineering Standards v1.0

> มาตรฐานวิศวกรรมกลางของทั้ง Ecosystem — ทุกผลิตภัณฑ์ ทุกโมดูล ทุก Agent ต้องปฏิบัติตาม
>
> บังคับใช้ผ่าน Architecture Review ตาม [NIRVA_AI_CONSTITUTION.md](NIRVA_AI_CONSTITUTION.md)

---

## หลักการสูงสุด

> **"สร้างครั้งเดียว ใช้ซ้ำได้ทั้ง Ecosystem"**
>
> ทุกสิ่งที่สร้าง ต้องสามารถนำกลับมาใช้ใหม่ได้

---

## ภาพรวมมาตรฐาน 20 ด้าน

| # | Standard | สาระสำคัญ |
|---|----------|-----------|
| 1 | Naming | ชื่อ Product / Module รูปแบบเดียวทั้งหมด |
| 2 | Folder | โครงสร้างโฟลเดอร์เหมือนกันทุกโปรเจกต์ |
| 3 | Documentation | ทุกโมดูลมีเอกสาร 11 หัวข้อ |
| 4 | API | Versioned + Auth + Rate Limit + Error Code |
| 5 | Database | ทุก Table มีคอลัมน์มาตรฐาน + Audit |
| 6 | Security | Encryption · RBAC · MFA · Audit |
| 7 | AI | ทุก Agent มี Version · Owner · Cost · Safety |
| 8 | UI | Design System เดียวทั้ง Ecosystem |
| 9 | Knowledge | ความรู้มี Version · Owner · Source |
| 10 | Workflow | Input → Process → Output + Approval |
| 11 | Quality | Review 6 ด้านทุกงาน |
| 12 | Release | Dev → Testing → Staging → Production |
| 13 | Monitoring | Latency · Errors · Cost · AI Tokens |
| 14 | Cost | ทุกบริการมี Cost Code + Budget |
| 15 | Language | รองรับ Localization ทุกระบบ |
| 16 | Integration | เชื่อมต่อผ่าน API/Event เท่านั้น |
| 17 | Version | ทุกอย่างมี Version |
| 18 | Disaster Recovery | Backup · Failover · Health Checks |
| 19 | Governance | ทุกการเปลี่ยนแปลงตรวจสอบย้อนหลังได้ |
| 20 | Golden Rules | กฎทอง 10 ข้อ |

---

## 1. Naming Standards

ทุกอย่างใช้มาตรฐานเดียว

**Products:** Nirva AI · Nirva Media · Nirva Cloud · Nirva Work · Nirva Commerce · Nirva ERP

**Modules:** Authentication · Workflow · Language · Analytics · Search · Knowledge · Files · Media · Notifications · API

> ใช้รูปแบบเดียวทั้งหมด

---

## 2. Folder Standards

ทุกโปรเจกต์มีโครงสร้างเหมือนกัน:

```
/docs
/apps
/packages
/services
/modules
/shared
/tests
/scripts
/assets
/config
```

---

## 3. Documentation Standards

ทุกโมดูลต้องมี:

- Vision
- Purpose
- Architecture
- API
- Database
- Security
- Workflow
- Deployment
- Testing
- Changelog
- Owner

---

## 4. API Standards

ทุก API ต้องมี:

- Version (เช่น `/api/v1/…`)
- Authentication
- Rate Limit
- Error Code
- Request
- Response
- Documentation

---

## 5. Database Standards

ทุก Table ต้องมี:

- ID
- Created At
- Updated At
- Created By
- Updated By
- Version
- Status
- Soft Delete
- Audit Log

---

## 6. Security Standards

ทุกระบบต้องมี:

- Encryption
- RBAC
- MFA Support
- Audit
- Logging
- Secrets
- Backup

---

## 7. AI Standards

ทุก AI Agent ต้องมี:

- Version
- Owner
- Memory Policy
- Cost Tracking
- Evaluation
- Safety Rules

(สอดคล้องกับ Layer 1–2 ใน [NIRVA_ORG_BLUEPRINT_PHASE2.md](NIRVA_ORG_BLUEPRINT_PHASE2.md))

---

## 8. UI Standards

ทุกระบบ:

- ใช้ Design System เดียว
- สีเดียว
- Spacing เดียว
- Icon เดียว
- Typography เดียว
- Accessibility เดียว

(Design System ปัจจุบัน: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — Minimal Garden)

---

## 9. Knowledge Standards

ทุกความรู้ต้องมี:

- Version
- Owner
- Source
- Review Date
- Tags
- ค้นหาได้

---

## 10. Workflow Standards

ทุก Workflow ต้องมี:

- Input
- Process
- Output
- Owner
- Logs
- Metrics
- Approval

---

## 11. Quality Standards

Review 6 ด้าน:

- Code Review
- Architecture Review
- Security Review
- UX Review
- Performance Review
- AI Review

---

## 12. Release Standards

```
Development → Testing → Staging → Production
                              ↘ Rollback
                              ↘ Monitoring
```

---

## 13. Monitoring Standards

วัดทุกระบบ:

- Latency
- Errors
- Availability
- Cost
- Usage
- Performance
- AI Tokens

---

## 14. Cost Standards

ทุกบริการต้องมี:

- Cost Code (มาตรฐานรหัส: [NIRVA_PLATFORM_ROADMAP.md](NIRVA_PLATFORM_ROADMAP.md))
- Budget
- Forecast
- Usage
- Optimization

---

## 15. Language Standards

ทุกระบบรองรับ (ผ่าน [NLE](NIRVA_MEDIA_NLE_VISION.md)):

- Localization
- Translation
- RTL/LTR
- Timezone
- Currency
- Date
- Number Format

---

## 16. Integration Standards

ทุกบริการเชื่อมต่อผ่าน:

- API
- Events
- Webhooks
- SDK

> **ไม่เชื่อมต่อแบบเฉพาะกิจ** (no ad-hoc integration)

---

## 17. Version Standards

ทุกอย่างมี Version:

- Application
- Module
- API
- Workflow
- Knowledge
- AI Model
- Document

---

## 18. Disaster Recovery Standards

- Backup
- Recovery
- Redundancy
- Failover
- Health Checks

---

## 19. Governance Standards

ทุกการเปลี่ยนแปลงต้อง:

- มีเหตุผล
- มีผู้อนุมัติ
- มีบันทึก
- ตรวจสอบย้อนหลังได้

---

## 20. Golden Rules

1. **Reuse ก่อน Build**
2. **API First**
3. **Security by Design**
4. **AI by Design**
5. **Global by Design**
6. **Multi-language by Design**
7. **Multi-tenant by Design**
8. **Documentation First**
9. **Automation First**
10. **Everything is Measurable**

---

## Ultimate Vision

Nirva ไม่ใช่เพียง Software · ไม่ใช่เพียง Platform

แต่เป็น **Engineering Standard** ที่สามารถใช้สร้างผลิตภัณฑ์ บริษัท และ Ecosystem ใหม่ได้อย่างต่อเนื่อง โดยทุกองค์ประกอบใช้มาตรฐานเดียวกันและทำงานร่วมกันได้

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_AI_CONSTITUTION.md](NIRVA_AI_CONSTITUTION.md) — AI Governance และกฎการทำงาน
- [NIRVA_ORG_BLUEPRINT_PHASE2.md](NIRVA_ORG_BLUEPRINT_PHASE2.md) — สถาปัตยกรรม 12 Layers
- [NIRVA_PLATFORM_ROADMAP.md](NIRVA_PLATFORM_ROADMAP.md) — แผน 8 Phase และ Cost Code
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — Design System ปัจจุบัน (Minimal Garden)
