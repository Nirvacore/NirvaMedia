# Nirva AI Brain Operating System

> **Master Vision Document** — v0.15 Foundation  
> จาก Dashboard → **AI Workspace** — ระบบปฏิบัติการสำหรับการทำงานยุค AI

---

## 1. Vision

**Nirva AI Workspace** ไม่ใช่ Chatbot เดี่ยว

เป็น 4 สิ่งรวมกัน:

| Pillar | คำอธิบาย |
|--------|----------|
| **AI Brain Marketplace** | App Store ของสมอง AI จากทั่วโลก — เลือกซื้อเฉพาะที่ต้องการ |
| **AI Agent Workforce** | 109+ agents ทำงานเป็นทีม ตาม Organization Blueprint |
| **Executive Dashboard** | Morning Briefing, Control Tower, Reports — เห็นภาพธุรกิจทั้งวัน |
| **Coding Workspace** | Idea → Design → Code → Test → Deploy ด้วยเสียงหรือภาษาธรรมดา |

### แนวคิดหลัก

> ทุกคนเข้าถึง **สมอง AI ระดับโลก** ได้  
> ผู้ใช้ฟรี → Open Source AI  
> Pro → จ่ายเฉพาะ Brain ที่ต้องการ  
> Enterprise → Multi-Agent + Private AI + Company Knowledge

**AI ไม่ใช่โปรแกรม — AI คือทีมงานดิจิทัลของมนุษย์**

---

## 2. สิ่งที่มีอยู่แล้ว (v0.14.4)

