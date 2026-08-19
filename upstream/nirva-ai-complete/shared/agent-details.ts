import type { Agent, AgentTier } from "./agents.ts";

export interface AgentDetailRecord {
  name: string;
  role: string;
  tier: AgentTier;
  category: string;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  model: string;
  description: string;
  useCases: string[];
}

const PREMIUM_DETAILS: Record<string, Omit<AgentDetailRecord, "name" | "role" | "tier" | "category">> = {
  DESK: {
    systemPrompt: "You are DESK, the Chief of Staff AI agent. Your role is to receive all incoming requests, analyze intent, determine priority, and route tasks to the appropriate specialist agent. You think step-by-step, break complex requests into subtasks, and coordinate multi-agent workflows. Always respond in the user's language.",
    capabilities: ["Intent classification", "Task decomposition", "Priority scoring", "Multi-agent routing", "Context management", "Conversation memory"],
    tools: ["Router API", "Agent Registry", "Task Queue", "Memory Store"],
    model: "Qwen2.5-72B / DeepSeek-V2",
    description: "DESK เป็นหัวหน้าทีม AI ที่รับคำสั่งทั้งหมดจากผู้ใช้ วิเคราะห์ความต้องการ แล้วส่งต่อไปยัง Agent ที่เหมาะสม",
    useCases: ["รับคำสั่งจากผู้ใช้แล้วส่งต่อให้ Agent ที่เหมาะสม", "จัดลำดับความสำคัญของงาน", "ประสานงานระหว่าง Agent หลายตัว"],
  },
  FLOW: {
    systemPrompt: "You are FLOW, the Operations Manager. You design, execute, and monitor multi-step workflows. You ensure tasks flow smoothly between agents, handle errors gracefully, and report progress.",
    capabilities: ["Workflow design", "Pipeline execution", "Error handling", "Progress tracking", "Bottleneck detection", "Parallel task management"],
    tools: ["n8n API", "Task Queue", "Agent Executor", "Monitoring Dashboard"],
    model: "Qwen2.5-32B",
    description: "FLOW จัดการ workflow ทั้งหมด — ออกแบบ, รัน, และติดตามขั้นตอนการทำงานแบบอัตโนมัติ",
    useCases: ["สร้าง workflow อัตโนมัติสำหรับงานซ้ำๆ", "ติดตามสถานะงานแบบ real-time", "จัดการ error และ retry อัตโนมัติ"],
  },
  CARE: {
    systemPrompt: "You are CARE, the HR & Payroll Lead. You handle employee data, payroll calculations, leave management, and HR documentation.",
    capabilities: ["Payroll calculation", "Leave management", "Employee records", "Tax computation", "Benefits administration", "Compliance checking"],
    tools: ["Database API", "Calculator", "Document Generator", "Email Service"],
    model: "Qwen2.5-14B",
    description: "CARE ดูแลเรื่อง HR และเงินเดือน — คำนวณเงินเดือน, จัดการวันลา, และเอกสาร HR ทั้งหมด",
    useCases: ["คำนวณเงินเดือนและภาษีอัตโนมัติ", "จัดการระบบลางาน", "สร้างเอกสาร HR เช่น หนังสือรับรอง"],
  },
  TALLY: {
    systemPrompt: "You are TALLY, the Accounting Manager. You handle financial records, generate reports, analyze expenses, and ensure accounting accuracy.",
    capabilities: ["Financial reporting", "Expense analysis", "Budget tracking", "Tax calculation", "Invoice processing", "Audit preparation"],
    tools: ["Spreadsheet API", "Database", "Report Generator", "Calculator"],
    model: "Qwen2.5-14B",
    description: "TALLY จัดการบัญชีและการเงิน — สร้างรายงาน, วิเคราะห์ค่าใช้จ่าย, และตรวจสอบความถูกต้อง",
    useCases: ["สร้างรายงานการเงินรายเดือน", "วิเคราะห์ค่าใช้จ่ายและแนวโน้ม", "เตรียมเอกสารสำหรับสรรพากร"],
  },
  COIN: {
    systemPrompt: "You are COIN, the Group CFO. You provide strategic financial advice, analyze investment opportunities, and oversee financial health.",
    capabilities: ["Financial strategy", "Investment analysis", "Cash flow management", "Risk assessment", "Budget planning", "Stakeholder reporting"],
    tools: ["Financial Models", "Market Data API", "Report Generator", "Forecasting Engine"],
    model: "Qwen2.5-72B",
    description: "COIN เป็น CFO ที่ให้คำแนะนำด้านกลยุทธ์การเงิน วิเคราะห์การลงทุน และดูแลสุขภาพการเงินขององค์กร",
    useCases: ["วิเคราะห์โอกาสการลงทุน", "วางแผนงบประมาณระยะยาว", "รายงานสถานะการเงินให้ผู้บริหาร"],
  },
  ARCH: {
    systemPrompt: "You are ARCH, the System Architect. You design scalable system architectures, choose appropriate technologies, and create technical specifications.",
    capabilities: ["System design", "Architecture patterns", "Tech stack selection", "Performance optimization", "Scalability planning", "Documentation"],
    tools: ["Diagram Generator", "Code Analyzer", "Benchmark Tools", "Documentation Engine"],
    model: "DeepSeek-V2 / Qwen2.5-72B",
    description: "ARCH ออกแบบสถาปัตยกรรมระบบ — เลือก technology ที่เหมาะสม, สร้าง technical spec, และวางแผน scalability",
    useCases: ["ออกแบบ microservices architecture", "เลือก tech stack สำหรับโปรเจกต์ใหม่", "สร้าง technical documentation"],
  },
  CODE: {
    systemPrompt: "You are CODE, the Code Generator. You write clean, efficient, well-documented code in multiple languages.",
    capabilities: ["Code generation", "Debugging", "Refactoring", "Test writing", "Code review", "Multi-language support"],
    tools: ["File System", "Terminal", "Git", "Package Manager", "Linter"],
    model: "DeepSeek-Coder-V2 / Qwen2.5-Coder",
    description: "CODE เขียนโค้ดที่สะอาด มีประสิทธิภาพ พร้อม test — รองรับหลายภาษาโปรแกรม",
    useCases: ["เขียนโค้ดจาก specification", "แก้บั๊กและ refactor โค้ดเก่า", "เขียน unit tests อัตโนมัติ"],
  },
  SEAL: {
    systemPrompt: "You are SEAL, the Group Legal advisor. You analyze contracts, identify risks, draft legal documents, and ensure compliance.",
    capabilities: ["Contract analysis", "Risk identification", "Legal drafting", "Compliance review", "Dispute resolution", "Regulatory monitoring"],
    tools: ["Document Parser", "Legal Database", "Template Engine", "Compliance Checker"],
    model: "Qwen2.5-32B",
    description: "SEAL วิเคราะห์สัญญาและเอกสารกฎหมาย — ระบุความเสี่ยง, ร่างเอกสาร, และตรวจสอบ compliance",
    useCases: ["วิเคราะห์สัญญาก่อนเซ็น", "ร่างหนังสือทางกฎหมาย", "ตรวจสอบ compliance กับกฎหมายใหม่"],
  },
  BLOOM: {
    systemPrompt: "You are BLOOM, the Content Creator. You create engaging, creative content across all formats.",
    capabilities: ["Content writing", "Creative ideation", "Brand voice adaptation", "Multi-format content", "SEO optimization", "Audience targeting"],
    tools: ["Writing Engine", "Image Generator", "SEO Analyzer", "Social Media API"],
    model: "Qwen2.5-32B",
    description: "BLOOM สร้างคอนเทนต์ที่น่าสนใจทุกรูปแบบ — บทความ, โซเชียลมีเดีย, สคริปต์วิดีโอ",
    useCases: ["เขียนบทความ blog ที่ SEO-friendly", "สร้าง social media content plan", "เขียน script สำหรับวิดีโอ"],
  },
  TEACH: {
    systemPrompt: "You are TEACH, the Curriculum Designer. You create structured learning paths and design educational content.",
    capabilities: ["Curriculum design", "Learning path creation", "Assessment design", "Content structuring", "Adaptive learning", "Progress tracking"],
    tools: ["Content Builder", "Quiz Generator", "Progress Tracker", "Resource Library"],
    model: "Qwen2.5-32B",
    description: "TEACH ออกแบบหลักสูตรการเรียนรู้ — สร้าง learning path, ออกแบบเนื้อหา, และระบบประเมินผล",
    useCases: ["ออกแบบหลักสูตรอบรมพนักงาน", "สร้าง learning path สำหรับทักษะใหม่", "ออกแบบแบบทดสอบและ assessment"],
  },
  REACH: {
    systemPrompt: "You are REACH, the Sales & Client Manager. You prepare proposals, manage client relationships, and track sales pipelines.",
    capabilities: ["Proposal writing", "Client management", "Pipeline tracking", "Opportunity identification", "Negotiation support", "Follow-up automation"],
    tools: ["CRM API", "Document Generator", "Email Service", "Calendar API"],
    model: "Qwen2.5-14B",
    description: "REACH จัดการงานขายและลูกค้า — เตรียม proposal, ติดตาม pipeline, และหาโอกาสใหม่",
    useCases: ["เตรียม proposal สำหรับลูกค้าใหม่", "ติดตาม sales pipeline", "ส่ง follow-up email อัตโนมัติ"],
  },
  BRIEF: {
    systemPrompt: "You are BRIEF, the Daily Briefing Generator. You compile and summarize key information into concise daily briefings.",
    capabilities: ["Information synthesis", "Summarization", "Priority ranking", "Multi-source aggregation", "Trend identification", "Action item extraction"],
    tools: ["News API", "Email Parser", "Calendar API", "Task Manager"],
    model: "Qwen2.5-14B",
    description: "BRIEF สรุปข้อมูลสำคัญจากหลายแหล่งเป็น daily briefing ที่กระชับและนำไปใช้ได้ทันที",
    useCases: ["สรุปข่าวสำคัญประจำวัน", "รวบรวม action items จาก email", "สร้าง morning briefing สำหรับผู้บริหาร"],
  },
  SAGE: {
    systemPrompt: "You are SAGE, the Wisdom Teacher. You share philosophical insights and teach critical thinking.",
    capabilities: ["Philosophy teaching", "Critical thinking", "Ethical reasoning", "Socratic dialogue", "Wisdom literature", "Mindfulness guidance"],
    tools: ["Knowledge Base", "Discussion Engine", "Quote Library", "Meditation Timer"],
    model: "Qwen2.5-72B",
    description: "SAGE สอนปรัชญาและความคิดเชิงวิพากษ์ — นำทางผู้เรียนผ่านคำถามเชิงจริยธรรมและปรัชญา",
    useCases: ["สอนปรัชญาตะวันออก-ตะวันตก", "ฝึกการคิดเชิงวิพากษ์", "ให้คำแนะนำด้านจริยธรรม"],
  },
};

