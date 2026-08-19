# Nirva Ecosystem

> Unified product family under [Nirvacore](https://github.com/Nirvacore) — orchestrated by **Nirva AI Core** (this dashboard).

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │     Nirva AI Core (Control)     │
                    │  109 Agents · Memory · Workflows │
                    └──────────────┬──────────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
   ┌─────┴─────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐
   │Nirvaprocure│ │Nirvasell│ │NirvaMedia│ │  MUTEA  │ │Mahasunyata│
   │ Procurement│ │ Commerce│ │  Media  │ │Wellness │ │   Land    │
   └────────────┘ └─────────┘ └─────────┘ └─────────┘ └───────────┘
         │             │           │           │             │
         └─────────────┴───────────┼───────────┴─────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
        ┌─────┴─────┐        ┌────┴────┐        ┌─────┴─────┐
        │   Ollama  │        │ Qdrant  │        │    n8n    │
        │  :11434   │        │  :6333  │        │   :5678   │
        └───────────┘        └─────────┘        └───────────┘
```

---

## Products

| App | Role | Status | Primary Agents | Stack |
|-----|------|--------|----------------|-------|
| **Nirva AI Core** | Control Tower | Active | DESK, FLOW, CODE, ARCH | React, Express, SQLite, Qdrant |
| **Nirvaprocure** | Procurement OS | Active | READ, PRICE, REACH, STAMP | Next.js, NestJS, Flutter, PostgreSQL |
| **Nirvasell** | Commerce Engine | Development | REACH, GROW, BLOOM | Python, FastAPI |
| **NirvaMedia** | Content Studio | Development | PHOTON, SEO-CONTENT | React, Node.js |
| **MUTEA** | Wellness Platform | Development | TEACH, WEAVE, GATHER | React, Node.js |
| **MahasunyataLand** | Digital Sanctuary | Planned | SAGE, PHOTON | Web3, Three.js |

Canonical registry: [`shared/ecosystem.ts`](../shared/ecosystem.ts)

---

## Control Tower Responsibilities

Nirva AI Core dashboard orchestrates the ecosystem:

1. **Agent routing** — DESK routes requests to specialist agents across products
2. **Memory** — Qdrant stores cross-session context shared by agents
3. **Workflows** — n8n orchestrates multi-step pipelines (CODE → ARCH → SHIP)
4. **Health monitoring** — `/api/ecosystem` checks all product endpoints
5. **Unified settings** — Ollama, Qdrant, n8n URLs configured once

---

## Environment Variables

```env
# Control Tower (this app)
PORT=3000
DATABASE_PATH=./data/nirva.db

# Infrastructure
VITE_OLLAMA_URL=http://localhost:11434
VITE_QDRANT_URL=http://localhost:6333
VITE_N8N_URL=http://localhost:5678

# Ecosystem products (optional — health checks when set)
VITE_NIRVAPROCURE_URL=http://localhost:4000
VITE_NIRVASELL_URL=http://localhost:5000
VITE_NIRVAMEDIA_URL=http://localhost:5001
VITE_MUTEA_URL=http://localhost:5002
VITE_MAHA_URL=http://localhost:5003
```

---

## API

```
GET  /api/ecosystem          — all apps + live health status
GET  /api/ecosystem/:id      — single app detail + status
GET  /api/workflows          — n8n workflow list
POST /api/workflows/:id/run   — trigger workflow execution
GET  /api/workflows/templates — pre-built workflow templates
```

---

## Agent ↔ Product Mapping

| Product | Agents |
|---------|--------|
| Nirvaprocure | READ, PRICE, REACH, STAMP, WIN, TRUST |
| Nirvasell | REACH, GROW, BLOOM, PIXEL, COIN |
| NirvaMedia | PHOTON, SEO-CONTENT, BLOOM, GATHER, WEAVE |
| MUTEA | TEACH, WEAVE, GATHER, SAGE |
| MahasunyataLand | SAGE, PHOTON, KID |

---

## Dashboard UI

- **Ecosystem** page (`/ecosystem`) — product grid with health status, agent links, repo links
- **Workflows** page (`/workflows`) — n8n workflow templates and execution
- **Home** — ecosystem overview section with live status

---

## Related Docs

- [AGENTS.md](../AGENTS.md) — 109-agent routing model
- [ARCHITECTURE.md](../ARCHITECTURE.md) — system design
- [ROADMAP.md](../ROADMAP.md) — sprint plan