โค้ดปัจจุบันคือ **ฐานราก** ของ Brain OS แล้ว:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nirva AI Workspace (today)                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 109 Agents          shared/agents.ts + agent-prompts.ts       │
│  ✅ 8 AI Companies      shared/organization.ts                   │
│  ✅ Intent Router       server/router/ — DESK routes intent      │
│  ✅ Model ROUTER        shared/model-orchestration.ts — tier pick │
│  ✅ Control Tower       POST /api/chat/tower                     │
│  ✅ Agent Marketplace   /marketplace — skill packs               │
│  ✅ Multi-tenant        tenants + plugins                        │
│  ✅ Memory / RAG        Qdrant + Obsidian vault                  │
│  ✅ Voice               wake word + TTS + voice nav              │
│  ✅ Workflows           n8n templates CODE→ARCH→SHIP            │
│  ✅ MCP + Cursor        server/mcp/ — IDE integration            │
└─────────────────────────────────────────────────────────────────┘
```

### Gap → Brain OS

| มีแล้ว | ต้องสร้าง (v0.15+) |
|--------|---------------------|
| MODEL_CATALOG (10 models) | **Global Brain Catalog** (50+ providers) |
| ROUTER (tier: free/low/premium) | **Brain Router** (CEO/CTO/Dev/Marketing…) |
| Agent Marketplace (skill packs) | **Brain Marketplace** (ซื้อ Brain แยก) |
| Home dashboard | **🌅 Morning Briefing** |
| Chat | **Voice-first "จัดการให้"** command |
| Terminal (placeholder) | **Coding Workspace** (Idea→Deploy) |
| Pricing in settings | **Free / Pro / Enterprise** billing |

---

## 3. Global AI Brain Integration

### 3.1 Regions & Providers

Registry: `shared/brains.ts` → `GLOBAL_PROVIDERS[]`

#### 🇺🇸 USA
| Provider | Models | Strengths |
|----------|--------|-----------|
| OpenAI | GPT-4o, o1, o3 | Strategy, reasoning, business, coding |
| Anthropic | Claude Sonnet, Opus | Architecture, security, long context |
| Google | Gemini Pro, Flash | Multimodal, planning, research |
| Meta | Llama 3.x | Open source, self-host |
| Microsoft | Copilot stack | Enterprise integration |
| Cohere | Command R+ | RAG, enterprise search |
| Groq | LPU inference | Ultra-fast inference |

#### 🇨🇳 China
| Provider | Models | Strengths |
|----------|--------|-----------|
| DeepSeek | DeepSeek-V3, Coder | Coding, cost efficiency, reasoning |
| Alibaba | Qwen 2.5, Qwen-Coder | Coding, Chinese market, multilingual |
| 01.AI | Yi series | General, efficient |
| Baichuan | Baichuan 4 | Chinese enterprise |
| InternLM | InternLM 2.5 | Research, coding |
| Zhipu | GLM-4 | Chinese reasoning |

#### 🇯🇵 Japan
| Provider | Focus |
|----------|-------|
| Sakana AI | Evolutionary model merging |
| Preferred Networks | Robotics, industrial AI |
| Sony AI | Entertainment, sensing |
| Fujitsu AI | Enterprise, manufacturing |
| NEC AI | Public sector, security |

#### 🇮🇳 India
| Provider | Focus |
|----------|-------|
| Sarvam AI | Indic languages |
| Krutrim | Indian enterprise |
| AI4Bharat | Open source Indian NLP |
| Indian OSS | Local language models |

#### 🇪🇺 Europe
| Provider | Models | Strengths |
|----------|--------|-----------|
| Mistral AI | Mistral Large, Codestral | Open models, EU privacy |
| Aleph Alpha | Luminous | Enterprise privacy |
| Hugging Face | 500k+ models | OSS ecosystem hub |

---

## 4. AI Brain Categories

Registry: `shared/brains.ts` → `BRAIN_CATEGORIES`

### CEO Brain 🎯
- **หน้าที่:** วิเคราะห์ธุรกิจ, วาง Strategy, ตัดสินใจ
- **Models:** GPT-4o, Claude, Gemini, DeepSeek
- **Nirva Agents:** DESK, SAGE, BULL, FCAST
- **Plan:** Pro+

### CTO Brain 🏗️
- **หน้าที่:** System Architecture, Infrastructure, Security
- **Models:** Claude, GPT-4o, Qwen-Coder, DeepSeek-Coder
- **Nirva Agents:** ARCH, SHIELD, GUARD, NET, ROOT
- **Plan:** Pro+

### Developer Brain 💻
- **หน้าที่:** เขียน Code, Debug, Deploy
- **Models:** DeepSeek-Coder, Qwen-Coder, CodeLlama, StarCoder
- **Nirva Agents:** CODE, SHIP, ROOT, PIXEL
- **Plan:** Free (OSS) / Pro (cloud coders)

### Marketing Brain 📣
- **หน้าที่:** Content, Ads, Customer Research
- **Models:** GPT-4o, Claude, Gemini
- **Nirva Agents:** REACH, BLOOM, GROW, PIXEL, INK
- **Plan:** Pro

### Data Brain 📊
- **หน้าที่:** วิเคราะห์ข้อมูล, Dashboard, Forecast
- **Models:** GPT-4o, Gemini, Qwen
- **Nirva Agents:** TALLY, COIN, DEEP, FCAST
- **Plan:** Pro

### Voice Brain 🎙️
- **หน้าที่:** Voice Coding, Meeting, Assistant
- **Models:** Whisper, ElevenLabs, Google Speech
- **Nirva Agents:** VOICE, WAVE, DESK
- **Plan:** Pro

### Vision Brain 👁️
- **หน้าที่:** อ่านภาพ, เอกสาร, QC โรงงาน
- **Models:** GPT-4o Vision, Gemini Vision, LLaVA, Qwen-VL
- **Nirva Agents:** PIXEL, READ, GUARD
- **Plan:** Pro / Enterprise

---

## 5. AI Router System

### 5.1 Flow (extends existing ROUTER + Intent Router)

```
User Request (text / voice)
        │
        ▼
