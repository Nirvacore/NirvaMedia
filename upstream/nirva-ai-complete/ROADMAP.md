# Roadmap

> Sprint plan and milestones for Nirva AI Core Dashboard.

Current version: **v1.0.0 (Enterprise)** — ดู [docs/NIRVA_BRAIN_OS.md](docs/NIRVA_BRAIN_OS.md)

---

## v0.15+ — Nirva AI Brain Operating System

> จาก Dashboard → **AI Workspace** — App Store ของสมอง AI

| Phase | Version | Focus | Status |
|-------|---------|-------|--------|
| 1 | v0.15 | Brain catalog, API, `/brains` page, `planBrainTeam()` | ✅ Foundation |
| 2 | v0.16 | 🌅 Morning Briefing, voice "จัดการให้" | ✅ Done |
| 3 | v0.17 | Live provider hub (GPT, Claude, Gemini, DeepSeek) | ✅ Done |
| 4 | v0.18 | Coding Workspace (Idea → Deploy) | ✅ Done |
| 5 | v1.0 | Enterprise (private AI, ERP, billing) | ✅ Done |

**Master doc:** [docs/NIRVA_BRAIN_OS.md](docs/NIRVA_BRAIN_OS.md)

---

## Sprint Overview

| Sprint | Title | Status | Tasks | Progress |
|--------|-------|--------|-------|----------|
| 1 | Pipeline ทำงานจริง | Complete | 5 | 5/5 (100%) |
| 2 | Database & Persistence | Complete | 5 | 5/5 (100%) |
| 3 | Memory System | Complete | 3 | 3/3 (100%) |
| 4 | Ecosystem & n8n | Complete | 3 | 3/3 (100%) |
| 5 | Production Hardening | Complete | 6 | 6/6 (100%) |

---

## Sprint 1: Pipeline ทำงานจริง

**Goal:** Connect dashboard to real backend services. Replace mock data with live API calls.

| # | Task | Status | Description |
|---|------|--------|-------------|
| 1.1 | FastAPI gateway setup | ✅ | Express API router with health, agents, chat endpoints |
| 1.2 | Ollama integration | ✅ | Chat page connects to Ollama via `/api/chat` |
| 1.3 | Agent status API | ✅ | `/api/agents/stats` and `/api/agents` endpoints |
| 1.4 | Settings persistence | ✅ | localStorage via `shared/settings.ts` |
| 1.5 | Environment config | ✅ | `.env.example` + documentation |

**Exit criteria:** Chat sends real messages to Ollama. Dashboard shows live agent count. Health check returns service status.

---

## Sprint 2: Database & Persistence

**Goal:** Persistent storage for agents, tasks, chat history, and user settings.

| # | Task | Status | Description |
|---|------|--------|-------------|
| 2.1 | SQLite schema | ✅ | Agents, tasks, chat_sessions, chat_messages tables |
| 2.2 | Agent registry migration | ✅ | 109 agents seeded from `shared/agents.ts` on first run |
| 2.3 | Agent detail completion | ✅ | Full profiles for all 109 agents via `buildAgentDetail()` |
| 2.4 | Chat history persistence | ✅ | Messages saved to DB; history loaded per agent |
| 2.5 | Task persistence | ✅ | CRUD task queue backed by SQLite |

**Exit criteria:** Agent edits persist across sessions. Chat history survives page reload. Tasks survive server restart.

---

## Sprint 3: Memory System

**Goal:** Agent memory via Qdrant vector database for context-aware conversations.

| # | Task | Status | Description |
|---|------|--------|-------------|
| 3.1 | Qdrant integration | ✅ | Vector storage via Qdrant REST API + SQLite metadata |
| 3.2 | RAG pipeline | ✅ | Embeddings (Ollama) + semantic search injected into chat |
| 3.3 | Memory UI | ✅ | `/memory` page — view, add, search, delete agent memories |

**Exit criteria:** Agents remember previous conversations. RAG-BUILDER agent can create knowledge bases.

---

