# Agent Ecosystem

> Overview of the 109-agent Nirva AI ecosystem and how agents are organized, routed, and managed.

Full registry: [docs/AGENT_REGISTRY.md](docs/AGENT_REGISTRY.md)

---

## Cursor Cloud specific instructions

### What this project is

`nirva-dashboard` is a **full-stack AI Company OS** (React 19 + Vite 7 + Express API + SQLite). Version **0.14.0** includes Agent Router, Model ROUTER (orchestration), multi-tenant plugins, OAuth/PWA, and Contabo production deploy.

- **Frontend:** `client/` — SPA with Chat, Organization, Orchestration, Marketplace, etc.
- **Backend:** `server/` — Express API (`/api/*`), WebSocket, SQLite persistence, Ollama/Qdrant/n8n integration
- **Shared:** `shared/` — 109-agent registry, organization blueprint, model orchestration rules

### Running it

```bash
pnpm install
pnpm go          # one command: setup + dev server on :3000
# or
pnpm dev         # Vite + API on port 3000
```

| Command | Purpose |
|---------|---------|
| `pnpm check` | TypeScript (`tsc --noEmit`) |
| `pnpm test` | Vitest unit tests (56 tests) |
| `pnpm test:e2e` | Playwright E2E (24 tests) |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm mcp` | MCP stdio server for Cursor IDE |

### Cursor IDE + MCP

- `.cursorrules` — project architecture context for Cursor AI
- `.cursor/mcp.json` — auto-starts MCP server via `npx tsx server/mcp/index.ts`
- MCP tools: `chat_with_agent`, `search_memory`, `list_tasks`, `list_agents`, `check_infrastructure`, `search_obsidian`
- Requires Nirva API running at `NIRVA_URL` (default `http://localhost:3000`)

### Obsidian integration

- Install **Local REST API** plugin in Obsidian (default port `27124`)
- Settings → Integrations → URL + API key → Test
- Memory page → Obsidian section → search notes or Sync→Qdrant

### Optional services (Chat/Memory work best with these)

- **Ollama** — `http://localhost:11434` (LLM inference)
- **Qdrant** — `http://localhost:6333` (vector memory)
- **n8n** — `http://localhost:5678` (workflows)

Without Ollama, Chat falls back to mock responses. Configure URLs in **Settings** or env vars (`VITE_OLLAMA_URL`, etc.).

### Non-obvious caveats

- `pnpm install` may print `Ignored build scripts: @tailwindcss/oxide, esbuild` — **harmless**; do not run `pnpm approve-builds`.
- `pnpm` patches `wouter` via `patches/wouter@3.7.1.patch`. Pinned: `pnpm@10.4.1`.
- Production deploy: [docs/DEPLOY_CONTABO.md](docs/DEPLOY_CONTABO.md) — `bash deploy/contabo/deploy.sh` on Contabo VPS.
- Demo hub: `/demo` — links to all major features.

---

## Summary

| Metric | Value |
|--------|-------|
| Total agents | 109 |
| Self-Hosted | 28 |
| Hybrid | 45 |
| Cloud | 36 |
| Categories | 15 |
| Full detail pages | 13 |

---

## Tier Definitions

### Self-Hosted (28 agents)

Runs entirely on local infrastructure via **Ollama**. Best for sensitive data — HR, payroll, legal, finance, internal operations.

- **Models:** Qwen2.5 (14B–72B), DeepSeek-V2
- **Privacy:** Data never leaves your network
- **Examples:** DESK, FLOW, CARE, TALLY, COIN, SEAL

### Hybrid (45 agents)

Combines local reasoning with cloud tools and APIs when needed. Best for development, design, marketing, and cross-functional work.

- **Models:** Local LLM + cloud APIs (OpenAI, Anthropic, etc.)
- **Privacy:** Sensitive reasoning local; external tools may send data to cloud
- **Examples:** ARCH, CODE, BLOOM, SHIELD, PIXEL, ROOT

### Cloud (36 agents)

Cloud-first agents that depend on real-time data, media processing, or external APIs. Best for market data, content creation, education, and investment analysis.

- **Models:** Cloud LLMs + specialized APIs
- **Privacy:** Depends on provider; not suitable for confidential data
- **Examples:** EGP-WATCH, SAGE, PHOTON, BULL, SEO-CONTENT

---

## Categories