┌───────────────┐
│  DESK         │  Intent classification (existing server/router/)
│  Chief of Staff│
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Brain Router │  NEW: shared/brains.ts → planBrainTeam()
│  (v0.15)      │  เลือก Brain Category + Provider + Agent Team
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Model ROUTER │  EXISTING: shared/model-orchestration.ts
│  (ROUTER)     │  เลือก tier: free / low_cost / premium
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Agent Team   │  Execute via /api/chat/tower or workflow
│  + Plugins    │
└───────┬───────┘
        │
        ▼
    REPORT → Morning Dashboard / Tasks / Memory
```

### 5.2 Example: "ช่วยเปิดบริษัทใหม่"

```json
{
  "intent": "new_business",
  "brainTeam": {
    "primary": "ceo",
    "agents": ["DESK", "SAGE", "SEAL", "COIN", "REACH", "CODE"],
    "brains": ["ceo", "marketing", "developer"],
    "models": ["claude-sonnet", "gpt-4o", "deepseek-coder"],
    "workflow": "parallel_then_synthesize"
  }
}
```

Implementation path:
1. `planBrainTeam(message)` in `shared/brains.ts` (keyword + intent rules)
2. `POST /api/brains/plan` API route
3. Wire into `/api/chat/tower` and Morning Briefing

---

## 6. Pricing Model

| Plan | Brains | Models | Features |
|------|--------|--------|----------|
| **Free** | OSS only | Llama, Qwen, DeepSeek, Gemma, Mistral (Ollama) | Learn, code, basic agents |
| **Pro** | Pick & pay per Brain | + GPT, Claude, Gemini per brain | CEO, CTO, Dev, Marketing, Data, Voice, Vision |
| **Enterprise** | All + Private | Self-hosted + cloud hybrid | Private AI, ERP, security, SLA |

### Pro Brain Pricing (target)

| Brain | Monthly (THB) | Models included |
|-------|---------------|-----------------|
| Coding Brain | 299 | DeepSeek-Coder, Qwen-Coder, CodeLlama |
| Business Brain | 499 | GPT-4o, Claude, Gemini |
| Research Brain | 399 | Claude, Gemini, DeepSeek |
| Voice Brain | 199 | Whisper + TTS |
| Vision Brain | 299 | GPT-4V, Gemini Vision |

Storage: `shared/brains.ts` → `PRICING_PLANS`

---

## 7. User Experience

### 7.1 🌅 AI Morning Dashboard (v0.16)

ผู้ใช้เปิดตอนเช้า → เห็น:

```
🌅 Good morning, [Name]

📋 วันนี้ต้องทำ (3 tasks)
🏢 บริษัท: Revenue +12%, 2 issues
⚡ สำคัญ: Contract renewal ศุกร์นี้
⚠️ ปัญหา: Qdrant offline — ใช้ SQLite fallback

[จัดการให้]  🎙️
```

Data sources:
- Tasks API (`/api/tasks`)
- Reports API (`/api/reports`)
- Orchestration cost (`/api/orchestration/cost`)
- Infrastructure WS (`/ws`)

Agent: DESK + BRIEF (morning briefing agent)

### 7.2 Voice Command: "จัดการให้"

```
Voice → STT → DESK intent → Brain Team → Execute → TTS summary
```

Uses existing: `useVoiceNavigation`, `useTTS`, `/api/chat/tower`

### 7.3 Coding Workspace (v0.17)

```
Idea (voice/text)
  → AI Design (ARCH + PIXEL)
  → Code (CODE + Developer Brain)
  → Test (GUARD)
  → Deploy (SHIP + n8n workflow)
```

Pages: extend `/terminal` + new `/workspace` route

---

## 8. Technical Architecture (v0.15+)

### New modules

```
shared/
  brains.ts              ← Brain catalog, categories, planBrainTeam()
  brains-pricing.ts      ← (future) billing tiers

server/
  brains/
    index.ts             ← Brain router service
    providers/           ← Provider adapters (openai, anthropic, deepseek…)
  morning/
    index.ts             ← Morning briefing generator

client/src/pages/
  Brains.tsx             ← Brain Marketplace UI
  Morning.tsx            ← Morning Dashboard (or enhance Home)
  Workspace.tsx          ← Coding workspace
