/**
 * NIRVA AI Organization Master Blueprint V1
 * Maps existing 109 registry agents into AI Companies — no new agents created.
 */

export type ModelTier = "opensource" | "premium";

export interface OrgAgentRole {
  /** Blueprint role title */
  blueprintRole: string;
  /** Existing registry agent name */
  agent: string;
  /** Primary skills */
  skills: string[];
  /** Default model tier per blueprint strategy */
  modelTier: ModelTier;
  /** Recommended Ollama/local model */
  model: string;
}

export interface OrgDepartment {
  id: string;
  name: string;
  description: string;
  agents: OrgAgentRole[];
}

export interface OrgCompany {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  departments: OrgDepartment[];
}

export interface ControlTowerAgent {
  agent: string;
  blueprintRole: string;
  responsibilities: string[];
}

/** Control Tower — central command */
export const CONTROL_TOWER: ControlTowerAgent[] = [
  {
    agent: "DESK",
    blueprintRole: "Chief of Staff AI",
    responsibilities: [
      "รับคำสั่งจากผู้ใช้",
      "เข้าใจเป้าหมาย",
      "วิเคราะห์ว่างานต้องใช้ใคร",
      "เรียก Agent ที่เหมาะสม",
      "จัดประชุม Agent",
      "สรุปผล",
    ],
  },
  {
    agent: "FLOW",
    blueprintRole: "Operations Manager AI",
    responsibilities: [
      "จัด Workflow",
      "แบ่ง Task",
      "ติดตามสถานะ",
      "ส่งงานระหว่าง Agent",
      "ควบคุมกระบวนการทำงาน",
    ],
  },
  {
    agent: "SAGE",
    blueprintRole: "Strategic AI (ORACLE)",
    responsibilities: [
      "วิเคราะห์ภาพรวม",
      "ช่วยวางกลยุทธ์",
      "ช่วยตัดสินใจระดับองค์กร",
    ],
  },
  {
    agent: "ROUTER",
    blueprintRole: "AI Resource Manager",
    responsibilities: [
      "เลือก model ตามความยากและต้นทุน",
      "ควบคุมงบ premium รายวัน",
      "จัดสรร tier ให้ทุก agent ใน pipeline",
      "บันทึกสถิติการใช้ model",
    ],
  },
];

