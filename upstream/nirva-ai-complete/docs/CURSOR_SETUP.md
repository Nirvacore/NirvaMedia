# Cursor IDE Setup — Nirva AI

> เปิด project ใน Cursor แล้ว AI จะรู้จักสถาปัตยกรรมทันที (v0.14.4+)

---

## 1. เปิด project

```bash
git clone https://github.com/Nirvacore/nirva-AI.git
cd nirva-AI
pnpm install
pnpm dev    # API + client ที่ http://localhost:3000
```

เปิดโฟลเดอร์ใน **Cursor IDE** — rules โหลดอัตโนมัติจาก:

| ไฟล์ | หน้าที่ |
|------|--------|
| `.cursorrules` | Master context — routes, API, agents, deploy |
| `.cursor/rules/*.mdc` | Domain rules (API, frontend, agents, integrations…) |
| `.cursor/mcp.json` | MCP server config |

---

## 2. MCP Server (คุยกับ Nirva จาก Cursor)

MCP เปิดอัตโนมัติผ่าน `.cursor/mcp.json` เมื่อเปิด project

หรือรันเอง:

```bash
pnpm dev    # terminal 1 — API ต้องทำงานก่อน
pnpm mcp    # terminal 2 — stdio MCP server
```

### Tools ที่ใช้ได้

| Tool | ทำอะไร |
|------|--------|
| `chat_with_agent` | คุยกับ agent ใดก็ได้ (DESK, CODE, ARCH…) |
| `search_memory` | ค้นหา Qdrant semantic memory |
| `list_tasks` | ดู task queue |
| `list_agents` | list agents ตาม category |
| `check_infrastructure` | ping Ollama / Qdrant / n8n |
| `search_obsidian` | ค้นหาใน Obsidian vault |

### Env (ใน `.cursor/mcp.json`)

```json
{
  "NIRVA_URL": "http://localhost:3000",
  "OBSIDIAN_URL": "http://localhost:27124",
  "OBSIDIAN_API_KEY": ""
}
```

---

## 3. Obsidian Integration

### ติดตั้ง plugin

1. เปิด Obsidian → Settings → Community plugins
2. ติดตั้ง **Local REST API**
3. Enable plugin → copy **API key**
4. Default port: `27124`

### ตั้งค่าใน Nirva

1. เปิด http://localhost:3000/settings → **Integrations**
2. Obsidian REST API URL: `http://localhost:27124`
3. API Key: วาง key จาก plugin
4. กด **ทดสอบ** → ต้องได้ "Obsidian เชื่อมต่อได้แล้ว ✓"

### ใช้งาน

- **Memory** → scroll ลง Obsidian Vault → ค้นหา note หรือ **Sync → Qdrant**
- **MCP** → `search_obsidian` tool จาก Cursor chat
- **API** → `POST /api/obsidian/search`, `POST /api/obsidian/sync`

---

## 4. Optional services

| Service | URL | ใช้กับ |
|---------|-----|--------|
| Ollama | http://localhost:11434 | Chat, embeddings |
| Qdrant | http://localhost:6333 | Vector memory / RAG |
| n8n | http://localhost:5678 | Workflows |
| Obsidian | http://localhost:27124 | Vault search + sync |

ตั้งค่าใน Settings → LLM / Models หรือ env vars

---

## 5. คำสั่ง dev

```bash
pnpm check        # TypeScript
pnpm test         # 56 unit tests
pnpm test:e2e     # Playwright (ต้องมี dev server)
pnpm manus:config # copy-paste config สำหรับ deploy Manus
```

---

## 6. Production

- Target: https://ai.nirva.one
- Deploy: `docs/DEPLOY_NOW.md`
- ห้าม deploy จาก `claude/pensive-meitner-befe4h`

---

## 7. Cursor rules ทั้งหมด

```
.cursorrules
.cursor/rules/nirva-architecture.mdc   (alwaysApply)
.cursor/rules/nirva-docs.mdc           (alwaysApply)
.cursor/rules/nirva-api.mdc
.cursor/rules/nirva-frontend.mdc
.cursor/rules/nirva-agents.mdc
.cursor/rules/nirva-integrations.mdc
.cursor/rules/nirva-deploy.mdc
.cursor/rules/nirva-ecosystem.mdc
.cursor/rules/nirva-shared.mdc
```

รวม ~1,300 บรรทัด context — Cursor รู้ routes, API, agents, deploy, ecosystem ครบ