function roleTitle(role: string): string {
  return role.split("(")[0]?.trim() || role;
}

function roleSpecialty(role: string): string {
  const match = role.match(/\(([^)]+)\)/);
  return match?.[1] || "specialized processing";
}

function defaultModel(tier: AgentTier): string {
  if (tier === "self-hosted") return "Qwen2.5-14B";
  if (tier === "hybrid") return "Qwen2.5-32B + API";
  return "Cloud API + Qwen2.5";
}

export function buildAgentDetail(agent: Agent): AgentDetailRecord {
  const premium = PREMIUM_DETAILS[agent.name];
  if (premium) {
    return { name: agent.name, role: agent.role, tier: agent.tier, category: agent.category, ...premium };
  }

  const title = roleTitle(agent.role);
  const specialty = roleSpecialty(agent.role);

  return {
    name: agent.name,
    role: agent.role,
    tier: agent.tier,
    category: agent.category,
    systemPrompt: `You are ${agent.name}, a specialized AI agent for ${title.toLowerCase()}. Your focus is ${specialty}. Perform tasks with precision, follow best practices, and communicate clearly. Always respond in the user's language.`,
    capabilities: [specialty, "Task automation", "Data analysis", "Report generation", "Quality assurance", "Cross-agent coordination"],
    tools: ["API Integration", "Data Processing", "Report Generator", "Notification Service"],
    model: defaultModel(agent.tier),
    description: `${agent.name} เป็น AI Agent เฉพาะทางสำหรับ${title} — โฟกัสที่${specialty}`,
    useCases: [`ทำงาน${title}อัตโนมัติ`, "วิเคราะห์ข้อมูลและสร้างรายงาน", "ประสานงานกับ Agent อื่นในระบบ"],
  };
}

export function getAgentDetailByName(name: string, agents: Agent[]): AgentDetailRecord | null {
  const agent = agents.find((a) => a.name === name.toUpperCase());
  return agent ? buildAgentDetail(agent) : null;
}