/** AI Companies — departments map to existing 109 agents */
export const AI_COMPANIES: OrgCompany[] = [
  {
    id: "software",
    name: "Nirva Software Company",
    tagline: "สร้าง Software ด้วย AI Workforce",
    description: "บริษัท AI สำหรับออกแบบ สร้าง ทดสอบ และ deploy ซอฟต์แวร์",
    icon: "code",
    departments: [
      {
        id: "architecture",
        name: "Architecture",
        description: "ออกแบบระบบ API Database",
        agents: [
          { blueprintRole: "System Architect", agent: "ARCH", skills: ["system design", "api", "database"], modelTier: "premium", model: "deepseek-v2" },
          { blueprintRole: "Database Engineer", agent: "MAP", skills: ["schema", "data modeling"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
      {
        id: "engineering",
        name: "Engineering",
        description: "พัฒนา Frontend Backend Mobile",
        agents: [
          { blueprintRole: "Lead Developer", agent: "CODE", skills: ["typescript", "api", "testing"], modelTier: "premium", model: "deepseek-coder-v2" },
          { blueprintRole: "Frontend Engineer", agent: "PIXEL", skills: ["react", "ui", "ux"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Backend Engineer", agent: "ROOT", skills: ["api", "server", "business logic"], modelTier: "opensource", model: "qwen2.5:14b" },
          { blueprintRole: "Mobile Engineer", agent: "POCKET", skills: ["ios", "android", "react-native"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Integration Engineer", agent: "NET", skills: ["api integration", "webhooks"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
      {
        id: "quality",
        name: "Quality & Security",
        description: "ทดสอบ debug และ security",
        agents: [
          { blueprintRole: "QA Engineer", agent: "WALL", skills: ["testing", "qa", "automation"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Debug Specialist", agent: "SPARK", skills: ["debugging", "error analysis"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Security Engineer", agent: "VAULT", skills: ["security audit", "owasp"], modelTier: "premium", model: "qwen2.5:32b" },
          { blueprintRole: "DevOps Engineer", agent: "SHIP", skills: ["deploy", "ci/cd", "monitoring"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
    ],
  },
  {
    id: "knowledge",
    name: "Nirva Knowledge Company",
    tagline: "ความจำและความรู้ขององค์กร",
    description: "จัดการ memory เอกสาร และการวิจัย",
    icon: "brain",
    departments: [
      {
        id: "memory",
        name: "Knowledge Management",
        description: "เก็บความจำ project และความรู้",
        agents: [
          { blueprintRole: "Knowledge Manager", agent: "GATHER", skills: ["knowledge base", "curation"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Knowledge Weaver", agent: "WEAVE", skills: ["synthesis", "connections"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "RAG Builder", agent: "RAG-BUILDER", skills: ["vector db", "embeddings", "rag"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
      {
        id: "docs",
        name: "Documentation & Research",
        description: "เอกสาร README และการค้นคว้า",
        agents: [
          { blueprintRole: "Documentation Agent", agent: "INK", skills: ["documentation", "readme"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Research Agent", agent: "DEEP", skills: ["research", "analysis"], modelTier: "premium", model: "qwen2.5:32b" },
        ],
      },
    ],
  },
  {
    id: "commerce",
    name: "Nirva Commerce Company",
    tagline: "ขายของออนไลน์ด้วย AI",
    description: "Sales marketing product pricing inventory support",
    icon: "cart",
    departments: [
      {
        id: "sales",
        name: "Sales & Marketing",
        description: "ขาย วิเคราะห์ลูกค้า marketing",
        agents: [
          { blueprintRole: "Sales Agent", agent: "REACH", skills: ["sales", "crm", "proposals"], modelTier: "opensource", model: "qwen2.5:14b" },
          { blueprintRole: "Marketing Agent", agent: "BUZZ", skills: ["marketing", "campaign", "growth"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Product Research", agent: "SCOUT", skills: ["product research", "trends"], modelTier: "premium", model: "qwen2.5:32b" },
        ],
      },
      {
        id: "operations",
        name: "Commerce Operations",
        description: "ราคา สต็อก ลูกค้า",
        agents: [
          { blueprintRole: "Pricing Agent", agent: "PRICE", skills: ["pricing", "margin analysis"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Inventory Agent", agent: "SHELF", skills: ["inventory", "stock"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Customer Support", agent: "CARE", skills: ["support", "hr", "customer care"], modelTier: "opensource", model: "qwen2.5:14b" },
        ],
      },
    ],
  },
  {
    id: "media",
    name: "Nirva Media Company",
    tagline: "สร้าง Content และ Brand",
    description: "Content copy script design video social",
    icon: "film",
    departments: [
      {
        id: "content",
        name: "Content Production",
        description: "สร้าง content ทุกรูปแบบ",
        agents: [
          { blueprintRole: "Content Creator", agent: "BLOOM", skills: ["content", "creative"], modelTier: "opensource", model: "qwen2.5:32b" },
          { blueprintRole: "Copywriter", agent: "INK", skills: ["copywriting", "brand voice"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Script Writer", agent: "TALE", skills: ["script", "storytelling"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Visual Designer", agent: "FRAME", skills: ["design", "visual"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Video Producer", agent: "CLIPS", skills: ["video", "editing"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Social Media Manager", agent: "BUZZ", skills: ["social media", "engagement"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
    ],
  },
  {
    id: "service",
    name: "Nirva Service Company",
    tagline: "บริการ จอง ตารางงาน",
    description: "Booking schedule service quality",
    icon: "calendar",
    departments: [
      {
        id: "service-ops",
        name: "Service Operations",
        description: "จอง ตาราง บริหารบริการ",
        agents: [
          { blueprintRole: "Booking Agent", agent: "INVITE", skills: ["booking", "scheduling"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Schedule Agent", agent: "SCHED", skills: ["calendar", "planning"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Service Manager", agent: "HUB", skills: ["service management"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Quality Control", agent: "CHECK", skills: ["quality", "inspection"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
    ],
  },
  {
    id: "people",
    name: "Nirva People Company",
    tagline: "HR รับสมัคร ฝึกอบรม",
    description: "Recruit train HR management",
    icon: "users",
    departments: [
      {
        id: "hr",
        name: "Human Resources",
        description: "รับคน ฝึกคน จัดการบุคลากร",
        agents: [
          { blueprintRole: "Recruiter Agent", agent: "RECRUIT", skills: ["recruiting", "hiring"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Training Agent", agent: "TRAINER", skills: ["training", "onboarding"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "HR Manager", agent: "CARE", skills: ["hr", "payroll", "benefits"], modelTier: "opensource", model: "qwen2.5:14b" },
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Nirva Finance Company",
    tagline: "การเงิน บัญชี รายงาน",
    description: "Finance accounting reports",
    icon: "coins",
    departments: [
      {
        id: "finance-ops",
        name: "Finance & Accounting",
        description: "วิเคราะห์การเงิน บัญชี รายงาน",
        agents: [
          { blueprintRole: "Finance Analyst", agent: "COIN", skills: ["finance", "strategy", "investment"], modelTier: "premium", model: "qwen2.5:72b" },
          { blueprintRole: "Accounting Agent", agent: "TALLY", skills: ["accounting", "reports"], modelTier: "opensource", model: "qwen2.5:14b" },
          { blueprintRole: "Financial Report", agent: "BRIEF", skills: ["reporting", "summaries"], modelTier: "opensource", model: "qwen2.5:14b" },
        ],
      },
    ],
  },
  {
    id: "education",
    name: "Nirva Education Company",
    tagline: "สอน สร้างหลักสูตร ฝึกอบรม",
    description: "Teaching tutoring curriculum",
    icon: "graduation",
    departments: [
      {
        id: "education-ops",
        name: "Education",
        description: "สอน สร้างหลักสูตร",
        agents: [
          { blueprintRole: "Teacher Agent", agent: "TEACH", skills: ["teaching", "curriculum"], modelTier: "opensource", model: "qwen2.5:32b" },
          { blueprintRole: "Tutor Agent", agent: "PHOTON", skills: ["tutoring", "guidance"], modelTier: "opensource", model: "llama3.1:8b" },
          { blueprintRole: "Course Builder", agent: "INDEX", skills: ["course design", "structure"], modelTier: "opensource", model: "llama3.1:8b" },
        ],
      },
    ],
  },
];

/** Intent → agent pipeline templates */
export interface IntentPipeline {
  id: string;
  label: string;
  labelTh: string;
  keywords: string[];
  companyId: string;
  agents: string[];
  workflowId?: string;
  description: string;
}

export const INTENT_PIPELINES: IntentPipeline[] = [
  {
    id: "build-software",
    label: "Build Software System",
    labelTh: "สร้างระบบซอฟต์แวร์",
    keywords: ["สร้างระบบ", "build", "software", "app", "website", "api", "โค้ด", "code", "develop", "feature"],
    companyId: "software",
    agents: ["DESK", "SCOUT", "ARCH", "CODE", "WALL", "SHIP", "BRIEF"],
    workflowId: "code-arch-ship",
    description: "PRODUCT → ARCH → CODE → TEST → DEPLOY → REPORT",
  },
  {
    id: "sell-online",
    label: "Online Sales System",
    labelTh: "สร้างระบบขาย",
    keywords: ["ขาย", "sell", "shop", "ecommerce", "commerce", "store", "ร้าน", "marketplace"],
    companyId: "commerce",
    agents: ["DESK", "SCOUT", "PRICE", "REACH", "CARE", "BRIEF"],
    workflowId: "procurement-approval",
    description: "PRODUCT → PRICING → SALES → SUPPORT → REPORT",
  },
  {
    id: "create-content",
    label: "Content & Media",
    labelTh: "สร้างคอนเทนต์",
    keywords: ["content", "media", "video", "social", "marketing", "คอนเทนต์", "โพสต์", "brand"],
    companyId: "media",
    agents: ["DESK", "BLOOM", "CLIPS", "BUZZ", "BRIEF"],
    workflowId: "content-pipeline",
    description: "CREATE → VIDEO → SOCIAL → REPORT",
  },
  {
    id: "knowledge-rag",
    label: "Knowledge & RAG",
    labelTh: "สร้าง Knowledge Base",
    keywords: ["memory", "knowledge", "rag", "document", "ความจำ", "เอกสาร", "research", "ค้นคว้า"],
    companyId: "knowledge",
    agents: ["DESK", "DEEP", "GATHER", "RAG-BUILDER", "INK"],
    workflowId: "rag-knowledge-base",
    description: "RESEARCH → MEMORY → RAG → DOC",
  },
  {
    id: "strategy",
    label: "Strategic Decision",
    labelTh: "วางกลยุทธ์",
    keywords: ["strategy", "decision", "กลยุทธ์", "วิเคราะห์", "plan", "roadmap", "ตัดสินใจ"],
    companyId: "software",
    agents: ["DESK", "SAGE", "COIN", "BRIEF"],
    description: "ORACLE → DESK → FINANCE → REPORT",
  },
  {
    id: "education",
    label: "Education & Training",
    labelTh: "สอนและฝึกอบรม",
    keywords: ["teach", "learn", "course", "curriculum", "สอน", "หลักสูตร", "training", "ฝึก"],
    companyId: "education",
    agents: ["DESK", "TEACH", "INDEX", "TRAINER", "BRIEF"],
    description: "TEACH → CURRICULUM → TRAIN → REPORT",
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    labelTh: "การเงินและบัญชี",
    keywords: ["finance", "money", "account", "budget", "การเงิน", "บัญชี", "งบ", "tax"],
    companyId: "finance",
    agents: ["DESK", "COIN", "TALLY", "BRIEF"],
    description: "FINANCE → ACCOUNT → REPORT",
  },
  {
    id: "hr",
    label: "HR & People",
    labelTh: "บุคลากร",
    keywords: ["hire", "hr", "recruit", "payroll", "จ้าง", "พนักงาน", "ลางาน"],
    companyId: "people",
    agents: ["DESK", "RECRUIT", "TRAINER", "CARE"],
    description: "HIRE → TRAIN → HR",
  },
  {
    id: "service",
    label: "Service & Booking",
    labelTh: "บริการและจอง",
    keywords: ["book", "schedule", "service", "จอง", "นัด", "ตาราง", "appointment"],
    companyId: "service",
    agents: ["DESK", "INVITE", "SCHED", "CHECK", "BRIEF"],
    description: "BOOK → PLAN → SERVICE → QC",
  },
  {
    id: "daily-ops",
    label: "Daily Operations",
    labelTh: "งานประจำวัน",
    keywords: ["daily", "briefing", "status", "health", "สรุป", "รายงาน", "today"],
    companyId: "software",
    agents: ["DESK", "FLOW", "BRIEF"],
    workflowId: "daily-briefing",
    description: "DESK → FLOW → BRIEF",
  },
];

export const MODEL_STRATEGY = {
  opensource: {
    label: "Open Source First",
    models: ["Llama", "Qwen", "DeepSeek", "Mistral"],
    useFor: ["งานทั่วไป", "งานซ้ำ", "เอกสาร", "วิเคราะห์พื้นฐาน"],
  },
  premium: {
    label: "Premium Models",
    models: ["Claude", "GPT", "Gemini"],
    useFor: ["Architect", "Strategy", "Coding ยาก", "Decision สำคัญ"],
  },
  principle: "AI แรง = ใช้กับงานคิด · AI ประหยัด = ใช้กับงานประจำ",
};

export const BUSINESS_TIERS = [
  { id: "free", name: "Free", description: "ให้คนเข้าถึง AI" },
  { id: "pro", name: "Pro", description: "Automation และ Agent ขั้นสูงสำหรับธุรกิจ" },
  { id: "enterprise", name: "Enterprise", description: "AI Workforce ส่วนตัวสำหรับองค์กร" },
  { id: "impact", name: "Impact", description: "เข้าถึง AI ผ่านเครดิตหรือโอกาส" },
];

export function getAllOrgAgents(): string[] {
  const agents = new Set<string>();
  for (const ct of CONTROL_TOWER) agents.add(ct.agent);
  for (const company of AI_COMPANIES) {
    for (const dept of company.departments) {
      for (const a of dept.agents) agents.add(a.agent);
    }
  }
  return Array.from(agents);
}

export function findCompanyForAgent(agentName: string): OrgCompany | null {
  const upper = agentName.toUpperCase();
  for (const company of AI_COMPANIES) {
    for (const dept of company.departments) {
      if (dept.agents.some((a) => a.agent === upper)) return company;
    }
  }
  return null;
}

export function getOrganizationSummary() {
  const companyAgentCounts = AI_COMPANIES.map((c) => ({
    id: c.id,
    name: c.name,
    agentCount: new Set(c.departments.flatMap((d) => d.agents.map((a) => a.agent))).size,
    departmentCount: c.departments.length,
  }));
  return {
    controlTower: CONTROL_TOWER,
    companies: AI_COMPANIES,
    pipelines: INTENT_PIPELINES,
    modelStrategy: MODEL_STRATEGY,
    businessTiers: BUSINESS_TIERS,
    summary: {
      totalCompanies: AI_COMPANIES.length,
      totalDepartments: AI_COMPANIES.reduce((s, c) => s + c.departments.length, 0),
      uniqueOrgAgents: getAllOrgAgents().length,
      registryAgents: 109,
      intentPipelines: INTENT_PIPELINES.length,
    },
    companyAgentCounts,
  };
}
