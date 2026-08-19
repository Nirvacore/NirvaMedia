# ดูตัวอย่าง / Demo Guide

> คู่มือดูตัวอย่างฟีเจอร์ทั้งหมดของ Nirva AI Dashboard และวิธี deploy ขึ้นระบบ

---

## เริ่มต้นเร็ว (Local)

```bash
pnpm install
cp .env.example .env
pnpm dev
```

เปิด **http://localhost:3000/demo** — หน้ารวมลิงก์ตัวอย่างทั้งหมด

---

## ดูตัวอย่างได้ที่ไหน

| ตัวอย่าง | URL | คำอธิบาย |
|---------|-----|----------|
| **Demo Hub** | `/demo` | หน้ารวมลิงก์ตัวอย่างทั้งหมด |
| **Dashboard** | `/` | หน้าหลัก — สถิติ 109 agents, sprint progress |
| **Agents** | `/agents` | รายชื่อ agent ทั้ง 109 ตัว |
| **Organization** | `/organization` | 8 AI Companies + Control Tower |
| **Chat (Control Tower)** | `/chat` | DESK รับคำสั่งและ route ไป pipeline |
| **Marketplace** | `/marketplace` | Agent packs — import/export JSON |
| **Plugins** | `/plugins` | ติดตั้ง/ทดสอบ plugins ต่อ org |
| **Reports** | `/reports` | รายงานงานและ workload |
| **Workflows** | `/workflows` | Template CODE → ARCH → SHIP |
| **Memory** | `/memory` | Qdrant vector memory UI |
| **Ecosystem** | `/ecosystem` | 6 ผลิตภัณฑ์ Nirvacore |
| **API Docs (Swagger)** | `/api/docs` | ทดลองเรียก API แบบ interactive |
| **OpenAPI JSON** | `/api/openapi.json` | Spec สำหรับ import ใน Postman/Insomnia |
| **Developer Docs** | `/docs` | หน้า dev hub |
| **Storybook** | `/storybook/` | ตัวอย่าง UI components (Button, Badge, Card) |

### ทดลอง API ผ่าน curl

```bash
# Health check
curl http://localhost:3000/api/health

# วิเคราะห์ intent (keyword)
curl -X POST http://localhost:3000/api/router/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"สร้างระบบขายออนไลน์"}'

# ดู tenants (multi-tenant)
curl http://localhost:3000/api/tenants

# ดู marketplace packs
curl http://localhost:3000/api/marketplace
```

### Tenant ตัวอย่าง (Multi-tenant)

| Organization | Tenant ID | Agents |
|-------------|-----------|--------|
| Nirvacore (Enterprise) | `tenant_nirva_default` | 109 |
| Startup Demo (Pro) | `tenant_startup_demo` | 24 |
| Free Sandbox | `tenant_free_sandbox` | 8 |

สลับ org ได้จาก sidebar (Tenant Switcher) หรือส่ง header `X-Tenant-Id`

---

## เอาขึ้นระบบ (Deploy)

### วิธีที่ 1 — Docker Compose (แนะนำ)

รันทั้ง dashboard + Ollama + Qdrant + n8n ในคำสั่งเดียว:

```bash
docker compose up -d --build
```

เปิด **http://localhost:3000**

```bash
docker compose logs -f dashboard   # ดู log
docker compose down                # หยุด
```

### วิธีที่ 2 — Docker เฉพาะ Dashboard

```bash
docker build -t nirva-dashboard .
docker run -p 3000:3000 -v nirva_data:/app/data --env-file .env nirva-dashboard
```

### วิธีที่ 3 — Production บนเครื่อง

```bash
pnpm build
CI=true pnpm build-storybook
mkdir -p dist/public/storybook && cp -r storybook-static/* dist/public/storybook/
NODE_ENV=production pnpm start
```

### วิธีที่ 4 — Render.com (Cloud)

1. Fork/clone repo ไป GitHub
2. สร้าง Web Service บน [Render](https://render.com)
3. เลือก **Blueprint** หรือใช้ `render.yaml` ใน repo
4. Deploy อัตโนมัติ — ได้ URL เช่น `https://nirva-dashboard.onrender.com`

### วิธีที่ 5 — Railway / Fly.io

- **Build:** `pnpm install && pnpm build`
- **Start:** `node dist/index.js`
- **Env:** ดู `.env.example`

---

## Services ที่ต้องมี (Optional)

| Service | Port | ใช้สำหรับ |
|---------|------|-----------|
| Ollama | 11434 | Chat, LLM classifier, embeddings |
| Qdrant | 6333 | Agent memory / RAG |
| n8n | 5678 | Workflow orchestration |

ถ้าไม่มี services เหล่านี้ dashboard ยังใช้งานได้ — chat จะแจ้ง Ollama unavailable, memory ใช้ SQLite fallback

---

## Storybook แยก (Dev)

```bash
pnpm storybook        # http://localhost:6006
pnpm build-storybook  # output → storybook-static/
```

ใน production build ที่มี storybook embed แล้ว เปิด `/storybook/` ได้เลย

---

## ปัญหาที่พบบ่อย

| ปัญหา | แก้ไข |
|-------|------|
| หน้าว่างหลัง deploy | ต้องใช้ Node server (`node dist/index.js`) ไม่ใช่ static host อย่างเดียว |
| `/storybook` 404 | รัน `pnpm build-storybook` แล้ว copy ไป `dist/public/storybook/` |
| Chat ไม่ตอบ | ตั้ง `VITE_OLLAMA_URL` และรัน `ollama pull llama3.1:8b` |
| Port ถูกใช้แล้ว | เปลี่ยน `PORT=3001` ใน `.env` |

---

ดูเพิ่ม: [DEPLOYMENT.md](../DEPLOYMENT.md) · [API.md](../API.md) · [ROADMAP.md](../ROADMAP.md)
