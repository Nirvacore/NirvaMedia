# Deploy ไป ai.nirva.one (Manus Space)

> **อัปเดต v0.14.2** — หลัง Manus 500 hotfix

---

## สถานะปัจจุบัน

| รายการ | ค่า |
|--------|-----|
| Production URL | **https://ai.nirva.one** |
| Hosting | Manus Space |
| GitHub version | **v0.14.2** |
| Production status | ❌ **Manus 500** — ต้อง Publish ใหม่ |

---

## Publish ขั้นตอน (v0.14.2)

### 1. Sync repo

Manus project → GitHub `Nirvacore/nirva-AI` → branch `main` (หรือ tag `v0.14.2`)

### 2. Build command

```bash
pnpm install --frozen-lockfile && pnpm build
```

### 3. Start command

```bash
bash deploy/manus/start.sh
```

### 4. Environment

```env
PUBLIC_URL=https://ai.nirva.one
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=/app/data/nirva.db

VITE_OAUTH_PORTAL_URL=https://manus.im
VITE_APP_ID=c94nssM6mCHuLojjUFdQbn
OAUTH_CALLBACK_PATH=/manus-oauth/callback
VITE_OAUTH_CALLBACK_PATH=/manus-oauth/callback
ALLOW_DEMO_AUTH=false
CORS_ORIGINS=https://ai.nirva.one
```

### 5. Publish → ตรวจ Logs

ต้องเห็น:
```
Server running on http://0.0.0.0:3000/
```

### 6. Verify

```bash
curl -s https://ai.nirva.one/api/health
# → "version": "0.14.2"

bash scripts/verify-production.sh https://ai.nirva.one
```

---

## OAuth

| รายการ | ค่า |
|--------|-----|
| Portal | https://manus.im |
| App ID | `c94nssM6mCHuLojjUFdQbn` |
| Callback | `https://ai.nirva.one/manus-oauth/callback` |

---

## ถ้ายัง 500

ดู [deploy/manus/README.md](../deploy/manus/README.md) และ [DEPLOY_NOW.md](DEPLOY_NOW.md)

| สาเหตุ | แก้ |
|--------|-----|
| Static hosting เก่า | Start = `node dist/index.js` |
| DB crash | `DATABASE_PATH=/app/data/nirva.db` |
| ไม่ bind port | `HOST=0.0.0.0` |

---

## ทางเลือก: ย้ายไป Contabo

ถ้า Manus แก้ยาก → [DEPLOY_CONTABO.md](DEPLOY_CONTABO.md) — ชี้ DNS ai.nirva.one ไป VPS
