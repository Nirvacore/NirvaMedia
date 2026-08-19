# Architecture

> System design for Nirva AI Core Dashboard v0.1

---

## Overview

Nirva Dashboard is a **React SPA** served by Vite in development and Express in production. The frontend is self-contained with static agent data; backend services (Ollama, Qdrant, n8n, FastAPI) are configured via Settings and will be integrated in upcoming sprints.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Dashboard│ │  Agents  │ │   Chat   │ │ Voice/Tasks  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │            │            │               │            │
│  ┌────┴────────────┴────────────┴───────────────┴───────┐   │
│  │              Shared Layer                              │   │
│  │  ThemeContext · LanguageContext · Sidebar · i18n       │   │
│  └────────────────────────┬───────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP / WebSocket (planned)
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
        │  Ollama   │ │ Qdrant  │ │    n8n    │
        │  :11434   │ │  :6333  │ │   :5678   │
        └───────────┘ └─────────┘ └───────────┘
              │
        ┌─────┴─────┐
        │  FastAPI  │  (planned — agent router / DESK)
        │   :8000   │
        └───────────┘
```

---

## Frontend Architecture

### Routing

Wouter handles client-side routing. All routes are defined in `client/src/App.tsx`:

```
/              → Home (Dashboard)
/agents        → Agents (Directory)
/agents/:name  → AgentDetail
/mindmap       → MindMap
/voice         → Voice
/chat          → Chat
/tasks         → Tasks
/files         → Files
/terminal      → Terminal
/settings      → Settings
/404           → NotFound
```

### Layout Pattern

Every page follows the same layout shell:

```
┌────────┬──────────────────────────────────┐
│        │                                  │
│ Sidebar│         Main Content             │
│ 72px   │    (ml-[72px] padding)           │
│        │                                  │
└────────┴──────────────────────────────────┘
```

The sidebar expands to 224px on hover, showing labels and the theme/language switcher.

### State Management

| Layer | Tool | Scope |
|-------|------|-------|
| Theme | `ThemeContext` + localStorage | `light` / `pastel` / `dark` |
| Language | `LanguageContext` + localStorage | 17 locales via `i18n.ts` |
| Page state | React `useState` | Per-page local state |
| Server state | — | Planned: TanStack Query |

No global state library is used in v0.1. Agent data is hardcoded in page components.

### Component Hierarchy

```
App
├── ErrorBoundary
├── ThemeProvider
│   └── LanguageProvider
│       └── TooltipProvider
│           ├── Toaster (sonner)
│           └── Router (Switch)
│               └── [Page]
│                   ├── Sidebar (persistent)
│                   └── <main> content
```

### UI Library

Built on **shadcn/ui** (Radix primitives + Tailwind). Components live in `client/src/components/ui/`. Custom components:

- `Sidebar.tsx` — Brand rail, navigation, theme dots, language picker
- `ErrorBoundary.tsx` — Graceful error recovery
- `Map.tsx` — Google Maps via Forge API (optional)

---

## Agent Ecosystem Model

### Routing Flow (DESK-centric)

```
User Request
     │
     ▼
┌─────────┐
│  DESK   │  Chief of Staff — intent classification, priority, routing
└────┬────┘
     │
     ├──▶ Specialist Agent (CODE, CARE, TALLY, ...)
     │
     ├──▶ FLOW (workflow orchestration via n8n)
     │
     └──▶ Multi-agent pipeline (CODE → ARCH → SHIP)
```

### Tier Model

| Tier | Infrastructure | Data Privacy | Latency |
|------|---------------|--------------|---------|
| Self-Hosted | Ollama on local GPU/CPU | Highest — data never leaves network | Low |
| Hybrid | Ollama + selective cloud APIs | Medium — sensitive data local, tools cloud | Medium |
| Cloud | External APIs, cloud LLMs | Depends on provider | Variable |

### Agent Data Schema

```typescript
interface Agent {
  name: string;           // e.g. "DESK"
  role: string;           // e.g. "Chief of Staff (reasoning + routing)"
  tier: "self-hosted" | "hybrid" | "cloud";
  category: string;       // e.g. "Core Control Tower"
}

interface AgentDetail extends Agent {
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  model: string;          // e.g. "Qwen2.5-72B / DeepSeek-V2"
  description: string;
  useCases: string[];
}
```

Agent list: `client/src/pages/Agents.tsx` (109 agents)
Agent details: `client/src/pages/AgentDetail.tsx` (13 with full profiles)

---

## Voice Architecture

```
Microphone
    │
    ▼
Web Speech API (SpeechRecognition)
    │
    ├── Wake word detection ("Hey Nirva", "เฮ้ เนอร์ว่า", ...)
    │
    ├── Voice navigation (useVoiceNavigation)
    │       └── Keyword match → wouter setLocation()
    │
    └── Command processing (generateAIResponse)
            └── TTS response (useTTS → SpeechSynthesis)
```

Voice navigation supports 4 routes with multi-language keywords. See [docs/VOICE_COMMANDS.md](docs/VOICE_COMMANDS.md).

---

## Server Architecture

### Development

Vite dev server on port 3000 with HMR, Tailwind, and React plugin.

### Production

```
pnpm build
  ├── vite build          → dist/public/ (static assets)
  └── esbuild server/     → dist/index.js (Express server)

pnpm start
  └── Express serves dist/public/ + SPA fallback (index.html for all routes)
```

`server/index.ts` is a minimal static file server. No API routes exist yet.

---

## Planned Backend (Sprint 1+)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Dashboard  │────▶│   FastAPI    │────▶│    DESK      │
│   (React)    │     │   Gateway    │     │   Router     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────┴──────┐       ┌──────┴──────┐
                     │  WebSocket  │       │   Agents    │
                     │  (status)   │       │  (Ollama)   │
                     └─────────────┘       └─────────────┘
```

See [API.md](API.md) for the planned endpoint specification.

---

## File Map

| Path | Purpose |
|------|---------|
| `client/src/App.tsx` | Root app, routing, providers |
| `client/src/pages/*.tsx` | Route pages |
| `client/src/components/Sidebar.tsx` | Navigation shell |
| `client/src/contexts/ThemeContext.tsx` | 3-theme switcher |
| `client/src/contexts/LanguageContext.tsx` | i18n provider |
| `client/src/lib/i18n.ts` | Translation strings (17 locales) |
| `client/src/hooks/useVoiceNavigation.ts` | Voice → route mapping |
| `client/src/hooks/useTTS.ts` | Text-to-speech |
| `client/src/index.css` | Design tokens (Minimal Garden) |
| `server/index.ts` | Production Express server |
| `shared/const.ts` | Shared constants |
| `vite.config.ts` | Vite + Tailwind + Manus runtime |

---

## Security Considerations

- API keys must be stored in environment variables, never committed
- Settings page URLs are client-side only in v0.1 (not persisted to server)
- OAuth flow is prepared via `VITE_OAUTH_PORTAL_URL` + `VITE_APP_ID` but not active
- Agent system prompts are editable in the UI and stored in local state only

---

## Performance

- Vite code splitting per route (lazy loading planned)
- Tailwind CSS 4 with `@tailwindcss/vite` (no PostCSS pipeline)
- React 19 with concurrent features
- Mind Map (@xyflow/react) is the heaviest page — consider lazy import
