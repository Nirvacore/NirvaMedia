# Deploy ตอนนี้ — ai.nirva.one (v1.0)

> **สถานะ (2026-06-25):** GitHub `main` = **v1.0.0** (Brain OS ครบทุก phase) · **ai.nirva.one = Manus HTTP 500** (ยังไม่ได้ Publish)

---

## ลิงก์สำคัญ

| รายการ | URL |
|--------|-----|
| Production | https://ai.nirva.one |
| Health check | https://ai.nirva.one/api/health |
| Demo Hub | https://ai.nirva.one/demo |
| API Docs | https://ai.nirva.one/api/docs |
| GitHub repo | https://github.com/Nirvacore/nirva-AI |
| Release / main | https://github.com/Nirvacore/nirva-AI/tree/main |

### PRs ที่ merge แล้ว (Brain OS)

| PR | Version | สถานะ |
|----|---------|--------|
| [#25](https://github.com/Nirvacore/nirva-AI/pull/25) | v0.15 Brain OS | ✅ Merged |
| [#26](https://github.com/Nirvacore/nirva-AI/pull/26) | v0.16 Morning Briefing | ✅ Merged |
| [#27](https://github.com/Nirvacore/nirva-AI/pull/27) | v0.17 Provider Hub | ✅ Merged |
| [#28](https://github.com/Nirvacore/nirva-AI/pull/28) | v0.18 Coding Workspace | ✅ Merged |
| [#29](https://github.com/Nirvacore/nirva-AI/pull/29) | v1.0 Enterprise | ✅ Merged |

---

## ขั้นที่ 0 — ตรวจสถานะปัจจุบัน

```bash
curl -sS -o /tmp/health.json -w "HTTP %{http_code}\n" https://ai.nirva.one/api/health
cat /tmp/health.json | head -c 200
```

| ผล | ความหมาย |
|----|----------|
| `200` + `"version":"1.0.0"` | ✅ Deploy สำเร็จ |
| `200` + `"version":"0.18.0"` | ⚠️ Deploy แล้วแต่ยังไม่ใช่ v1.0 — sync `main` ใหม่ |
| `500` + HTML "Manus Space" | ❌ ยังไม่ได้ Publish / server crash |

```bash
bash scripts/verify-production.sh https://ai.nirva.one
```

---

## ขั้นที่ 1 — Copy-paste สำหรับ Manus (เร็วสุด)

```bash
pnpm manus:config
```

หรือดูด้านล่างทีละขั้น

---

## ทาง A — Manus Space (ai.nirva.one)

### 1. Sync โค้ด

ใน [Manus project](https://manus.im) ที่ผูก ai.nirva.one:

- **GitHub:** `Nirvacore/nirva-AI`
- **Branch:** `main` (ต้องมี commit v1.0 Enterprise)

### 2. Build command

```bash
pnpm install --frozen-lockfile && pnpm build
```

### 3. Start command

```bash
bash deploy/manus/start.sh
```

> ห้ามใช้ static hosting — ต้องรัน Node server (`node dist/index.js`)

### 4. Environment variables

คัดลอกจาก `env/ai.nirva.one.env.example`:

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

Optional (cloud LLM — หรือตั้งใน Settings UI):

```env
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GOOGLE_API_KEY=
```

### 5. กด Publish

ดู **Logs** — ต้องเห็น:

```
→ Starting Nirva AI on 0.0.0.0:3000
Server running on http://0.0.0.0:3000/
```

### 6. ตรวจหลัง Publish

```bash
curl -s https://ai.nirva.one/api/health | python3 -m json.tool
# ต้องได้: "version": "1.0.0", "status": "healthy"

bash scripts/verify-production.sh https://ai.nirva.one
```

### 7. ทดสอบหน้าใหม่ (Brain OS v1.0)

| หน้า | URL |
|------|-----|
| Morning Briefing | https://ai.nirva.one/ |
| Brains | https://ai.nirva.one/brains |
| Providers | https://ai.nirva.one/providers |
| Workspace | https://ai.nirva.one/workspace |
| Enterprise | https://ai.nirva.one/enterprise |

---

## ทาง B — Contabo VPS (แนะนำระยะยาว)

> **VPS ของคุณ:** `62.146.233.240` (Singapore, Ubuntu 24.04)  
> คู่มือเต็ม: **[DEPLOY_CONTABO_SINGAPORE.md](DEPLOY_CONTABO_SINGAPORE.md)**

### 1. DNS

`ai.nirva.one` → A record → **62.146.233.240** (ตอนนี้ยังชี้ Cloudflare/Manus → 500)

### 2. Bootstrap บน VPS

```bash
ssh root@62.146.233.240
git clone https://github.com/Nirvacore/nirva-AI.git /opt/nirva-AI
cd /opt/nirva-AI && sudo bash deploy/contabo/bootstrap-vps.sh
```

หรือทีละขั้น: `install.sh` → แก้ `env/contabo.prod.env` → `deploy.sh` → `certbot --nginx -d ai.nirva.one`

### 3. อัปเดตครั้งถัดไป

```bash
cd /opt/nirva-AI
git pull origin main
bash deploy/contabo/deploy.sh
```

### 4. GitHub Actions auto-deploy (optional)

ตั้ง Secrets ใน repo → Settings → Secrets:

- `CONTABO_HOST` — IP VPS
- `CONTABO_SSH_KEY` — private key
- `CONTABO_USER` — `root`

จากนั้น: Actions → **Deploy Contabo** → Run workflow

---

## ทาง C — Render.com (ทดสอบก่อน)

1. https://render.com → New → Blueprint
2. Connect `Nirvacore/nirva-AI` branch `main`
3. ใช้ `render.yaml`
4. `curl https://YOUR-APP.onrender.com/api/health`

---

## Troubleshooting Manus 500

| อาการ | แก้ |
|-------|-----|
| HTML "Manus Space" 500 | Start = `bash deploy/manus/start.sh` ไม่ใช่ static |
| Build fail | ดู logs — `pnpm build` ต้องผ่าน |
| Crash ทันที | `DATABASE_PATH=/app/data/nirva.db` + `HOST=0.0.0.0` |
| OAuth redirect ผิด | ครบ `PUBLIC_URL` + `OAUTH_CALLBACK_PATH` |
| version เก่า | Branch ต้องเป็น `main` ล่าสุด (v1.0.0) |

---

## หลัง deploy สำเร็จ

1. ยกเลิก code freeze — ดู [CODE_FREEZE.md](../CODE_FREEZE.md)
2. เปิด https://ai.nirva.one/demo ส่งให้ทีมทดสอบ
3. งานถัดไป (optional):
   - **Stripe checkout** เต็มรูปแบบ
   - **SAML / Enterprise SSO**

---

## คำสั่งสรุป (Mac / local)

```bash
# 1. ตรวจ production
curl -s https://ai.nirva.one/api/health | python3 -m json.tool

# 2. พิมพ์ config สำหรับวางใน Manus UI
pnpm manus:config

# 3. verify ทุก endpoint
bash scripts/verify-production.sh https://ai.nirva.one
```
