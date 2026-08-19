# ⚠️ อย่าใช้ branch นี้สำหรับ production

Branch `claude/pensive-meitner-befe4h` มีการเปลี่ยนแปลงที่ **ไม่ควร merge** ลง `main` โดยไม่ review:

| ปัญหา | รายละเอียด |
|--------|------------|
| `shared/agents.ts` | ลด/เปลี่ยน registry 109 agents อย่างมาก |
| ไม่ sync กับ v0.14 | ไม่มี Model ROUTER live, code freeze baseline |
| Deploy workflow | push ไป branch นี้ทำให้ CI/deploy สับสน |

## ใช้ branch ไหน

| วัตถุประสงค์ | Branch |
|-------------|--------|
| **Production deploy** | `main` หรือ tag `v0.14.2` |
| **Release อ้างอิง** | `release/v0.14.1` |
| **ทดลอง Claude** | `claude/pensive-meitner-befe4h` เท่านั้น — ไม่ deploy |

## Deploy ที่ถูกต้อง

```bash
git checkout main
git pull
bash deploy/contabo/deploy.sh   # บน VPS
# หรือ Publish บน Manus จาก main
```

ดู [DEPLOY_NOW.md](DEPLOY_NOW.md)