| Category | Agents | Focus |
|----------|--------|-------|
| Core Control Tower | 4 | DESK, FLOW, CARE, TALLY — central command |
| Finance & Operations | 6 | CFO, legal, AR, VAT, payroll, reconciliation |
| Sales & Procurement | 4 | Sales, pricing, documents, TOR analysis |
| DESK Family | 3 | Briefings, calendar, formal letters |
| Operations & Quality | 5 | Incidents, roster, quality, audit prep |
| Teaching & Knowledge | 3 | Curriculum design, content, synthesis |
| Specialized Roles | 3 | Discipline, recruitment, onboarding |
| Best Investigation | 12 | Assets, fleet, security, compliance, ESG |
| NIRVA TECH | 16 | Architecture, code, DevOps, design, AI research |
| MU UNIVERSE | 16 | Content, wellness, e-commerce, community, PR |
| Real-time Data | 5 | e-GP scanner, competition, cost optimization, RAG |
| Media & Content | 8 | Video, SEO, ads, email, contracts |
| Teacher Module | 11 | Education personas (SAGE, PHOTON, KID, GRAN, ...) |
| Investment & Legal | 12 | Market analysis, M&A, IP, billing, funds |

---

## Routing Model

All user requests flow through **DESK** (Chief of Staff):

```
User → DESK (intent analysis) → Route to specialist agent(s)
                                    │
                                    ├── Single agent (e.g. CODE for coding)
                                    ├── Multi-agent (CODE → ARCH → SHIP)
                                    └── Workflow (FLOW → n8n pipeline)
```

### DESK Routing Logic

1. **Receive** — Accept user request in any language
2. **Classify** — Determine intent and priority
3. **Decompose** — Break complex requests into subtasks
4. **Route** — Assign to the best specialist agent(s)
5. **Coordinate** — Monitor multi-agent workflows via FLOW
6. **Respond** — Return unified result to user

---

## Agents with Full Detail Pages

These 13 agents have complete profiles in `AgentDetail.tsx` with system prompts, capabilities, tools, models, and use cases:

| Agent | Role | Tier |
|-------|------|------|
| [DESK](/agents/desk) | Chief of Staff | Self-Hosted |
| [FLOW](/agents/flow) | Operations Manager | Self-Hosted |
| [CARE](/agents/care) | HR & Payroll Lead | Self-Hosted |
| [TALLY](/agents/tally) | Accounting Manager | Self-Hosted |
| [COIN](/agents/coin) | Group CFO | Self-Hosted |
| [ARCH](/agents/arch) | System Architect | Hybrid |
| [CODE](/agents/code) | Code Generator | Hybrid |
| [SEAL](/agents/seal) | Group Legal | Self-Hosted |
| [BLOOM](/agents/bloom) | Content Creator | Hybrid |
| [TEACH](/agents/teach) | Curriculum Designer | Self-Hosted |
| [REACH](/agents/reach) | Sales & Client Manager | Self-Hosted |
| [BRIEF](/agents/brief) | Daily Briefing Generator | Self-Hosted |
| [SAGE](/agents/sage) | Wisdom Teacher | Cloud |

Remaining 96 agents show name, role, tier, and category. Full profiles are planned for Sprint 2.

---

## Agent Detail Schema

```typescript
interface AgentDetailData {
  name: string;
  role: string;
  tier: "self-hosted" | "hybrid" | "cloud";
  category: string;
  systemPrompt: string;      // Editable in UI
  capabilities: string[];    // e.g. "Intent classification"
  tools: string[];           // e.g. "Router API", "n8n API"
  model: string;             // e.g. "Qwen2.5-72B"
  description: string;       // Thai description
  useCases: string[];        // Practical examples
}
```

---

## Naming Convention

Agent names are short, memorable codenames (3–12 characters):

- **Single word:** DESK, FLOW, CARE, CODE, SAGE
- **Compound:** AR-CHASE, VAT-FILE, PAYROLL-CALC, EGP-WATCH
- **Suffixed:** SPARK-2, PULSE-FM, TRUST-MBK, TRUST-PARK

Each name maps to a specific domain expertise. The codename is used in routing, chat, task assignment, and voice commands.

---

## Data Sources

| Data | Location | Format |
|------|----------|--------|
| Agent list (109) | `shared/agents.ts` | TypeScript registry |
| Agent details | `shared/agent-details.ts` | Full profiles via `buildAgentDetail()` |
| Organization | `shared/organization.ts` | 8 AI Companies + Control Tower |
| Model orchestration | `shared/model-orchestration.ts` | ROUTER tiers + rules |
| Chat / API | `server/api.ts` | Live Ollama + SQLite history |

---

## Adding a New Agent

1. Add entry to `allAgents` array in `Agents.tsx`
2. (Optional) Add full profile to `agentDetails` in `AgentDetail.tsx`
3. Update count in Dashboard stats if tier distribution changes
4. Add to Mind Map if part of core architecture
5. Update [docs/AGENT_REGISTRY.md](docs/AGENT_REGISTRY.md)

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.
