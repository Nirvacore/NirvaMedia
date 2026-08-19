# NIRVA AI Model Orchestration System

> ROUTER — AI Resource Manager: เลือกสมองให้ Agent ทุกตัว

---

## Flow

```
User → DESK → Intent Router → ROUTER (Model) → Agent + Model → REPORT
```

---

## Model Tiers

| Tier | Models | ใช้เมื่อ |
|------|--------|---------|
| **Free** | Llama, Qwen, DeepSeek, Mistral | สรุป, เอกสาร, test, งานซ้ำ |
| **Low Cost** | DeepSeek Chat, Qwen 32B | Coding ปานกลาง, วิเคราะห์ข้อมูล |
| **Premium** | Claude, GPT, Gemini | Architecture, strategy, security |

---

## Rule Engine

| งาน | Tier |
|-----|------|
| คิดระบบใหม่ / ERP | Premium |
| Security | Premium |
| แก้ typo | Free |
| เขียน test | Free |
| Deploy routine | Free |
| ข้อมูลลับ / PII | Free (self-hosted) |

---

## API

```bash
# สรุประบบ
GET /api/orchestration

# เลือก model สำหรับ agent
POST /api/orchestration/route
{ "message": "สร้างระบบ ERP ใหม่", "agent": "ARCH" }

# วางแผน model ทั้ง pipeline
POST /api/orchestration/route-pipeline
{ "message": "...", "agents": ["DESK","ARCH","CODE","BRIEF"] }

# สถิติต้นทุนวันนี้
GET /api/orchestration/cost

# ประวัติ routing ล่าสุด
GET /api/orchestration/recent?limit=10
```

Chat และ Control Tower เรียก ROUTER อัตโนมัติเมื่อ `useOrchestration: true` (ค่าเริ่มต้น):

```bash
POST /api/chat
{ "message": "เขียน unit test", "agent": "CODE", "useOrchestration": true }
# → response มี modelRouting.recommendedTier, model.name
```

---

## Agent Defaults

| Agent | Default Tier |
|-------|-------------|
| DESK, FLOW, BRIEF | Free |
| ARCH, SAGE, SEAL | Premium |
| CODE, ROOT | Low Cost → Premium ถ้างานยาก |

---

## UI

`/orchestration` — cost dashboard + ทดลอง ROUTER

---

## Code

- `shared/model-orchestration.ts` — tiers, rules, scoring
- `server/orchestration/index.ts` — usage tracking
- Integrated with `POST /api/router/execute` → `modelPlan` in response
