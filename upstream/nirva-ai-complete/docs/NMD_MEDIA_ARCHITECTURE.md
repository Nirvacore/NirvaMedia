# 🎬 NMD — Nirva Media Architecture (Core)

> **Cost Code:** NMD · **Phase:** 4 ใน Priority Order (ดึง core มาก่อนเพื่อพิสูจน์ create-once-publish-everywhere)
> **Status:** 🟢 Implemented (core) — `shared/media.ts` · `server/media/index.ts` · mounted ที่ `/api/v1/media/*` · tests `server/__tests__/media.test.ts`
> **Owner:** Founder (approve) · Chief Architect Agent (design) · Backend + Media Agent (implement)

Vision ฉบับเต็ม: [NIRVA_MEDIA_NLE_VISION.md → Project 1](NIRVA_MEDIA_NLE_VISION.md#project-1--nirva-media)

---

## 1. Vision & Purpose

> สร้างคอนเทนต์ครั้งเดียว → AI นำไปใช้ได้ทุกแพลตฟอร์ม ทุกรูปแบบ ทุกภาษา

Core ที่ implement แล้ว = ครึ่งแรกของ Workflow ใน vision:

```
Idea/Brief → AI Writer → Content → ปรับตามแพลตฟอร์ม × แปลหลายภาษา (ผ่าน NLE) → ตั้งเวลา
```

ยังไม่อยู่ใน core: AI Image/Video/Voice/Subtitle (NMD-1200→1500) · Connector โพสต์จริง (NMD-1700) · Analytics (NMD-1900)

---

## 2. Reuse Analysis (Rule 5)

| ของเดิม | การตัดสินใจ |
|---------|-------------|
| **NLE** `translateText()` (`server/language/`) | ✅ **Reuse** — การแปล variant ทุกภาษาผ่าน NLE + translation memory ของมัน; NMD ไม่มีระบบแปลของตัวเอง |
| Provider pattern ของ NLE | ✅ **Reuse pattern** — AI Writer ใช้ provider สลับได้แบบเดียวกัน (`setWriterProvider()`) |
| `audit_logs`, session auth, DB มาตรฐาน | ✅ **Reuse** — แบบเดียวกับ NID/NLE |
| NirvaMedia แอปแยกเดิม (port 5001, สถานะ Development) | ⛔ **หยุดพัฒนาที่นั่น** — core ใหม่อยู่ในนี้ตามการตัดสินใจ monorepo |

---

## 3. Architecture

```
/api/v1/media/*  (ทุก endpoint ต้อง authenticated)
   │
   ├─ AI Writer         generateContent() ← WriterProvider (default: Ollama, สลับได้)
   ├─ Content Pipeline  draft → review → approved → scheduled → published → archived
   │                    (STATUS_FLOW enforce ทุก transition + audit)
   └─ Variant Fan-out   buildVariants(content, platforms[], langs[])
                          ├─ แปลผ่าน NLE (ภาษาที่ fail ถูก report ไม่เงียบหาย)
                          └─ adaptTextForPlatform: ตัดที่ขอบเขตคำ + ตัด hashtag
                             ตามข้อจำกัดของแพลตฟอร์ม (registry 18 แพลตฟอร์ม)
```

Platform Registry ครบ 18 แพลตฟอร์มจาก vision (Facebook → Marketplace) พร้อม `maxLength` และ `supportsHashtags` — เพิ่ม connector ใหม่ = เพิ่มแถวใน registry

---

## 4. Database

```sql
nmd_content  (id, title, body, content_type, source_lang, content_status,
              tags, scheduled_at, organization_id, + คอลัมน์มาตรฐาน)
nmd_variants (id, content_id, platform, lang, body, truncated,
              translation_provider, UNIQUE(content_id, platform, lang))  -- upsert ได้ idempotent
```

---

## 5. API

| Endpoint | หน้าที่ |
|----------|---------|
| `GET /api/v1/media/platforms` | Registry 18 แพลตฟอร์ม |
| `GET/PUT /api/v1/media/brief` | **Brand Brief — สมองชั้นแบรนด์** (per organization): แบรนด์/สินค้า/กลุ่มเป้าหมาย/โทน/คู่แข่ง/คำต้องห้าม — AI Writer อ่านทุกครั้งอัตโนมัติ (แนวคิด "สมองกลาง 2 ชั้น": ชั้นระบบ + ชั้นลูกค้า) |
| `GET/POST /api/v1/media/content` | list / สร้าง content |
| `GET /api/v1/media/content/:id` | content + variants ทั้งหมด |
| `POST /api/v1/media/content/:id/transition` | เลื่อนสถานะตาม STATUS_FLOW (409 ถ้าข้ามขั้น) |
| `POST /api/v1/media/generate` | AI Writer (502 + error ชัดเจนถ้า provider ล่ม) — อ่าน Brand Brief อัตโนมัติ |
| `POST /api/v1/media/campaign` | **Strategy skill**: เป้าหมาย → Big Idea + Insight → drafts ลง pipeline (tag ตามชื่อแคมเปญ) · provider สลับได้ (default Ollama, demo ผ่าน `NMD_DEMO_CONNECTORS=1`) |
| `POST/GET /api/v1/media/metrics` | **Analytics (NMD-1900)**: บันทึกตัวเลขจริงจากแพลตฟอร์ม (reach/engagement/clicks ผูกกับชิ้นงานได้) + stats แบบ deterministic |
| `POST /api/v1/media/analyze` | AI วิเคราะห์ผล: อ่าน Brand Brief + metrics → สรุปอะไรเวิร์ก/ไม่เวิร์ก + ข้อเสนอแนะ · analyst provider สลับได้ (`NMD_ANALYST_MODEL`) |
| `POST /api/v1/media/content/:id/variants` | fan-out platforms × langs |
| `GET /api/v1/media/connectors` | แพลตฟอร์มที่มี connector พร้อมใช้ |
| `POST /api/v1/media/content/:id/publish` | โพสต์ variants ไปยังแพลตฟอร์ม (207 ถ้าสำเร็จบางส่วน) |
| `GET /api/v1/media/content/:id/publishes` | ประวัติการโพสต์ + ผลลัพธ์ |
| `POST /api/v1/media/publish-due` | trigger scheduler — session **หรือ** `Authorization: Bearer $NMD_SCHEDULER_TOKEN` (สำหรับ cron/n8n) · crontab: `* * * * * curl -s -X POST -H "Authorization: Bearer $NMD_SCHEDULER_TOKEN" http://localhost:3000/api/v1/media/publish-due` |

Error format: `{ error: { code: "NMD-xxx", message } }`

### Publish Engine (NMD-1700)

`server/media/publish.ts` — Connector abstraction ต่อแพลตฟอร์ม (`registerConnector()`):
- **Telegram** — เปิดใช้เมื่อตั้ง `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- **LINE OA** — เปิดใช้เมื่อตั้ง `LINE_CHANNEL_ACCESS_TOKEN` (broadcast ถึงผู้ติดตามทั้งหมด หรือ push ถึง `LINE_TO` ถ้ากำหนด) — ช่องทางหลักของ SME ไทยตาม 90-Day Plan
- **Facebook Page** — เปิดใช้เมื่อตั้ง `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` (long-lived Page token) โพสต์ลง Page feed ผ่าน Graph API — ครบ 3 connectors ตามลิมิตของ 90-Day Plan
- **Demo connectors** — `NMD_DEMO_CONNECTORS=1` เปิด connector จำลอง (telegram/line/facebook/x) สำเร็จเสมอโดยไม่ยิง API จริง — ทดสอบทั้ง flow ได้ฟรี
- แพลตฟอร์มที่ไม่มี connector หรือยังไม่ได้ build variants → รายงานเป็น `skipped` ไม่ crash
- ทุกความพยายามโพสต์บันทึกใน `nmd_publishes` (สำเร็จ/ล้มเหลว + external id + error)
- โพสต์ครบทุกตัวสำเร็จ → content เลื่อนเป็น `published` อัตโนมัติ; ล้มเหลวบางส่วน → คงสถานะเดิม
- `processDueContent()` — scheduler แบบ explicit (เรียกผ่าน API/cron) ไม่มี background loop ซ่อนอยู่

---

## 6. Security & Quality

- ทุก endpoint ต้อง authenticated session (content เป็นข้อมูลองค์กร)
- ทุก mutation → `audit_logs` (`media.content.create/transition`, `media.variants.build`)
- Status flow เดินหน้าเท่านั้น (rework ได้จาก review, archive ได้จากทุกสถานะ) — ป้องกัน publish โดยไม่ผ่าน review ตามกฎ Constitution "ทุกงานต้องมีผู้ตรวจสอบ"

## 7. Testing

11 tests: platform registry, status flow ครบทุกเส้น, adaptation (truncate ขอบเขตคำ / strip hashtag / unknown platform), CRUD, writer provider สลับได้ + fail gracefully, fan-out ผ่าน NLE (แปลจริง + idempotent upsert + partial failure report), audit coverage

## 8. Changelog

| Version | วันที่ | รายการ |
|---------|-------|--------|
| 0.1.0 | 2026-07-05 | Core: platform registry 18, content pipeline + status flow, AI Writer provider, variant fan-out ผ่าน NLE, API 6 endpoints, 11 tests |
| 0.2.0 | 2026-07-05 | Publish Engine: connector abstraction, Telegram connector จริง, publish records, scheduler `processDueContent()`, API +5 endpoints, +7 tests |

## 9. Next Steps

1. ✅ Publish Engine (NMD-1700): Telegram connector + scheduler — เสร็จ v0.2.0
2. ⬜ Connector เพิ่ม: LINE OA, Discord (webhook — ง่ายรองลงมา)
3. ⬜ AI Image (NMD-1200) ผ่าน provider pattern เดียวกัน
4. ⬜ UI หน้า Content Studio ใน client
5. ⬜ ผูก organizationId กับ NID membership แทน default tenant
6. ⬜ ตั้ง cron/n8n เรียก `POST /api/v1/media/publish-due` ทุก 1 นาทีใน production

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md) — Vision + Cost Code NMD-xxxx
- [NLE_LANGUAGE_ENGINE_ARCHITECTURE.md](NLE_LANGUAGE_ENGINE_ARCHITECTURE.md) — บริการแปลที่ NMD เรียกใช้
- [NID_IDENTITY_ARCHITECTURE.md](NID_IDENTITY_ARCHITECTURE.md) — Phase 1
- [NIRVA_MASTER_EXECUTION_PLAN.md](NIRVA_MASTER_EXECUTION_PLAN.md) — Priority Order
