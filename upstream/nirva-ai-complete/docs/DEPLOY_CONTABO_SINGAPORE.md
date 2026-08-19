# Deploy บน Contabo VPS ของคุณ — Singapore

> **VPS:** Cloud VPS 20 SSD · **62.146.233.240** · Ubuntu 24.04 · Singapore  
> **Domain:** ai.nirva.one  
> **โค้ด:** `main` = v1.0.0

---

## สถานะที่ตรวจพบ (2026-06-25)

| รายการ | สถานะ |
|--------|--------|
| `ai.nirva.one` DNS | ชี้ **Cloudflare** (104.21.41.118) → Manus **HTTP 500** |
| `62.146.233.240:3000` | มี service อื่น (`{"ok":true}`) — **ยังไม่ใช่ Nirva** |
| `62.146.233.240:80/443` | **404** — Nginx ยังไม่ตั้ง ai.nirva.one |

**สรุป:** VPS พร้อมติดตั้ง แต่ DNS ยังไม่ชี้มา VPS และยังไม่ได้ deploy Nirva stack

---

## ขั้นที่ 1 — SSH เข้า VPS

จาก Contabo panel ตั้ง **root password** หรือ **SSH key** แล้ว:

```bash
ssh root@62.146.233.240
```

ถ้า SSH ไม่ได้ → ใช้ **VNC** จาก panel: `194.233.74.149:63047`

---

## ขั้นที่ 2 — Bootstrap ครั้งเดียว (บน VPS)

```bash
git clone https://github.com/Nirvacore/nirva-AI.git /opt/nirva-AI
cd /opt/nirva-AI
sudo bash deploy/contabo/bootstrap-vps.sh
```

หรือทีละขั้น:

```bash
sudo bash deploy/contabo/install.sh
nano env/contabo.prod.env    # ตรวจ PUBLIC_URL=https://ai.nirva.one
bash deploy/contabo/deploy.sh
```

รอ ~5–15 นาที (build Docker ครั้งแรก)

### ตรวจบน VPS

```bash
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
```

ต้องได้:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  ...
}
```

---

## ขั้นที่ 3 — เปลี่ยน DNS (สำคัญ)

ใน **Cloudflare** (หรือ DNS ของ ai.nirva.one):

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| **A** | `ai` | **62.146.233.240** | **DNS only** (gray cloud) ชั่วคราว |

ลบหรือแก้ record เก่าที่ชี้ Manus / Cloudflare proxy ไปที่อื่น

รอ propagate 5–30 นาที แล้วตรวจ:

```bash
dig +short ai.nirva.one A
# ต้องได้ 62.146.233.240
```

---

## ขั้นที่ 4 — SSL (บน VPS)

```bash
sudo certbot --nginx -d ai.nirva.one
```

หลังได้ certificate แล้ว เปิด Cloudflare proxy (orange cloud) ได้ถ้าต้องการ — ตั้ง SSL mode เป็น **Full (strict)**

---

## ขั้นที่ 5 — Ollama models

Cloud VPS 20 (~12 GB RAM) รัน `llama3.1:8b` ได้:

```bash
docker exec -it $(docker ps -qf name=ollama) ollama pull llama3.1:8b
docker exec -it $(docker ps -qf name=ollama) ollama pull nomic-embed-text
```

---

## ขั้นที่ 6 — ตรวจจากเครื่องคุณ

```bash
curl -s https://ai.nirva.one/api/health | python3 -m json.tool
bash scripts/verify-production.sh https://ai.nirva.one
```

เปิดเบราว์เซอร์:

- https://ai.nirva.one/demo
- https://ai.nirva.one/enterprise
- https://ai.nirva.one/workspace

---

## แก้ปัญหา

### Port 3000 ชน

```bash
ss -tlnp | grep 3000
# Nirva ใช้ 127.0.0.1:3000 — ถ้ามี 0.0.0.0:3000 จาก app อื่น ให้ stop service นั้น
```

### Build ช้า / RAM เต็ม

```bash
docker system prune -f
free -h
```

ถ้า RAM ไม่พอ ลด stack ชั่วคราว — comment `n8n` ใน `docker-compose.prod.yml`

### ยังได้ Manus 500

DNS ยังชี้ Cloudflare/Manus — ตรวจ `dig ai.nirva.one` ต้องเป็น **62.146.233.240**

---

## อัปเดตหลัง merge

```bash
ssh root@62.146.233.240
cd /opt/nirva-AI && bash deploy/contabo/deploy.sh
```

---

## ข้อมูล VPS (เก็บไว้)

| รายการ | ค่า |
|--------|-----|
| IPv4 | 62.146.233.240 |
| IPv6 | 2407:3640:2335:6551::1 |
| VNC | 194.233.74.149:63047 |
| OS | Ubuntu 24.04 |
| Location | Singapore |
| Plan | Cloud VPS 20 SSD (~$9/mo) |

---

ดูเพิ่ม: [DEPLOY_CONTABO.md](DEPLOY_CONTABO.md) · [DEPLOY_NOW.md](DEPLOY_NOW.md)
