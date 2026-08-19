export type AgentTier = "self-hosted" | "hybrid" | "cloud";

export interface Agent {
  name: string;
  role: string;
  tier: AgentTier;
  category: string;
}

export const AGENTS: Agent[] = [
  {
    "name": "DESK",
    "role": "Chief of Staff (reasoning + routing)",
    "tier": "self-hosted",
    "category": "Core Control Tower"
  },
  {
    "name": "FLOW",
    "role": "Operations Manager (workflow orchestration)",
    "tier": "self-hosted",
    "category": "Core Control Tower"
  },
  {
    "name": "CARE",
    "role": "HR & Payroll Lead (data processing)",
    "tier": "self-hosted",
    "category": "Core Control Tower"
  },
  {
    "name": "TALLY",
    "role": "Accounting Manager (financial analysis)",
    "tier": "self-hosted",
    "category": "Core Control Tower"
  },
  {
    "name": "COIN",
    "role": "Group CFO (financial strategy)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "SEAL",
    "role": "Group Legal (contract analysis)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "AR-CHASE",
    "role": "AR Collections (email drafting)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "VAT-FILE",
    "role": "VAT Filing (compliance automation)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "PAYROLL-CALC",
    "role": "Payroll Calculator (calculations)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "RECONCILE",
    "role": "Bank Reconciliation (data matching)",
    "tier": "self-hosted",
    "category": "Finance & Operations"
  },
  {
    "name": "REACH",
    "role": "Sales & Client Manager (proposal prep)",
    "tier": "self-hosted",
    "category": "Sales & Procurement"
  },
  {
    "name": "PRICE",
    "role": "Pricing Specialist (cost analysis)",
    "tier": "self-hosted",
    "category": "Sales & Procurement"
  },
  {
    "name": "STAMP",
    "role": "Document Manager (checklist generation)",
    "tier": "self-hosted",
    "category": "Sales & Procurement"
  },
  {
    "name": "READ",
    "role": "Procurement Analyst (TOR analysis)",
    "tier": "self-hosted",
    "category": "Sales & Procurement"
  },
  {
    "name": "BRIEF",
    "role": "Daily Briefing Generator (summarization)",
    "tier": "self-hosted",
    "category": "DESK Family"
  },
  {
    "name": "SCHED",
    "role": "Calendar Specialist (scheduling logic)",
    "tier": "self-hosted",
    "category": "DESK Family"
  },
  {
    "name": "DRAFT",
    "role": "Letter Drafter (Thai formal writing)",
    "tier": "self-hosted",
    "category": "DESK Family"
  },
  {
    "name": "INCIDENT",
    "role": "Incident Triage (assessment logic)",
    "tier": "self-hosted",
    "category": "Operations & Quality"
  },
  {
    "name": "ROSTER",
    "role": "Roster Specialist (scheduling)",
    "tier": "self-hosted",
    "category": "Operations & Quality"
  },
  {
    "name": "QUALITY",
    "role": "Quality Specialist (CAPA process)",
    "tier": "self-hosted",
    "category": "Operations & Quality"
  },
  {
    "name": "CHECK",
    "role": "Quality Manager (compliance tracking)",
    "tier": "self-hosted",
    "category": "Operations & Quality"
  },
  {
    "name": "AUDIT-PREP",
    "role": "Audit Preparation (documentation)",
    "tier": "self-hosted",
    "category": "Operations & Quality"
  },
  {
    "name": "TEACH",
    "role": "Curriculum Designer (content structure)",
    "tier": "self-hosted",
    "category": "Teaching & Knowledge"
  },
  {
    "name": "GATHER",
    "role": "Content Scout (content organization)",
    "tier": "self-hosted",
    "category": "Teaching & Knowledge"
  },
  {
    "name": "WEAVE",
    "role": "Curriculum Weaver (content synthesis)",
    "tier": "self-hosted",
    "category": "Teaching & Knowledge"
  },
  {
    "name": "DISCIPLINE",
    "role": "Disciplinary Letters (formal writing)",
    "tier": "self-hosted",
    "category": "Specialized Roles"
  },
  {
    "name": "RECRUIT",
    "role": "Recruitment Screening (candidate analysis)",
    "tier": "self-hosted",
    "category": "Specialized Roles"
  },
  {
    "name": "ONBOARD",
    "role": "Employee Onboarding (process automation)",
    "tier": "self-hosted",
    "category": "Specialized Roles"
  },
  {
    "name": "SHELF",
    "role": "Asset Management (inventory tracking)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "WHEEL",
    "role": "Fleet Management (vehicle tracking)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "SHIELD",
    "role": "Security Operations (threat assessment)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "GROW",
    "role": "Business Development (growth strategy)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "TRUST",
    "role": "Compliance Officer (regulatory)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "WIN",
    "role": "Bid Manager (proposal strategy)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "RISK",
    "role": "Risk Assessment (analysis)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "GREEN",
    "role": "Sustainability Manager (ESG)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "SPARK-2",
    "role": "Innovation Lab (R&D)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "RELATE",
    "role": "Client Relations (CRM)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "PULSE-FM",
    "role": "Facility Management (maintenance)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "AUDIT",
    "role": "Internal Audit (compliance)",
    "tier": "hybrid",
    "category": "Best Investigation"
  },
  {
    "name": "ARCH",
    "role": "System Architect (design)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "CODE",
    "role": "Code Generator (development)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "MAP",
    "role": "Project Mapper (planning)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "SHIP",
    "role": "Deployment Manager (CI/CD)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "PIXEL",
    "role": "UI Designer (interface)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "SKIN",
    "role": "Theme Designer (styling)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "ROOT",
    "role": "DevOps Engineer (infrastructure)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "POCKET",
    "role": "Mobile Developer (apps)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "NET",
    "role": "Network Engineer (connectivity)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "WALL",
    "role": "Security Engineer (protection)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "VAULT",
    "role": "Data Engineer (storage)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "SPARK",
    "role": "AI Research (innovation)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "PATH",
    "role": "User Journey (UX research)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "HUG",
    "role": "Customer Support (help desk)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "PITCH",
    "role": "Sales Engineer (demos)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "BUZZ",
    "role": "Marketing Tech (automation)",
    "tier": "hybrid",
    "category": "NIRVA TECH"
  },
  {
    "name": "BLOOM",
    "role": "Content Creator (creative)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "VOICE",
    "role": "Brand Voice (copywriting)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "LEAF",
    "role": "Wellness Coach (health)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "SIP",
    "role": "F&B Manager (hospitality)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "CART",
    "role": "E-commerce Manager (sales)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "HUB",
    "role": "Community Manager (engagement)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "WAVE",
    "role": "Social Media (content)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "FRAME",
    "role": "Visual Designer (graphics)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "SLICE",
    "role": "Video Editor (production)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "INVITE",
    "role": "Event Manager (planning)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "DEEP",
    "role": "Research Analyst (insights)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "INK",
    "role": "Technical Writer (documentation)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "DROP",
    "role": "Email Marketing (campaigns)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "ECHO",
    "role": "PR Manager (communications)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "GIFT",
    "role": "Loyalty Program (rewards)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "PULSE",
    "role": "Analytics Manager (metrics)",
    "tier": "hybrid",
    "category": "MU UNIVERSE"
  },
  {
    "name": "SCOUT",
    "role": "Opportunity Scout (investment)",
    "tier": "hybrid",
    "category": "Investment & Legal"
  },
  {
    "name": "EGP-WATCH",
    "role": "Daily e-GP Scanner (procurement)",
    "tier": "cloud",
    "category": "Real-time Data"
  },
  {
    "name": "COMPETITION",
    "role": "Competitive Intelligence (market)",
    "tier": "cloud",
    "category": "Real-time Data"
  },
  {
    "name": "COST-OPT",
    "role": "Cost Optimization (market data)",
    "tier": "cloud",
    "category": "Real-time Data"
  },
  {
    "name": "PROMPT-LAB",
    "role": "Prompt Optimization (AI research)",
    "tier": "cloud",
    "category": "Real-time Data"
  },
  {
    "name": "RAG-BUILDER",
    "role": "Knowledge Base Builder (vector DB)",
    "tier": "cloud",
    "category": "Real-time Data"
  },
  {
    "name": "POST-PROD",
    "role": "Post Production (video)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "CLIPS",
    "role": "Short-form Video (reels)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "SEO-CONTENT",
    "role": "SEO Content Writer (optimization)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "PAID-ADS",
    "role": "Paid Advertising (campaigns)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "EMAIL-NURTURE",
    "role": "Email Nurture (sequences)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "GUEST-BRIEF",
    "role": "Guest Briefing (hospitality)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "TOR-DEEP",
    "role": "TOR Deep Analysis (procurement)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "CONTRACT-NEGOTIATE",
    "role": "Contract Negotiation (legal)",
    "tier": "cloud",
    "category": "Media & Content"
  },
  {
    "name": "SAGE",
    "role": "Wisdom Teacher (philosophy)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "PHOTON",
    "role": "Science Teacher (STEM)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "KID",
    "role": "Children's Educator (early learning)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "GRAN",
    "role": "Elder Wisdom (storytelling)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "TALE",
    "role": "Story Creator (narrative)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "SPEAK",
    "role": "Language Teacher (linguistics)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "AIR",
    "role": "Mindfulness Coach (meditation)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "INDEX",
    "role": "Knowledge Indexer (organization)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "TRAINER",
    "role": "Skills Trainer (professional)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "SAFETY-AUDIT",
    "role": "Safety Auditor (compliance)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "TRUST-MBK",
    "role": "Trust Manager MBK (operations)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "TRUST-PARK",
    "role": "Trust Manager Park (operations)",
    "tier": "cloud",
    "category": "Teacher Module"
  },
  {
    "name": "BULL",
    "role": "Market Analyst (stocks)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "SKY",
    "role": "Venture Scout (startups)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "FORGE",
    "role": "Deal Maker (M&A)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "SEED",
    "role": "Seed Investor (early stage)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "VERTEX",
    "role": "Portfolio Manager (allocation)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "WAGE",
    "role": "Compensation Analyst (salary)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "KEY",
    "role": "IP Manager (patents)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "BID",
    "role": "Auction Specialist (bidding)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "POT",
    "role": "Fund Manager (pooled assets)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "MARK",
    "role": "Brand Valuation (trademark)",
    "tier": "cloud",
    "category": "Investment & Legal"
  },
  {
    "name": "BILL",
    "role": "Billing Specialist (invoicing)",
    "tier": "cloud",
    "category": "Investment & Legal"
  }
] as const;

export const AGENT_STATS = {
  total: AGENTS.length,
  selfHosted: AGENTS.filter(a => a.tier === "self-hosted").length,
  hybrid: AGENTS.filter(a => a.tier === "hybrid").length,
  cloud: AGENTS.filter(a => a.tier === "cloud").length,
};
