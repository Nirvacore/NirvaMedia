# NIRVA AI Organization Master Blueprint V1

> Nirva คือ **AI Company Operating System** — ไม่ใช่แค่ chatbot และไม่ใช่แค่ AI เขียนโค้ด

## Vision

สร้างระบบที่มี AI Agents จำนวนมากทำงานเหมือนบริษัทจริง มีแผนก มีตำแหน่ง มีหน้าที่ มีการประชุม มีการมอบหมายงาน และมี **Control Tower** เป็นผู้บริหารกลาง

**สถานะ:** Nirva มี Agent อยู่แล้ว **109 ตัว** — เป้าหมายไม่ใช่สร้างใหม่ทั้งหมด แต่จัดระเบียบให้กลายเป็นองค์กร AI ที่ทำงานร่วมกันได้จริง

---

## Control Flow

```
User
  ↓
Nirva Control Tower
  ↓
DESK + FLOW
  ↓
AI Companies / Departments
  ↓
Specialist Agents
  ↓
Tools / Code / Database / Deploy
  ↓
Report กลับ User
```

---

## Core Control Tower

| Agent | Blueprint Role | Registry |
|-------|----------------|----------|
| **DESK** | Chief of Staff AI | ✅ `Core Control Tower` |
| **FLOW** | Operations Manager AI | ✅ `Core Control Tower` |
| **SAGE** | Strategic AI (ORACLE) | ✅ `Teacher Module` — maps to ORACLE |

### DESK — Chief of Staff
- รับคำสั่งจากผู้ใช้
- เข้าใจเป้าหมาย → วิเคราะห์ว่างานต้องใช้ใคร
- เรียก Agent ที่เหมาะสม → จัดประชุม Agent → สรุปผล

### FLOW — Operations Manager
- จัด Workflow → แบ่ง Task → ติดตามสถานะ
- ส่งงานระหว่าง Agent → ควบคุมกระบวนการ

### SAGE (ORACLE) — Strategic AI
- วิเคราะห์ภาพรวม → วางกลยุทธ์ → ตัดสินใจระดับองค์กร

---

## AI Companies (8)

| Company | Key Agents (Blueprint → Registry) |
|---------|-----------------------------------|
| **Nirva Software** | ARCH, CODE, PIXEL→FRONT, ROOT→BACK, POCKET→MOBILE, MAP→DATA, NET→APIX, WALL→TEST, SPARK→BUG, VAULT→SHIELD, SHIP→DEPLOY |
| **Nirva Knowledge** | GATHER→MEMORY, WEAVE, RAG-BUILDER, INK→DOC, DEEP→SEARCH |
| **Nirva Commerce** | REACH→SELL, BUZZ→MARKET, SCOUT→PRODUCT, PRICE, SHELF→STOCK, CARE |
| **Nirva Media** | BLOOM→CREATE, INK→WRITE, TALE→STORY, FRAME→DESIGN, CLIPS→VIDEO, BUZZ→SOCIAL |
| **Nirva Service** | INVITE→BOOK, SCHED→PLAN, HUB→SERVICE, CHECK |
| **Nirva People** | RECRUIT→HIRE, TRAINER→TRAIN, CARE→HR |
| **Nirva Finance** | COIN→MONEY, TALLY→ACCOUNT, BRIEF→REPORT |
| **Nirva Education** | TEACH, PHOTON→GUIDE, INDEX→CURRICULUM |

---

## Agent Router

ระบบเลือก Agent อัตโนมัติจากคำสั่งผู้ใช้:

**ตัวอย่าง:** User: "สร้างระบบขาย"

```
DESK → SCOUT → ARCH → CODE → WALL → SHIP → BRIEF
```

### API

| Endpoint | Description |
|----------|-------------|
| `POST /api/router/analyze` | วิเคราะห์ intent + agent pipeline |
| `POST /api/router/execute` | สร้าง tasks ตาม pipeline |
| `POST /api/chat/tower` | Control Tower chat (DESK + router + Ollama) |
| `GET /api/organization` | โครงสร้างองค์กรทั้งหมด |
| `GET /api/reports` | Report dashboard |