```

### API (planned)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/brains` | List all brains + availability per plan |
| GET | `/api/brains/categories` | CEO, CTO, Dev… |
| POST | `/api/brains/plan` | Plan team for user message |
| GET | `/api/brains/providers` | Global provider list |
| GET | `/api/morning/briefing` | Today's morning report |
| POST | `/api/morning/execute` | "จัดการให้" — run planned actions |

### Integration with existing MODEL_CATALOG

`shared/brains.ts` references `MODEL_CATALOG` from `model-orchestration.ts`.
Brain → Category → preferred Models → ROUTER picks actual model by tier + API keys.

---

## 9. Implementation Phases

### Phase 1 — Foundation (v0.15) ← **NOW**
- [x] `docs/NIRVA_BRAIN_OS.md` (this doc)
- [x] `shared/brains.ts` — types, catalog, `planBrainTeam()`
- [ ] `GET /api/brains` endpoint
- [ ] `/brains` page — Brain Marketplace browse
- [ ] Wire Brain Router into chat tower

### Phase 2 — Morning Experience (v0.16) ✅
- [x] Morning Briefing API + UI on Home
- [x] Voice "จัดการให้" end-to-end
- [ ] Push notifications for critical alerts

### Phase 3 — Provider Hub (v0.17) ✅
- [x] Live API calls: OpenAI, Anthropic, Gemini, DeepSeek
- [x] API key management in Settings + `/providers` hub page
- [x] `completeChat()` with Ollama fallback in `/api/chat`
- [ ] Usage metering per brain

### Phase 4 — Coding Workspace (v0.18) ✅
- [x] `/workspace` — Idea → Deploy pipeline
- [x] Task creation per stage (ARCH, CODE, WALL, SHIP, FLOW)
- [x] n8n `code-arch-ship` workflow trigger (simulated when offline)
- [x] Terminal `workspace plan` command
- [ ] Visual builder + voice coding
- [ ] Git integration

### Phase 5 — Enterprise (v1.0) ✅
- [x] Private deployment templates (Manus, Contabo, Docker)
- [x] ERP connectors (Nirvaprocure, Nirvasell, NirvaMedia, Mutea, Maha)
- [x] SSO status dashboard + audit logs
- [x] Billing summary from model_usage + plan limits
- [ ] Full Stripe checkout integration
- [ ] SAML / enterprise SSO

---

## 10. Mapping: Brain → Agent → Model

| Brain | Primary Agents | Default Model (Free) | Premium Model |
|-------|---------------|---------------------|---------------|
| CEO | DESK, SAGE | llama3.1:8b | claude-sonnet |
| CTO | ARCH, SHIELD | qwen2.5:14b | claude-sonnet |
| Developer | CODE, SHIP | deepseek-coder | claude-code |
| Marketing | REACH, BLOOM | mistral:7b | gpt-4o |
| Data | TALLY, DEEP | qwen2.5:14b | gemini-pro |
| Voice | VOICE, WAVE | whisper (local) | elevenlabs |
| Vision | PIXEL, READ | llava (local) | gpt-4o vision |

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Brain catalog size | 50+ models, 7 categories |
| Morning briefing generation | < 5s |
| Brain team planning | < 2s |
| Free tier daily users | Unlimited (OSS) |
| Pro conversion | Brain-specific upsell |
| Enterprise deals | Self-hosted + private data |

---

## 12. References

- Existing ROUTER: `docs/MODEL_ORCHESTRATION.md`
- Organization: `docs/NIRVA_ORGANIZATION_BLUEPRINT.md`
- Agents: `docs/AGENT_REGISTRY.md`
- Types: `shared/brains.ts`
- Roadmap: `ROADMAP.md` (v0.15+ section)

---

*Nirva AI Brain OS — "App Store ของสมอง AI" — ทุกคนเลือกสมอง เลือก Agent เลือกวิธีทำงาน*
