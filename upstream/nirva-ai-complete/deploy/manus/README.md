# Deploy บน Manus Space (ai.nirva.one)

> Hotfix guide หลัง Manus 500 — ใช้หลัง code freeze v0.14.1

## Start Command (ใน Manus project)

```bash
bash deploy/manus/start.sh
```

หรือ:

```bash
pnpm install --frozen-lockfile && pnpm build && node dist/index.js
```

## Environment (บังคับ)

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

## สาเหตุ Manus 500 ที่พบบ่อย

| ปัญหา | แก้ |
|--------|-----|
| ใช้ static hosting เก่า | ต้องรัน `node dist/index.js` (Node server) |
| `DATABASE_PATH` ไม่มีโฟลเดอร์ | ตั้ง `/app/data/nirva.db` + hotfix v0.14.2 |
| Listen แค่ localhost | ตั้ง `HOST=0.0.0.0` |
| Build ไม่ผ่าน | ดู Manus build logs — ต้อง `pnpm build` สำเร็จ |

## หลัง Publish

```bash
bash scripts/verify-production.sh https://ai.nirva.one
```

ควรได้ `version: 1.0.0` และ HTTP 200 ทุก endpoint
