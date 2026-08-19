# Agent Registry

> Complete registry of all 109 Nirva AI agents. All agents have detail pages (API-backed via `shared/agent-details.ts`, persisted in SQLite).

| # | Name | Role | Tier | Category | Detail Page |
|---|------|------|------|----------|-------------|
| 1 | **DESK** | Chief of Staff (reasoning + routing) | Self-Hosted | Core Control Tower | ✅ |
| 2 | **FLOW** | Operations Manager (workflow orchestration) | Self-Hosted | Core Control Tower | ✅ |
| 3 | **CARE** | HR & Payroll Lead (data processing) | Self-Hosted | Core Control Tower | ✅ |
| 4 | **TALLY** | Accounting Manager (financial analysis) | Self-Hosted | Core Control Tower | ✅ |
| 5 | **COIN** | Group CFO (financial strategy) | Self-Hosted | Finance & Operations | ✅ |
| 6 | **SEAL** | Group Legal (contract analysis) | Self-Hosted | Finance & Operations | ✅ |
| 7 | **AR-CHASE** | AR Collections (email drafting) | Self-Hosted | Finance & Operations | ✅ |
| 8 | **VAT-FILE** | VAT Filing (compliance automation) | Self-Hosted | Finance & Operations | ✅ |
| 9 | **PAYROLL-CALC** | Payroll Calculator (calculations) | Self-Hosted | Finance & Operations | ✅ |
| 10 | **RECONCILE** | Bank Reconciliation (data matching) | Self-Hosted | Finance & Operations | ✅ |
| 11 | **REACH** | Sales & Client Manager (proposal prep) | Self-Hosted | Sales & Procurement | ✅ |
| 12 | **PRICE** | Pricing Specialist (cost analysis) | Self-Hosted | Sales & Procurement | ✅ |
| 13 | **STAMP** | Document Manager (checklist generation) | Self-Hosted | Sales & Procurement | ✅ |
| 14 | **READ** | Procurement Analyst (TOR analysis) | Self-Hosted | Sales & Procurement | ✅ |
| 15 | **BRIEF** | Daily Briefing Generator (summarization) | Self-Hosted | DESK Family | ✅ |
| 16 | **SCHED** | Calendar Specialist (scheduling logic) | Self-Hosted | DESK Family | ✅ |
| 17 | **DRAFT** | Letter Drafter (Thai formal writing) | Self-Hosted | DESK Family | ✅ |
| 18 | **INCIDENT** | Incident Triage (assessment logic) | Self-Hosted | Operations & Quality | ✅ |
| 19 | **ROSTER** | Roster Specialist (scheduling) | Self-Hosted | Operations & Quality | ✅ |
| 20 | **QUALITY** | Quality Specialist (CAPA process) | Self-Hosted | Operations & Quality | ✅ |
| 21 | **CHECK** | Quality Manager (compliance tracking) | Self-Hosted | Operations & Quality | ✅ |
| 22 | **AUDIT-PREP** | Audit Preparation (documentation) | Self-Hosted | Operations & Quality | ✅ |
| 23 | **TEACH** | Curriculum Designer (content structure) | Self-Hosted | Teaching & Knowledge | ✅ |
| 24 | **GATHER** | Content Scout (content organization) | Self-Hosted | Teaching & Knowledge | ✅ |
| 25 | **WEAVE** | Curriculum Weaver (content synthesis) | Self-Hosted | Teaching & Knowledge | ✅ |
| 26 | **DISCIPLINE** | Disciplinary Letters (formal writing) | Self-Hosted | Specialized Roles | ✅ |
| 27 | **RECRUIT** | Recruitment Screening (candidate analysis) | Self-Hosted | Specialized Roles | ✅ |
| 28 | **ONBOARD** | Employee Onboarding (process automation) | Self-Hosted | Specialized Roles | ✅ |
| 29 | **SHELF** | Asset Management (inventory tracking) | Hybrid | Best Investigation | ✅ |
| 30 | **WHEEL** | Fleet Management (vehicle tracking) | Hybrid | Best Investigation | ✅ |
| 31 | **SHIELD** | Security Operations (threat assessment) | Hybrid | Best Investigation | ✅ |
| 32 | **GROW** | Business Development (growth strategy) | Hybrid | Best Investigation | ✅ |
| 33 | **TRUST** | Compliance Officer (regulatory) | Hybrid | Best Investigation | ✅ |
| 34 | **WIN** | Bid Manager (proposal strategy) | Hybrid | Best Investigation | ✅ |
| 35 | **RISK** | Risk Assessment (analysis) | Hybrid | Best Investigation | ✅ |
| 36 | **GREEN** | Sustainability Manager (ESG) | Hybrid | Best Investigation | ✅ |
| 37 | **SPARK-2** | Innovation Lab (R&D) | Hybrid | Best Investigation | ✅ |
| 38 | **RELATE** | Client Relations (CRM) | Hybrid | Best Investigation | ✅ |
| 39 | **PULSE-FM** | Facility Management (maintenance) | Hybrid | Best Investigation | ✅ |
| 40 | **AUDIT** | Internal Audit (compliance) | Hybrid | Best Investigation | ✅ |
| 41 | **ARCH** | System Architect (design) | Hybrid | NIRVA TECH | ✅ |
| 42 | **CODE** | Code Generator (development) | Hybrid | NIRVA TECH | ✅ |
| 43 | **MAP** | Project Mapper (planning) | Hybrid | NIRVA TECH | ✅ |
| 44 | **SHIP** | Deployment Manager (CI/CD) | Hybrid | NIRVA TECH | ✅ |
| 45 | **PIXEL** | UI Designer (interface) | Hybrid | NIRVA TECH | ✅ |
| 46 | **SKIN** | Theme Designer (styling) | Hybrid | NIRVA TECH | ✅ |
| 47 | **ROOT** | DevOps Engineer (infrastructure) | Hybrid | NIRVA TECH | ✅ |
| 48 | **POCKET** | Mobile Developer (apps) | Hybrid | NIRVA TECH | ✅ |
| 49 | **NET** | Network Engineer (connectivity) | Hybrid | NIRVA TECH | ✅ |
| 50 | **WALL** | Security Engineer (protection) | Hybrid | NIRVA TECH | ✅ |
| 51 | **VAULT** | Data Engineer (storage) | Hybrid | NIRVA TECH | ✅ |
| 52 | **SPARK** | AI Research (innovation) | Hybrid | NIRVA TECH | ✅ |
| 53 | **PATH** | User Journey (UX research) | Hybrid | NIRVA TECH | ✅ |
| 54 | **HUG** | Customer Support (help desk) | Hybrid | NIRVA TECH | ✅ |
| 55 | **PITCH** | Sales Engineer (demos) | Hybrid | NIRVA TECH | ✅ |
| 56 | **BUZZ** | Marketing Tech (automation) | Hybrid | NIRVA TECH | ✅ |
| 57 | **BLOOM** | Content Creator (creative) | Hybrid | MU UNIVERSE | ✅ |
| 58 | **VOICE** | Brand Voice (copywriting) | Hybrid | MU UNIVERSE | ✅ |
| 59 | **LEAF** | Wellness Coach (health) | Hybrid | MU UNIVERSE | ✅ |
| 60 | **SIP** | F&B Manager (hospitality) | Hybrid | MU UNIVERSE | ✅ |
| 61 | **CART** | E-commerce Manager (sales) | Hybrid | MU UNIVERSE | ✅ |
| 62 | **HUB** | Community Manager (engagement) | Hybrid | MU UNIVERSE | ✅ |
| 63 | **WAVE** | Social Media (content) | Hybrid | MU UNIVERSE | ✅ |
| 64 | **FRAME** | Visual Designer (graphics) | Hybrid | MU UNIVERSE | ✅ |
| 65 | **SLICE** | Video Editor (production) | Hybrid | MU UNIVERSE | ✅ |
| 66 | **INVITE** | Event Manager (planning) | Hybrid | MU UNIVERSE | ✅ |
| 67 | **DEEP** | Research Analyst (insights) | Hybrid | MU UNIVERSE | ✅ |
| 68 | **INK** | Technical Writer (documentation) | Hybrid | MU UNIVERSE | ✅ |
| 69 | **DROP** | Email Marketing (campaigns) | Hybrid | MU UNIVERSE | ✅ |
| 70 | **ECHO** | PR Manager (communications) | Hybrid | MU UNIVERSE | ✅ |
| 71 | **GIFT** | Loyalty Program (rewards) | Hybrid | MU UNIVERSE | ✅ |
| 72 | **PULSE** | Analytics Manager (metrics) | Hybrid | MU UNIVERSE | ✅ |
| 73 | **SCOUT** | Opportunity Scout (investment) | Hybrid | Investment & Legal | ✅ |
| 74 | **EGP-WATCH** | Daily e-GP Scanner (procurement) | Cloud | Real-time Data | ✅ |
| 75 | **COMPETITION** | Competitive Intelligence (market) | Cloud | Real-time Data | ✅ |
| 76 | **COST-OPT** | Cost Optimization (market data) | Cloud | Real-time Data | ✅ |
| 77 | **PROMPT-LAB** | Prompt Optimization (AI research) | Cloud | Real-time Data | ✅ |
| 78 | **RAG-BUILDER** | Knowledge Base Builder (vector DB) | Cloud | Real-time Data | ✅ |
| 79 | **POST-PROD** | Post Production (video) | Cloud | Media & Content | ✅ |
| 80 | **CLIPS** | Short-form Video (reels) | Cloud | Media & Content | ✅ |
| 81 | **SEO-CONTENT** | SEO Content Writer (optimization) | Cloud | Media & Content | ✅ |
| 82 | **PAID-ADS** | Paid Advertising (campaigns) | Cloud | Media & Content | ✅ |
| 83 | **EMAIL-NURTURE** | Email Nurture (sequences) | Cloud | Media & Content | ✅ |
| 84 | **GUEST-BRIEF** | Guest Briefing (hospitality) | Cloud | Media & Content | ✅ |
| 85 | **TOR-DEEP** | TOR Deep Analysis (procurement) | Cloud | Media & Content | ✅ |
| 86 | **CONTRACT-NEGOTIATE** | Contract Negotiation (legal) | Cloud | Media & Content | ✅ |
| 87 | **SAGE** | Wisdom Teacher (philosophy) | Cloud | Teacher Module | ✅ |
| 88 | **PHOTON** | Science Teacher (STEM) | Cloud | Teacher Module | ✅ |
| 89 | **KID** | Children's Educator (early learning) | Cloud | Teacher Module | ✅ |
| 90 | **GRAN** | Elder Wisdom (storytelling) | Cloud | Teacher Module | ✅ |
| 91 | **TALE** | Story Creator (narrative) | Cloud | Teacher Module | ✅ |
| 92 | **SPEAK** | Language Teacher (linguistics) | Cloud | Teacher Module | ✅ |
| 93 | **AIR** | Mindfulness Coach (meditation) | Cloud | Teacher Module | ✅ |
| 94 | **INDEX** | Knowledge Indexer (organization) | Cloud | Teacher Module | ✅ |
| 95 | **TRAINER** | Skills Trainer (professional) | Cloud | Teacher Module | ✅ |
| 96 | **SAFETY-AUDIT** | Safety Auditor (compliance) | Cloud | Teacher Module | ✅ |
| 97 | **TRUST-MBK** | Trust Manager MBK (operations) | Cloud | Teacher Module | ✅ |
| 98 | **TRUST-PARK** | Trust Manager Park (operations) | Cloud | Teacher Module | ✅ |
| 99 | **BULL** | Market Analyst (stocks) | Cloud | Investment & Legal | ✅ |
| 100 | **SKY** | Venture Scout (startups) | Cloud | Investment & Legal | ✅ |
| 101 | **FORGE** | Deal Maker (M&A) | Cloud | Investment & Legal | ✅ |
| 102 | **SEED** | Seed Investor (early stage) | Cloud | Investment & Legal | ✅ |
| 103 | **VERTEX** | Portfolio Manager (allocation) | Cloud | Investment & Legal | ✅ |
| 104 | **WAGE** | Compensation Analyst (salary) | Cloud | Investment & Legal | ✅ |
| 105 | **KEY** | IP Manager (patents) | Cloud | Investment & Legal | ✅ |
| 106 | **BID** | Auction Specialist (bidding) | Cloud | Investment & Legal | ✅ |
| 107 | **POT** | Fund Manager (pooled assets) | Cloud | Investment & Legal | ✅ |
| 108 | **MARK** | Brand Valuation (trademark) | Cloud | Investment & Legal | ✅ |
| 109 | **BILL** | Billing Specialist (invoicing) | Cloud | Investment & Legal | ✅ |

