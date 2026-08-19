# 🏗️ Nirva AI Organization Structure — Development Team

> โครงสร้างทีมพัฒนา **20 Agents** สำหรับสร้าง Nirva Platform ตาม [NIRVA_PLATFORM_ROADMAP.md](NIRVA_PLATFORM_ROADMAP.md)
>
> เอกสารนี้เป็นมุมมอง **ทีมพัฒนา (Development Org)** — สำหรับโครงสร้างบริษัท AI เต็มรูปแบบ 109 agents ดู [NIRVA_ORGANIZATION_BLUEPRINT.md](NIRVA_ORGANIZATION_BLUEPRINT.md) และ [AGENT_REGISTRY.md](AGENT_REGISTRY.md)

---

## ภาพรวม 20 Agents

| # | Agent | หน้าที่หลัก |
|---|-------|-------------|
| 1 | Chief AI Architect | ภาพรวม · มาตรฐาน · อนุมัติ Architecture |
| 2 | Product Manager | ความต้องการ · PRD · Roadmap |
| 3 | Solution Architect | System Architecture · API · Database |
| 4 | Backend | API · Database · Business Logic |
| 5 | Frontend | Web · Mobile · Desktop UI |
| 6 | UI/UX | Design System · User Flow · Prototype |
| 7 | AI | Prompt · Workflow · Model Routing · RAG |
| 8 | Language | Translation · Localization · Tone |
| 9 | Media | Image · Video · Voice · Publishing |
| 10 | Automation | Workflow · Scheduling · Event Automation |
| 11 | Security | Security Review · Encryption · RBAC |
| 12 | DevOps | CI/CD · Docker · Kubernetes · Cloud |
| 13 | QA | Test Plan · Unit · Integration · Regression |
| 14 | Documentation | API Docs · User Guide · Release Notes |
| 15 | Data | Data Model · Analytics · Reporting |
| 16 | Research | เทคโนโลยีใหม่ · คู่แข่ง · AI & Open Source |
| 17 | Finance | Cost Tracking · Budget · Pricing |
| 18 | Legal | License · Privacy · Terms · Compliance |
| 19 | Marketing | Branding · SEO · Content · Community |
| 20 | Operations | Deployment · Support · Incident |

---

## รายละเอียดแต่ละ Agent

### 1. Chief AI Architect

- ออกแบบภาพรวมทั้งหมด
- กำหนดมาตรฐาน
- อนุมัติ Architecture
- ดูแลการเชื่อมต่อทุกระบบ

### 2. Product Manager Agent

- วิเคราะห์ความต้องการ
- เขียน PRD
- วาง Roadmap
- จัดลำดับความสำคัญของฟีเจอร์

### 3. Solution Architect Agent

- ออกแบบ System Architecture
- API
- Database
- Microservices
- Event Flow

### 4. Backend Agent

- API
- Database
- Authentication
- Business Logic

### 5. Frontend Agent

- Web
- Mobile
- Desktop
- Responsive UI

### 6. UI/UX Agent

- Design System
- User Flow
- Prototype
- Accessibility

### 7. AI Agent

- Prompt Engineering
- AI Workflow
- Model Routing
- RAG
- AI Evaluation

### 8. Language Agent

- Translation
- Localization
- Tone
- Dialect
- Context

### 9. Media Agent

- Image
- Video
- Voice
- Subtitle
- Publishing

### 10. Automation Agent

- Workflow
- Scheduling
- Event Automation
- AI Agents

### 11. Security Agent

- Security Review
- Encryption
- RBAC
- Compliance

### 12. DevOps Agent

- CI/CD
- Docker
- Kubernetes
- Cloud
- Monitoring

### 13. QA Agent

- Test Plan
- Unit Test
- Integration Test
- Regression Test

### 14. Documentation Agent

- API Docs
- User Guide
- Technical Docs
- Release Notes

### 15. Data Agent

- Data Model
- Analytics
- Dashboard
- Reporting

### 16. Research Agent

- ศึกษาเทคโนโลยีใหม่
- วิเคราะห์คู่แข่ง
- ติดตาม AI และ Open Source

### 17. Finance Agent

- Cost Tracking
- Budget
- Pricing
- Revenue Model

### 18. Legal Agent

- License
- Privacy
- Terms
- Compliance

