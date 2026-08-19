# Deploy 3 ขั้น — Contabo 62.146.233.240

> **สถานะ:** Nirva ยังไม่ขึ้นบน VPS จนกว่าจะรัน `deploy-now.sh` จาก Mac  
> **nirvacore** ใช้ port 3000-3001 · **Nirva** จะใช้ **3100**

---

## วิธีที่ 1 — บน Mac (แนะนำ)

### ถ้า `nirva-AI` มีอยู่แล้ว / pull error / ไม่มี deploy-now.sh

```bash
cd ~/nirva-AI
git fetch origin main
git checkout main
git reset --hard origin/main
bash scripts/deploy-now.sh
```

หรือใช้สคริปต์รวม:

```bash
cd ~/nirva-AI
bash scripts/mac-fix-and-deploy.sh
```

### Clone ใหม่ (ถ้า repo พัง)

```bash
cd ~
mv nirva-AI nirva-AI.old
git clone https://github.com/Nirvacore/nirva-AI.git
cd nirva-AI
bash scripts/deploy-now.sh
```

- ใส่รหัส **root** เมื่อ SSH ถาม  
- รอ **~15 นาที**  
- **ห้าม** รัน docker บน Mac  
- **ห้าม** รัน `/opt/nirva-AI/...` บน Mac — คำสั่งนั้นสำหรับ **VPS เท่านั้น**

---

## วิธีที่ 2 — อยู่บน VPS แล้ว (SSH)

รอให้ Mac รัน `deploy-now.sh` ก่อน — repo เป็น private ห้าม `git clone` แบบไม่มี token

ตรวจสถานะ:

```bash
bash /opt/nirva-AI/deploy/contabo/vps-status.sh
```

หรือ manual:

```bash
curl -s http://127.0.0.1:3100/api/health | python3 -m json.tool
docker ps | grep nirva
```

---

## DNS (Cloudflare)

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | ai | **62.146.233.240** | DNS only ชั่วคราว |

ตรวจ: `dig +short ai.nirva.one A` → ต้องได้ `62.146.233.240` (ไม่ใช่ 104.21.x Cloudflare)

---

## Proxy (nirvacore ใช้ 80/443 อยู่แล้ว)

หลัง deploy สำเร็จ รันบน VPS:

```bash
bash /opt/nirva-AI/deploy/contabo/wire-proxy.sh
```

หรือ manual: `ai.nirva.one` → `http://172.17.0.1:3100` ใน Traefik dynamic config

---

## ตรวจสำเร็จ

```bash
# บน VPS
curl -s http://127.0.0.1:3100/api/health
# → "version":"1.0.0"

# จาก Mac (หลัง DNS + proxy)
curl -s https://ai.nirva.one/api/health | python3 -m json.tool
# หรือ
pnpm deploy:check
```

---

## แก้ปัญหาเร็ว

| อาการ | แก้ |
|-------|-----|
| `already exists and is not an empty directory` | `cd ~/nirva-AI` ไม่ต้อง clone ใหม่ |
| `divergent branches` / pull fail | `git fetch origin main && git reset --hard origin/main` |
| `deploy-now.sh: No such file` | repo เก่า — reset hard หรือ clone ใหม่ |
| `/opt/nirva-AI/...` บน Mac | **ผิดเครื่อง** — รันบน VPS หลัง SSH เท่านั้น |
| git clone ขอ password | ใช้ `deploy-now.sh` จาก Mac แทน |
| port 3001 404 | เป็น nirvacore API — ไม่ใช่ Nirva |
| certbot port busy | ใช้ `wire-proxy.sh` ไม่ต้อง certbot |
| ai.nirva.one 500 | DNS ยังชี้ Cloudflare/Manus |

---

ดูเต็ม: [AUTO_DEPLOY.md](AUTO_DEPLOY.md) · [DEPLOY_CONTABO_SINGAPORE.md](DEPLOY_CONTABO_SINGAPORE.md)
