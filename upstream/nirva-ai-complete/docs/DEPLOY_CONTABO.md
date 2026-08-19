# Deploy บน Contabo VPS → ai.nirva.one

> **ใช่ — เอาขึ้น Contabo ได้เลย** นี่คือ production ที่เราควบคุมเอง ไม่ต้องพึ่ง Manus Publish

---

## ภาพรวม

```
Contabo VPS (Ubuntu)
├── Docker Compose
│   ├── dashboard  → 127.0.0.1:3000
│   ├── ollama     → internal
│   ├── qdrant     → internal
│   └── n8n        → internal
├── Nginx          → :443 ai.nirva.one
└── Certbot        → SSL ฟรี
```

---

## สิ่งที่ต้องมี

| รายการ | รายละเอียด |
|--------|------------|
| Contabo VPS | แนะนำ 4 vCPU / 8 GB RAM ขึ้นไป (Ollama กิน RAM) |
| Domain | `ai.nirva.one` → A record ชี้ IP ของ VPS |
| SSH | root หรือ sudo user |

---

## ติดตั้งครั้งแรก (บน VPS)

```bash
ssh root@YOUR_CONTABO_IP

# Clone + install Docker, Nginx
git clone https://github.com/Nirvacore/nirva-AI.git /opt/nirva-AI
cd /opt/nirva-AI
sudo bash deploy/contabo/install.sh
```

แก้ config:

```bash
nano /opt/nirva-AI/env/contabo.prod.env
```

Deploy:

```bash
bash deploy/contabo/deploy.sh
```

SSL (หลัง DNS ชี้มาแล้ว):

```bash
sudo certbot --nginx -d ai.nirva.one
```

ดาวน์โหลด model:

```bash
docker exec -it $(docker ps -qf name=ollama) ollama pull llama3.1:8b
docker exec -it $(docker ps -qf name=ollama) ollama pull nomic-embed-text
```

---

## อัปเดตหลัง merge PR

```bash
cd /opt/nirva-AI
bash deploy/contabo/deploy.sh
```

---

## เปลี่ยนจาก Manus → Contabo

ถ้า ai.nirva.one ชี้ Manus อยู่:

1. ใน DNS (Cloudflare / registrar) เปลี่ยน **A record** → IP Contabo VPS
2. รอ propagate (~5–30 นาที)
3. รัน `certbot --nginx -d ai.nirva.one` บน VPS
4. เปิด https://ai.nirva.one/api/health ตรวจ version

---

## ทดสอบหลัง deploy

```bash
curl https://ai.nirva.one/api/health
# ควรได้ version 0.14.2

# ตรวจครบทุก endpoint:
bash scripts/verify-production.sh https://ai.nirva.one
# หรือ: pnpm verify:prod https://ai.nirva.one
```

ดูคู่มือ deploy ทีละขั้น: **[DEPLOY_NOW.md](DEPLOY_NOW.md)**

เปิดเบราว์เซอร์:
- https://ai.nirva.one/demo
- https://ai.nirva.one/organization
- https://ai.nirva.one/chat

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| `docker-compose.prod.yml` | Production stack |
| `env/contabo.prod.env.example` | Environment template |
| `deploy/contabo/install.sh` | ติดตั้งครั้งแรก |
| `deploy/contabo/deploy.sh` | Deploy / อัปเดต |
| `deploy/contabo/nginx-http.conf` | Nginx ก่อน SSL |
| `deploy/contabo/nginx-ai.nirva.one.conf` | Nginx หลัง SSL (อ้างอิง) |

---

## Contabo vs Manus

| | Manus Space | Contabo VPS |
|--|-------------|-------------|
| ควบคุม | Manus dashboard | คุณเอง 100% |
| Ollama/GPU | จำกัด | ใส่ GPU VPS ได้ |
| Deploy | กด Publish | `deploy.sh` |
| ราคา | ตาม Manus plan | ตาม Contabo VPS |

**แนะนำ:** ใช้ **Contabo เป็น production หลัก** สำหรับ Nirva AI stack เต็มรูปแบบ

---

ดูเพิ่ม: [DEPLOYMENT.md](../DEPLOYMENT.md) · [DEMO.md](DEMO.md)
