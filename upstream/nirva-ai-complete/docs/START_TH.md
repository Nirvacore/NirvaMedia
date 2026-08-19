# เริ่มระบบ Nirva AI — คู่มือภาษาไทย

> ตอบคำถาม: **โค้ดที่ Manus เขียน พอใช้ไหม? ใครช่วยเริ่มระบบ?**

---

## สรุปสั้นๆ

| คำถาม | คำตอบ |
|-------|--------|
| โค้ด Manus template ใช้ได้ไหม? | **ใช้เป็น scaffold ได้** แต่มีส่วนเก่าที่ทำให้สับสน — เราล้างแล้วใน v0.11.2 |
| ใครช่วยเริ่มระบบ? | **คุณรันเองได้ 1 คำสั่ง** — ไม่ต้องรอ Manus |
| ต้องมี Ollama ไหม? | **ไม่จำเป็น** สำหรับดู UI — Chat ต้องมี Ollama ถึงจะตอบ |

---

## เริ่มระบบ — คำสั่งเดียว

```bash
git clone https://github.com/Nirvacore/nirva-AI.git
cd nirva-AI
pnpm install
pnpm go
```

หรือใช้ script โดยตรง:

```bash
bash scripts/start.sh
```

เปิดเบราว์เซอร์ → **http://localhost:3000/demo**

---

## โค้ด Manus vs โค้ด Nirva

โปรเจกต์เริ่มจาก **Manus template** (v0.0.1) แล้วทีมพัฒนาต่อเป็น Nirva v0.1–v0.11

### ส่วนจาก Manus (ลบ/ปิดแล้ว)

| ส่วน | ปัญหา | สถานะ |
|------|-------|--------|
| Analytics placeholder `%VITE_ANALYTICS_ENDPOINT%` | ทำให้ error ใน log | ✅ ลบออก — ใส่ analytics เฉพาะเมื่อตั้ง env |
| Manus debug collector | ใช้แค่ตอน dev ใน Manus VM | ✅ ปิดใน production build |
| `ManusDialog.tsx` | ไม่ได้ใช้ในแอป | ไฟล์ค้าง — ไม่กระทบการทำงาน |
| `vite-plugin-manus-runtime` | สำหรับ Manus platform | ✅ โหลดเฉพาะ `pnpm dev` |

### ส่วนที่ Nirva เขียนเอง (ใช้งานจริง)

- 109 agents, Organization OS, Agent Router, Multi-tenant, Plugins
- Express API + SQLite + WebSocket
- หน้า Dashboard ทั้งหมด (Chat, Memory, Marketplace, Reports, …)
- Docker / docker-compose / render.yaml

**สรุป: ใช้ได้เลย — ไม่ต้องพึ่ง Manus อีกแล้ว**

---

## ใครช่วยอะไรบ้าง?

```
┌─────────────────────────────────────────────────────────┐
│  คุณ (หรือทีม DevOps)                                    │
│  รัน: pnpm go  หรือ  docker compose up -d --build       │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   Dashboard UI      SQLite DB         API + WebSocket
   (port 3000)       (data/nirva.db)   (/api/*)
```

| บทบาท | ทำอะไร |
|-------|--------|
| **คุณ / Dev ในทีม** | `pnpm go` หรือ Docker — เริ่มได้ทันที |
| **Cursor Agent** | ช่วยแก้โค้ด, deploy, debug (เช่นรอบนี้) |
| **Manus** | ไม่จำเป็น — เป็นแค่ template ต้นทาง |
| **Ollama / Qdrant / n8n** | Optional — สำหรับ Chat, Memory, Workflow เต็มรูปแบบ |

---

## วิธีเริ่มแต่ละแบบ

### แบบ 1: เร็วสุด (ดู UI + API)

```bash
pnpm go
```

### แบบ 2: Dev mode (แก้โค้ด)

```bash
pnpm dev
```

### แบบ 3: Production + AI services ครบ

```bash
docker compose up -d --build
```

ได้ dashboard + Ollama + Qdrant + n8n

### แบบ 4: Cloud (URL สาธารณะ)

Deploy บน [Render.com](https://render.com) ด้วย `render.yaml` ใน repo

---

## หลังเริ่มแล้ว ไปไหนต่อ?

| หน้า | URL |
|------|-----|
| Demo Hub | http://localhost:3000/demo |
| หน้าหลัก | http://localhost:3000/ |
| Organization | http://localhost:3000/organization |
| Swagger API | http://localhost:3000/api/docs |

---

## แก้ปัญหาเริ่มไม่ได้

| อาการ | แก้ |
|-------|-----|
| `better-sqlite3` error | รัน `pnpm install` ใหม่ (ต้อง compile native module) |
| Port 3000 ถูกใช้ | `PORT=3001 pnpm go` |
| หน้าว่าง | ต้องรัน `node dist/index.js` ไม่ใช่เปิดไฟล์ HTML ตรงๆ |
| Chat ไม่ตอบ | ปกติ — ต้องรัน Ollama: `docker compose up ollama -d` |

---

ดูเพิ่ม: [docs/DEMO.md](DEMO.md) · [DEPLOYMENT.md](../DEPLOYMENT.md)