### Intent Pipelines (10)

- `build-software` — สร้างระบบซอฟต์แวร์
- `sell-online` — ระบบขายออนไลน์
- `create-content` — Content & Media
- `knowledge-rag` — Knowledge Base / RAG
- `strategy` — วางกลยุทธ์ (SAGE/ORACLE)
- `education` — สอนและฝึกอบรม
- `finance` — การเงินและบัญชี
- `hr` — บุคลากร
- `service` — บริการและจอง
- `daily-ops` — งานประจำวัน

---

## Model Strategy

| Tier | Models | ใช้กับ |
|------|--------|--------|
| **Open Source** | Llama, Qwen, DeepSeek, Mistral | งานทั่วไป, เอกสาร, วิเคราะห์พื้นฐาน |
| **Premium** | Claude, GPT, Gemini | Architect, Strategy, Coding ยาก |

> AI แรง = ใช้กับงานคิด · AI ประหยัด = ใช้กับงานประจำ

---

## Permission System

| Role | read | write | deploy | admin |
|------|------|-------|--------|-------|
| viewer | ✅ | | | |
| operator | ✅ | ✅ | | |
| developer | ✅ | ✅ | ✅ | |
| admin | ✅ | ✅ | ✅ | ✅ |

Deploy agents: `SHIP`, `FLOW`, `NET`, `VAULT`  
Admin agents: `DESK`, `FLOW`, `SAGE`, `ARCH`

---

## Business Model

| Tier | Description |
|------|-------------|
| **Free** | ให้คนเข้าถึง AI |
| **Pro** | Automation + Agent ขั้นสูง |
| **Enterprise** | AI Workforce ส่วนตัว |
| **Impact** | เข้าถึง AI ผ่านเครดิต/โอกาส |

---

## Dashboard Pages

| Page | Path | Purpose |
|------|------|---------|
| Organization | `/organization` | โครงสร้าง AI Companies + Control Tower |
| Reports | `/reports` | งานเสร็จ, ปัญหา, ขั้นตอนถัดไป |
| Chat (Tower) | `/chat` | DESK + Control Tower mode |
| Tasks | `/tasks` | Task queue จาก router |
| Memory | `/memory` | Project knowledge + RAG |

---

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure services
cp .env.example .env
# Set VITE_OLLAMA_URL, VITE_QDRANT_URL, VITE_N8N_URL

# 3. Start dashboard
pnpm dev

# 4. Test Control Tower
curl -X POST http://localhost:3000/api/router/analyze \
  -H 'Content-Type: application/json' \
  -d '{"message":"สร้างระบบขาย"}'

# 5. Execute pipeline (creates tasks)
curl -X POST http://localhost:3000/api/router/execute \
  -H 'Content-Type: application/json' \
  -d '{"message":"build REST API"}'
```

---

## Implementation Files

| Area | Path |
|------|------|
| Organization map | `shared/organization.ts` |
| Permissions | `shared/permissions.ts` |
| Agent Router | `server/router/index.ts` |
| Reports | `server/reports/index.ts` |
| API routes | `server/api.ts` |
| Organization UI | `client/src/pages/Organization.tsx` |
| Reports UI | `client/src/pages/Reports.tsx` |
| Control Tower Chat | `client/src/pages/Chat.tsx` |

---

## Nirva Ecosystem Integration

Control Tower เชื่อมกับ Nirva Ecosystem 6 products:

- **Nirva AI Core** — Control Tower (this dashboard)
- **Nirvaprocure** — Procurement workflows
- **Nirvasell** — Commerce pipelines
- **NirvaMedia** — Content pipelines
- **MUTEA** — Wellness
- **MahasunyataLand** — Digital Sanctuary

See `docs/NIRVA_ECOSYSTEM.md` for product registry.

---

*Blueprint V1 — implemented in v0.9.0*
