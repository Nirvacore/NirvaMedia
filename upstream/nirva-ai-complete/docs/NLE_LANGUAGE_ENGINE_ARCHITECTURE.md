# 🌐 NLE — Nirva Language Engine Architecture (Phase 2)

> **Cost Code:** NLE · **Phase:** 2 (Knowledge Hub · Search · AI Memory · **Language**)
> **Status:** 🟢 Implemented (core) — `shared/language.ts` · `server/language/index.ts` · mounted ที่ `/api/v1/language/*` · tests `server/__tests__/language.test.ts`
> **Owner:** Founder (approve) · Chief Architect Agent (design) · Backend + Language Agent (implement)

เอกสารตาม [Documentation Standards](NIRVA_ENGINEERING_STANDARDS.md#3-documentation-standards) · Vision ฉบับเต็ม: [NIRVA_MEDIA_NLE_VISION.md → Project 2](NIRVA_MEDIA_NLE_VISION.md#project-2--nirva-language-engine-nle)

---

## 1. Vision & Purpose

NLE คือ **Shared Service ภาษากลาง** — ทุกผลิตภัณฑ์เรียกใช้ระบบเดียว ไม่มีใครสร้างระบบแปล/localize ของตัวเอง

ขอบเขต Phase 2 core (ส่วนที่ implement แล้ว):

| ความสามารถ | วิธี |
|------------|------|
| Language Registry | 21 ภาษา + metadata (script, RTL, currency, timezone) |
| Language Detection | Script-based (Unicode) — deterministic, offline |
| Translation | Provider abstraction + Translation Memory cache |
| Localization | Number · Currency · Date · Timezone · RTL ผ่าน `Intl` (ไม่พึ่ง API ภายนอก) |

ยังไม่อยู่ใน core (Phase ถัดไป): OCR · Speech · Subtitle · Auto Dub · Cross-language Search · Currency **conversion** (ต้องใช้ rate feed — ตอนนี้มีเฉพาะ format)

---

## 2. Reuse Analysis (Rule 5)

| ของเดิม | การตัดสินใจ |
|---------|-------------|
| Client i18n 17 ภาษา (`client/src/lib/i18n.ts`) | ✅ **คงไว้** — UI strings เป็น static; NLE registry ใช้รหัสภาษาชุดเดียวกัน + เพิ่ม pt/it/ru/he |
| LLM providers (`server/providers/`) | 🔁 **เชื่อมภายหลัง** — default provider ปัจจุบันคือ Ollama ตรง; สลับเป็น provider ใดก็ได้ผ่าน `setTranslationProvider()` |
| `Intl` (Node ICU) | ✅ **Reuse** — localization จริงโดย zero dependency |
| Database มาตรฐาน (`server/db`) | ✅ **Reuse** — ตาราง `nle_translations` ใช้คอลัมน์มาตรฐานชุดเดียวกับ NID |

---

## 3. Architecture

```
ทุกแอป → /api/v1/language/*  (หรือ import shared/language.ts โดยตรง)
              │
   ┌──────────┴──────────┐
   │  Pure (shared)       │  detectLanguageByScript · localize/format* · LANGUAGES
   │  Stateful (server)   │  translateText → [Translation Memory cache] → [Provider]
   └──────────────────────┘
Provider abstraction: default = Ollama · สลับได้ runtime ผ่าน setTranslationProvider()
```

หลักการ: **แปลครั้งเดียว ใช้ซ้ำทั้ง ecosystem** — Translation Memory ใน SQLite ทำ dedup ด้วย SHA-256 ของ `(source|target|tone|text)` และนับ cache hits เพื่อวัด token ที่ประหยัดได้ (Cost Standards)

---

## 4. Database

```sql
nle_translations (
  id, source_hash UNIQUE, source_lang, target_lang, tone,
  source_text, translated_text, provider, hits,
  + คอลัมน์มาตรฐาน (status, version, created/updated_by, deleted_at)
)
```

---

## 5. API

| Endpoint | Auth | หน้าที่ |
|----------|------|---------|
| `GET /api/v1/language/languages` | — | รายการภาษา + metadata |
| `POST /api/v1/language/detect` | — | ตรวจภาษาจาก script (offline) |
| `POST /api/v1/language/localize` | — | format number/currency/date + RTL flag |
| `POST /api/v1/language/translate` | ✅ session | แปลผ่าน provider + cache (limit 20k chars) |
| `GET /api/v1/language/stats` | — | entries + cache hits + providers ปัจจุบัน |
| `POST /api/v1/language/transcribe` | ✅ session | Speech-to-Text (NLE-1700) — raw audio ≤15MB, provider สลับได้ (default: Whisper ผ่าน `OPENAI_API_KEY`, `NLE_STT_PROVIDER=echo` สำหรับ demo/test) |

Error format: `{ error: { code: "NLE-xxx", message } }` — provider ล่มตอบ 502 พร้อม error ชัดเจน ไม่ throw

Mapping กับ Vision API: `translate()` ✅ · `detectLanguage()` ✅ · `localize()` ✅ · `convertDate()`/`convertTimezone()` ✅ (ใน localize) · ที่เหลือ (translateDocument, generateSubtitle, generateDub, ...) = Phase ถัดไป

---

## 6. Security

- `/translate` ต้อง authenticated (token มีต้นทุน) + จำกัดขนาด input 20,000 ตัวอักษร
- Provider timeout 60s — ไม่มี unbounded wait
- Cache เก็บเฉพาะข้อความที่ผู้ใช้ส่งแปล — soft delete ได้ตามมาตรฐาน

## 7. Testing

10 tests: registry/RTL, detection 8 scripts + edge cases, Latin low-confidence, Intl formatting, localize bundle, identity translation, unsupported target, **swappable provider + cache hit**, tone แยก cache, provider ล่มแล้ว degrade อย่างสุภาพ

## 8. Deployment

ไม่มี migration พิเศษ — ตารางสร้างเอง idempotent ตอน request แรก · config ผ่าน env: `NLE_OLLAMA_MODEL`, `VITE_OLLAMA_URL`

## 9. Changelog

| Version | วันที่ | รายการ |
|---------|-------|--------|
| 0.1.0 | 2026-07-05 | Core: registry 21 ภาษา, script detection, Intl localization, translation + provider abstraction + translation memory, API 5 endpoints, 10 tests |
| 0.2.0 | 2026-07-11 | Voice (NLE-1700): `/transcribe` STT ผ่าน provider สลับได้ (Whisper default, echo สำหรับ demo), +5 tests — Sprint 1 ของ 90-Day Plan |

## 10. Next Steps

1. ⬜ เชื่อม `server/providers/` เป็น provider ตัวเลือก (Anthropic/OpenAI/Google ผ่าน key ที่มีอยู่)
2. ⬜ `translateDocument()` — chunking + รวมผล
3. ⬜ Cross-language search + OCR/Speech (NLE-1600/1700)
4. ⬜ ผูก locale ของ user จาก NID (`users.locale`) เป็น default ของ localize

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_MEDIA_NLE_VISION.md](NIRVA_MEDIA_NLE_VISION.md) — Vision และ Cost Code NLE-xxxx
- [NID_IDENTITY_ARCHITECTURE.md](NID_IDENTITY_ARCHITECTURE.md) — Phase 1 (pattern เดียวกัน)
- [NIRVA_MASTER_EXECUTION_PLAN.md](NIRVA_MASTER_EXECUTION_PLAN.md) — Priority Phase 2
- [I18N_GUIDE.md](I18N_GUIDE.md) — UI i18n ฝั่ง client (ยังใช้ต่อ)
