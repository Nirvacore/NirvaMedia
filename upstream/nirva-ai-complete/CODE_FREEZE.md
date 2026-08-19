# Code Freeze — v1.0.0

> **อัปเดต:** 2026-06-25  
> **สถานะ:** 🔒 FEATURE FREEZE — ห้ามเพิ่มฟีเจอร์ใหม่จนกว่า **production deploy สำเร็จ**

---

## สรุป

GitHub `main` = **v1.0.0** (Brain OS ครบทุก phase #25–#29 merged)  
**ai.nirva.one ยัง HTTP 500** — ต้อง Publish บน Manus หรือ deploy Contabo

งานถัดไป: **deploy production เท่านั้น** → ดู [docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md)

---

## Version

| รายการ | ค่า |
|--------|-----|
| API health version (`main`) | `1.0.0` |
| Git branch | `main` |
| Tests | 98 unit tests |

> ⚠️ อย่า deploy จาก `claude/pensive-meitner-befe4h` — ดู [docs/CLAUDE_BRANCH_WARNING.md](docs/CLAUDE_BRANCH_WARNING.md)

---

## Brain OS (merged)

| Phase | Version | PR |
|-------|---------|-----|
| Foundation | v0.15 | #25 ✅ |
| Morning Briefing | v0.16 | #26 ✅ |
| Provider Hub | v0.17 | #27 ✅ |
| Coding Workspace | v0.18 | #28 ✅ |
| Enterprise | v1.0 | #29 ✅ |

---

## Production สถานะ

| URL | สถานะ |
|-----|--------|
| https://ai.nirva.one | ❌ Manus 500 — ยังไม่ได้ Publish v1.0 |
| GitHub main | ✅ v1.0.0 code ready |

---

## Deploy checklist

```bash
pnpm manus:config                    # copy-paste สำหรับ Manus UI
# → Publish ใน Manus
curl -s https://ai.nirva.one/api/health
# → "version": "1.0.0", "status": "healthy"

bash scripts/verify-production.sh https://ai.nirva.one
```

### หน้าที่ต้องเปิดได้หลัง deploy

- https://ai.nirva.one/demo
- https://ai.nirva.one/brains
- https://ai.nirva.one/providers
- https://ai.nirva.one/workspace
- https://ai.nirva.one/enterprise
- https://ai.nirva.one/api/docs

---

## งานที่อนุญาตหลัง freeze

1. **Publish Manus** — `bash deploy/manus/start.sh` + env จาก `env/ai.nirva.one.env.example`
2. **Deploy Contabo** — `bash deploy/contabo/deploy.sh`
3. **Hotfix** — deploy crash / env / build only (`hotfix/*`)

---

## งานที่ห้ามทำจนกว่า deploy สำเร็จ

- ❌ ฟีเจอร์ใหม่ (v1.1+)
- ❌ Refactor ใหญ่
- ❌ Stripe / SAML (ทำหลัง deploy สำเร็จ)

---

**หลัง `curl /api/health` ได้ `1.0.0` บน production → ยกเลิก freeze แล้วเริ่ม v1.1 (Stripe, SAML) ได้**