## By Category

- **NIRVA TECH**: 16 agents
- **MU UNIVERSE**: 16 agents
- **Best Investigation**: 12 agents
- **Investment & Legal**: 12 agents
- **Teacher Module**: 12 agents
- **Media & Content**: 8 agents
- **Finance & Operations**: 6 agents
- **Operations & Quality**: 5 agents
- **Real-time Data**: 5 agents
- **Core Control Tower**: 4 agents
- **Sales & Procurement**: 4 agents
- **DESK Family**: 3 agents
- **Teaching & Knowledge**: 3 agents
- **Specialized Roles**: 3 agents

## By Tier

| Tier | Count | Description |
|------|-------|-------------|
| Self-Hosted | 28 | Runs locally via Ollama — private, fast, no API cost |
| Hybrid | 45 | Local reasoning + cloud tools/APIs when needed |
| Cloud | 36 | Cloud-first — real-time data, media, external APIs |

## Agents with Full Detail Pages

- [DESK](/agents/desk)
- [FLOW](/agents/flow)
- [CARE](/agents/care)
- [TALLY](/agents/tally)
- [COIN](/agents/coin)
- [ARCH](/agents/arch)
- [CODE](/agents/code)
- [SEAL](/agents/seal)
- [BLOOM](/agents/bloom)
- [TEACH](/agents/teach)
- [REACH](/agents/reach)
- [BRIEF](/agents/brief)
- [SAGE](/agents/sage)