### 19. Marketing Agent

- Branding
- SEO
- Content
- Community

### 20. Operations Agent

- Deployment
- Customer Success
- Incident Management
- Support

---

## Workflow

```
Vision
 ↓
Product Manager
 ↓
Chief Architect
 ↓
Solution Architect
 ↓
Design (UI/UX)
 ↓
Backend → Frontend → AI
 ↓
Testing (QA)
 ↓
Security
 ↓
Deployment (DevOps)
 ↓
Documentation
 ↓
Release
 ↓
Analytics
 ↓
Continuous Improvement (loop กลับไปที่ Vision)
```

---

## หลักการ

- ทุก Agent มีหน้าที่ชัดเจน
- ทุก Agent ส่งงานต่อเป็นลำดับ
- ไม่มี Agent แก้ไขงานของ Agent อื่นโดยตรง
- ใช้มาตรฐานเดียวกันทั้ง Ecosystem
- ทุกการเปลี่ยนแปลงต้องผ่าน **Architecture Review**

---

## Mapping ไปยัง Agent Registry ที่มีอยู่ (109 agents)

Agents ใน registry ปัจจุบันที่ใกล้เคียงกับแต่ละบทบาท — บทบาทที่ยังไม่มี agent รองรับ ทำเครื่องหมาย ➕ (ต้องสร้างใหม่):

| Dev Role | Registry Agents ที่ใกล้เคียง |
|----------|------------------------------|
| Chief AI Architect | **ARCH** (System Architect) + **DESK** (routing) |
| Product Manager | ➕ ใหม่ (ใกล้เคียง: **GROW** — Business Development) |
| Solution Architect | **ARCH** |
| Backend | **CODE** (Code Generator) |
| Frontend | **CODE** + **POCKET** (Mobile Developer) |
| UI/UX | **PIXEL** (UI Designer) · **SKIN** (Theme) · **PATH** (UX Research) |
| AI | **PROMPT-LAB** (Prompt Optimization) · **SPARK** (AI Research) |
| Language | ➕ ใหม่ — จะเป็นแกนของ **NLE** (Phase 3) |
| Media | **FRAME** (Visual Designer) · **BLOOM** (Content Creator) · **SEO-CONTENT** |
| Automation | **FLOW** (Operations Manager) · **BUZZ** (Marketing Tech) |
| Security | **SHIELD** (Security Operations) |
| DevOps | **ROOT** (DevOps Engineer) · **SHIP** (Deployment Manager) |
| QA | ➕ ใหม่ |
| Documentation | **INK** (Technical Writer) |
| Data | **PULSE** (Analytics Manager) |
| Research | **DEEP** (Research Analyst) · **COMPETITION** (Competitive Intelligence) |
| Finance | **COIN** (Group CFO) · **COST-OPT** (Cost Optimization) |
| Legal | **SEAL** (Group Legal) |
| Marketing | **BUZZ** · **SEO-CONTENT** · **DROP** (Email Marketing) |
| Operations | **FLOW** · **INCIDENT** (Incident Triage) |

> Registry ฉบับเต็ม: [AGENT_REGISTRY.md](AGENT_REGISTRY.md) · โครงสร้างบริษัท: [NIRVA_ORGANIZATION_BLUEPRINT.md](NIRVA_ORGANIZATION_BLUEPRINT.md)

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_ORG_BLUEPRINT_PHASE1.md](NIRVA_ORG_BLUEPRINT_PHASE1.md) — โครงสร้างองค์กรเต็มรูปแบบ (Executive + 14 Departments)
- [NIRVA_AI_CONSTITUTION.md](NIRVA_AI_CONSTITUTION.md) — AI Governance และกฎการทำงาน
- [NIRVA_PLATFORM_ROADMAP.md](NIRVA_PLATFORM_ROADMAP.md) — แผน 8 Phase ที่ทีมนี้รับผิดชอบ
- [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md) — Vision v1.0 ของ Nirva Media + NLE
- [NIRVA_ORGANIZATION_BLUEPRINT.md](NIRVA_ORGANIZATION_BLUEPRINT.md) — AI Company OS (109 agents)
- [AGENT_REGISTRY.md](AGENT_REGISTRY.md) — ทะเบียน agent ทั้งหมด
