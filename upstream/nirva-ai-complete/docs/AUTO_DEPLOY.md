# Auto Deploy — GitHub → Contabo VPS

> **ทำไม Agent ทำแทนไม่ได้?** — ไม่มี SSH key / รหัส VPS ของคุณ  
> **ทำให้ออโต้ได้ยังไง?** — ตั้งครั้งเดียว ~2 นาที → หลังนั้น **push `main` = deploy เอง**

---

## ภาพรวม

```
push main → GitHub Actions → SCP โค้ดไป VPS → docker compose up → health check
```

- **ไม่ต้อง** `git clone` บน VPS (แก้ปัญหา repo private)
- **ไม่ต้อง** รัน docker บน Mac
- **ไม่ต้อง** SSH manual ทุกครั้ง

---

## ครั้งเดียว — บน Mac

```bash
cd nirva-AI   # หรือ clone มาก่อน
bash scripts/setup-contabo-auto-deploy.sh
```

สคริปต์จะ:

1. สร้าง SSH key `~/.ssh/nirva_contabo_deploy`
2. บอกให้รัน `ssh-copy-id` ไป `62.146.233.240`
3. ตั้ง GitHub Secrets (`CONTABO_HOST`, `CONTABO_USER`, `CONTABO_SSH_KEY`)

### หรือตั้ง Secrets manual

https://github.com/Nirvacore/nirva-AI/settings/secrets/actions

| Secret | ค่า |
|--------|-----|
| `CONTABO_HOST` | `62.146.233.240` |
| `CONTABO_USER` | `root` |
| `CONTABO_SSH_KEY` | เนื้อหา private key (ทั้งไฟล์) |

---

## Deploy ครั้งแรก

1. ไป https://github.com/Nirvacore/nirva-AI/actions/workflows/deploy-contabo.yml  
2. กด **Run workflow** → branch `main`  
3. รอ ~10–15 นาที (build Docker บน VPS)

หรือ:

```bash
git commit --allow-empty -m "trigger deploy"
git push origin main
```

---

## ตรวจผล

```bash
# บน VPS (หลัง Actions เขียว)
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool

# หลัง DNS ชี้มา VPS
curl -s https://ai.nirva.one/api/health | python3 -m json.tool
```

ต้องได้ `"version": "1.0.0"`

---

## DNS (ยังต้องทำเองครั้งเดียว)

Cloudflare → `ai.nirva.one` A → `62.146.233.240`

ถ้ามี stack เดิม (`nirvacore`) ใช้ port 80/443 — ตั้ง proxy เดิมชี้มา `http://127.0.0.1:3000` แทน certbot

---

## หลังนี้

ทุกครั้งที่ merge/push ขึ้น `main` (ยกเว้นแก้แค่ `.md`) → deploy อัตโนมัติ

---

## Troubleshooting

| ปัญหา | แก้ |
|-------|-----|
| Workflow skip "Secrets not configured" | รัน `setup-contabo-auto-deploy.sh` |
| SSH permission denied | รัน `ssh-copy-id` อีกครั้ง |
| Port 80/443 busy | ปกติ — ใช้ reverse proxy เดิม → :3000 |
| Build ช้า | รอ 15 นาที ดู Actions logs |

ดูเพิ่ม: [DEPLOY_CONTABO_SINGAPORE.md](DEPLOY_CONTABO_SINGAPORE.md)