## Sprint 4: Ecosystem & n8n Integration

**Goal:** Unified Nirva Ecosystem hub + workflow orchestration via n8n for multi-agent pipelines.

| # | Task | Status | Description |
|---|------|--------|-------------|
| 4.1 | Nirva Ecosystem registry | ✅ | 6 products in `shared/ecosystem.ts` + health monitoring |
| 4.2 | Workflow templates | ✅ | 6 pre-built templates (CODE→ARCH→SHIP, procurement, RAG, etc.) |
| 4.3 | n8n + task orchestration | ✅ | FLOW triggers workflows; simulated mode when n8n offline |

**Exit criteria:** Ecosystem page shows all Nirvacore products. User can trigger workflows from dashboard. FLOW orchestrates CODE → ARCH → SHIP pipeline.

---

## Sprint 5: Production Hardening

**Goal:** Production-ready deployment with monitoring, security, and performance.

| # | Task | Status | Description |
|---|------|--------|-------------|
| 5.1 | CI/CD pipeline | ✅ | GitHub Actions: typecheck, test, build, E2E |
| 5.2 | Unit tests (Vitest) | ✅ | 16 tests — agents, ecosystem, embeddings, workflows |
| 5.3 | E2E tests (Playwright) | ✅ | Smoke tests for home, agents, ecosystem, API |
| 5.4 | Security hardening | ✅ | CORS, rate limiting, security headers, 1MB body limit |
| 5.5 | Performance optimization | ✅ | Lazy-loaded routes, vendor/ui/markdown code splitting |
| 5.6 | Monitoring & metrics | ✅ | `GET /api/metrics` — request stats, memory, uptime |

**Exit criteria:** Automated deploy on merge to main. Test coverage > 80%. Sub-2s page load. Zero critical security issues.

---

## Beyond Sprint 5

| Feature | Priority | Description |
|---------|----------|-------------|
| Command palette (Cmd+K) | ✅ | Global search — pages, 109 agents, workflow actions |
| Real-time WebSocket | ✅ | Live agent stats, tasks, infrastructure via `/ws` |
| OAuth authentication | ✅ | OAuth portal + demo login, SQLite sessions |
| PWA support | ✅ | Install prompt, offline banner, enhanced service worker |
| Agent marketplace | ✅ | Browse, publish, import, rate agent configuration packs |
| AI Organization OS | ✅ | 8 AI Companies, Agent Router, Control Tower, Reports |
| Multi-tenant | ✅ | Organization-level agent isolation, tenant switcher |
| Plugin system | ✅ | Built-in plugins per agent, install/invoke API |
| OpenAPI + Swagger | ✅ | `/api/openapi.json` + `/api/docs` interactive explorer |
| LLM intent classifier | ✅ | Ollama-based router with keyword fallback |
| Model Orchestration (ROUTER) | ✅ | Auto model tier selection + cost control |
| Storybook | ✅ | Button, Badge, Card component stories |
| Mobile app (POCKET agent) | Low | React Native companion app |

---

## Documentation Milestones

| Milestone | Status |
|-----------|--------|
| README.md | ✅ |
| ARCHITECTURE.md | ✅ |
| AGENTS.md + AGENT_REGISTRY.md | ✅ |
| API.md | ✅ |
| DEPLOYMENT.md | ✅ |
| DESIGN_SYSTEM.md | ✅ |
| CONTRIBUTING.md | ✅ |
| CHANGELOG.md | ✅ |
| ROADMAP.md | ✅ |
| VOICE_COMMANDS.md | ✅ |
| I18N_GUIDE.md | ✅ |
| .env.example | ✅ |
| Storybook | ✅ |
| API docs (OpenAPI/Swagger) | ✅ |

---

## How to Track Progress

Sprint progress is displayed on the Dashboard home page (`/`). Update sprint data in `client/src/pages/Home.tsx` as tasks complete.

For issues and feature requests, use GitHub Issues on the [nirva-AI repository](https://github.com/Nirvacore/nirva-AI).
