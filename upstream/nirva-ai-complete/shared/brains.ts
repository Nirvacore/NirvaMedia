/**
 * Nirva AI Brain Operating System — catalog, categories, and team planner.
 * Foundation for v0.15 Brain Marketplace + Brain Router.
 * See docs/NIRVA_BRAIN_OS.md
 */

import type { OrchestrationTier } from "./model-orchestration.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type BrainRegion = "usa" | "china" | "japan" | "india" | "europe" | "global";

export type BrainCategoryId =
  | "ceo"
  | "cto"
  | "developer"
  | "marketing"
  | "data"
  | "voice"
  | "vision";

export type PricingPlan = "free" | "pro" | "enterprise";

export type BrainAvailability = "available" | "pro" | "enterprise" | "coming_soon";

export interface GlobalProvider {
  id: string;
  name: string;
  region: BrainRegion;
  website: string;
  models: string[];
  strengths: string[];
  strengthsTh: string[];
}

export interface AiBrain {
  id: string;
  name: string;
  nameTh: string;
  category: BrainCategoryId;
  description: string;
  descriptionTh: string;
  /** Nirva agent names that embody this brain */
  agents: string[];
  /** Model IDs from MODEL_CATALOG or provider API models */
  preferredModels: string[];
  /** Minimum plan to use cloud models for this brain */
  minPlan: PricingPlan;
  availability: BrainAvailability;
  icon: string;
  color: string;
}

export interface BrainCategory {
  id: BrainCategoryId;
  name: string;
  nameTh: string;
  emoji: string;
  responsibilities: string[];
  responsibilitiesTh: string[];
  defaultAgents: string[];
  preferredModels: string[];
}

export interface BrainTeamPlan {
  intent: string;
  intentTh: string;
  primaryCategory: BrainCategoryId;
  categories: BrainCategoryId[];
  agents: string[];
  brains: string[];
  preferredModels: string[];
  workflow: "single" | "sequential" | "parallel_then_synthesize";
  reasoning: string;
  reasoningTh: string;
}

export interface PricingPlanInfo {
  id: PricingPlan;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  includedBrains: BrainCategoryId[];
  modelTiers: OrchestrationTier[];
}

// ── Global Providers ─────────────────────────────────────────────────────────

export const GLOBAL_PROVIDERS: GlobalProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    region: "usa",
    website: "https://openai.com",
    models: ["gpt-4o", "o1", "o3-mini", "gpt-4o-mini"],
    strengths: ["strategy", "reasoning", "business", "coding", "research"],
    strengthsTh: ["กลยุทธ์", "ให้เหตุผล", "ธุรกิจ", "เขียนโค้ด", "วิจัย"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    region: "usa",
    website: "https://anthropic.com",
    models: ["claude-sonnet-4", "claude-opus-4"],
    strengths: ["architecture", "security", "long context", "coding"],
    strengthsTh: ["สถาปัตยกรรม", "ความปลอดภัย", "บริบทยาว", "เขียนโค้ด"],
  },
  {
    id: "google",
    name: "Google DeepMind",
    region: "usa",
    website: "https://deepmind.google",
    models: ["gemini-2.0-flash", "gemini-2.0-pro"],
    strengths: ["multimodal", "planning", "research", "vision"],
    strengthsTh: ["หลายโหมด", "วางแผน", "วิจัย", "วิชั่น"],
  },
  {
    id: "meta",
    name: "Meta AI",
    region: "usa",
    website: "https://ai.meta.com",
    models: ["llama-3.3-70b", "llama-3.1-8b"],
    strengths: ["open source", "self-host", "general"],
    strengthsTh: ["โอเพ่นซอร์ส", "โฮสต์เอง", "ทั่วไป"],
  },
  {
    id: "groq",
    name: "Groq",
    region: "usa",
    website: "https://groq.com",
    models: ["llama-3.3-70b-versatile"],
    strengths: ["ultra-fast inference", "low latency"],
    strengthsTh: ["เร็วมาก", "หน่วงต่ำ"],
  },
  {
    id: "cohere",
    name: "Cohere",
    region: "usa",
    website: "https://cohere.com",
    models: ["command-r-plus"],
    strengths: ["RAG", "enterprise search"],
    strengthsTh: ["RAG", "ค้นหาองค์กร"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    region: "china",
    website: "https://deepseek.com",
    models: ["deepseek-v3", "deepseek-coder"],
    strengths: ["coding", "cost efficiency", "reasoning"],
    strengthsTh: ["เขียนโค้ด", "ประหยัด", "ให้เหตุผล"],
  },
  {
    id: "alibaba",
    name: "Alibaba Qwen",
    region: "china",
    website: "https://qwenlm.github.io",
    models: ["qwen2.5-72b", "qwen2.5-coder-32b"],
    strengths: ["coding", "chinese market", "multilingual"],
    strengthsTh: ["เขียนโค้ด", "ตลาดจีน", "หลายภาษา"],
  },
  {
    id: "zhipu",
    name: "Zhipu AI",
    region: "china",
    website: "https://zhipuai.cn",
    models: ["glm-4-plus"],
    strengths: ["chinese reasoning", "enterprise"],
    strengthsTh: ["ให้เหตุผลภาษาจีน", "องค์กร"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    region: "europe",
    website: "https://mistral.ai",
    models: ["mistral-large", "codestral"],
    strengths: ["open models", "EU privacy", "coding"],
    strengthsTh: ["โมเดลเปิด", "ความเป็นส่วนตัว EU", "เขียนโค้ด"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    region: "europe",
    website: "https://huggingface.co",
    models: ["500k+ OSS models"],
    strengths: ["OSS ecosystem", "model hub"],
    strengthsTh: ["ระบบนิเวศ OSS", "ศูนย์โมเดล"],
  },
  {
    id: "sarvam",
    name: "Sarvam AI",
    region: "india",
    website: "https://sarvam.ai",
    models: ["sarvam-m"],
    strengths: ["indic languages", "local AI"],
    strengthsTh: ["ภาษาอินเดีย", "AI ท้องถิ่น"],
  },
  {
    id: "sakana",
    name: "Sakana AI",
    region: "japan",
    website: "https://sakana.ai",
    models: ["evolutionary models"],
    strengths: ["model merging", "research"],
    strengthsTh: ["รวมโมเดล", "วิจัย"],
  },
];

// ── Brain Categories ─────────────────────────────────────────────────────────

export const BRAIN_CATEGORIES: Record<BrainCategoryId, BrainCategory> = {
  ceo: {
    id: "ceo",
    name: "CEO Brain",
    nameTh: "สมอง CEO",
    emoji: "🎯",
    responsibilities: ["Business analysis", "Strategy", "Decision making"],
    responsibilitiesTh: ["วิเคราะห์ธุรกิจ", "วางกลยุทธ์", "ตัดสินใจ"],
    defaultAgents: ["DESK", "SAGE", "BULL"],
    preferredModels: ["gpt-4o", "claude-sonnet", "gemini-pro", "deepseek-chat"],
  },
  cto: {
    id: "cto",
    name: "CTO Brain",
    nameTh: "สมอง CTO",
    emoji: "🏗️",
    responsibilities: ["System architecture", "Infrastructure", "Security"],
    responsibilitiesTh: ["สถาปัตยกรรมระบบ", "โครงสร้างพื้นฐาน", "ความปลอดภัย"],
    defaultAgents: ["ARCH", "SHIELD", "GUARD", "NET"],
    preferredModels: ["claude-sonnet", "gpt-4o", "qwen-plus", "deepseek-coder"],
  },
  developer: {
    id: "developer",
    name: "Developer Brain",
    nameTh: "สมอง Developer",
    emoji: "💻",
    responsibilities: ["Write code", "Debug", "Deploy"],
    responsibilitiesTh: ["เขียนโค้ด", "ดีบัก", "ดีพลอย"],
    defaultAgents: ["CODE", "SHIP", "ROOT"],
    preferredModels: ["deepseek-coder", "qwen-plus", "claude-code", "llama3.1-8b"],
  },
  marketing: {
    id: "marketing",
    name: "Marketing Brain",
    nameTh: "สมอง Marketing",
    emoji: "📣",
    responsibilities: ["Content", "Ads", "Customer research"],
    responsibilitiesTh: ["คอนเทนต์", "โฆษณา", "วิจัยลูกค้า"],
    defaultAgents: ["REACH", "BLOOM", "GROW", "INK"],
    preferredModels: ["gpt-4o", "claude-sonnet", "gemini-pro"],
  },
  data: {
    id: "data",
    name: "Data Brain",
    nameTh: "สมอง Data",
    emoji: "📊",
    responsibilities: ["Data analysis", "Dashboards", "Forecasting"],
    responsibilitiesTh: ["วิเคราะห์ข้อมูล", "แดชบอร์ด", "พยากรณ์"],
    defaultAgents: ["TALLY", "COIN", "DEEP"],
    preferredModels: ["gpt-4o", "gemini-pro", "qwen-plus"],
  },
  voice: {
    id: "voice",
    name: "Voice Brain",
    nameTh: "สมอง Voice",
    emoji: "🎙️",
    responsibilities: ["Voice coding", "Meetings", "Assistant"],
    responsibilitiesTh: ["โค้ดด้วยเสียง", "ประชุม", "ผู้ช่วย"],
    defaultAgents: ["VOICE", "WAVE", "DESK"],
    preferredModels: ["whisper", "elevenlabs", "google-speech"],
  },
  vision: {
    id: "vision",
    name: "Vision Brain",
    nameTh: "สมอง Vision",
    emoji: "👁️",
    responsibilities: ["Image reading", "Documents", "Factory QC"],
    responsibilitiesTh: ["อ่านภาพ", "เอกสาร", "QC โรงงาน"],
    defaultAgents: ["PIXEL", "READ", "GUARD"],
    preferredModels: ["gpt-4o", "gemini-pro", "llava", "qwen-vl"],
  },
};

// ── AI Brains (marketplace items) ────────────────────────────────────────────

export const AI_BRAINS: AiBrain[] = [
  {
    id: "ceo-strategy",
    name: "CEO Strategy Brain",
    nameTh: "สมองกลยุทธ์ CEO",
    category: "ceo",
    description: "Business analysis, strategy, and executive decisions",
    descriptionTh: "วิเคราะห์ธุรกิจ วางกลยุทธ์ และตัดสินใจระดับผู้บริหาร",
    agents: ["DESK", "SAGE", "BULL"],
    preferredModels: ["gpt-4o", "claude-sonnet", "gemini-pro"],
    minPlan: "pro",
    availability: "pro",
    icon: "target",
    color: "#7C3AED",
  },
  {
    id: "cto-architecture",
    name: "CTO Architecture Brain",
    nameTh: "สมองสถาปัตยกรรม CTO",
    category: "cto",
    description: "System design, infrastructure, and security architecture",
    descriptionTh: "ออกแบบระบบ โครงสร้างพื้นฐาน และความปลอดภัย",
    agents: ["ARCH", "SHIELD", "GUARD"],
    preferredModels: ["claude-sonnet", "gpt-4o"],
    minPlan: "pro",
    availability: "pro",
    icon: "layers",
    color: "#2563EB",
  },
  {
    id: "dev-coder",
    name: "Developer Coder Brain",
    nameTh: "สมองเขียนโค้ด",
    category: "developer",
    description: "Write, debug, and deploy code — OSS free tier available",
    descriptionTh: "เขียน ดีบัก และดีพลอยโค้ด — มีฟรีด้วย OSS",
    agents: ["CODE", "SHIP", "ROOT"],
    preferredModels: ["deepseek-coder", "qwen-plus", "llama3.1-8b"],
    minPlan: "free",
    availability: "available",
    icon: "code",
    color: "#059669",
  },
  {
    id: "marketing-content",
    name: "Marketing Content Brain",
    nameTh: "สมองคอนเทนต์",
    category: "marketing",
    description: "Content creation, ads, and customer research",
    descriptionTh: "สร้างคอนเทนต์ โฆษณา และวิจัยลูกค้า",
    agents: ["REACH", "BLOOM", "GROW"],
    preferredModels: ["gpt-4o", "claude-sonnet"],
    minPlan: "pro",
    availability: "pro",
    icon: "megaphone",
    color: "#EA580C",
  },
  {
    id: "data-analytics",
    name: "Data Analytics Brain",
    nameTh: "สมองวิเคราะห์ข้อมูล",
    category: "data",
    description: "Data analysis, dashboards, and forecasting",
    descriptionTh: "วิเคราะห์ข้อมูล แดชบอร์ด และพยากรณ์",
    agents: ["TALLY", "COIN", "DEEP"],
    preferredModels: ["gpt-4o", "gemini-pro"],
    minPlan: "pro",
    availability: "pro",
    icon: "bar-chart",
    color: "#0891B2",
  },
  {
    id: "voice-assistant",
    name: "Voice Assistant Brain",
    nameTh: "สมองผู้ช่วยเสียง",
    category: "voice",
    description: "Voice coding, meetings, and hands-free assistant",
    descriptionTh: "โค้ดด้วยเสียง ประชุม และผู้ช่วยแบบไม่ใช้มือ",
    agents: ["VOICE", "WAVE"],
    preferredModels: ["whisper", "elevenlabs"],
    minPlan: "pro",
    availability: "pro",
    icon: "mic",
    color: "#DB2777",
  },
  {
    id: "vision-qc",
    name: "Vision QC Brain",
    nameTh: "สมองตรวจภาพ",
    category: "vision",
    description: "Image analysis, document OCR, factory quality control",
    descriptionTh: "วิเคราะห์ภาพ OCR เอกสาร และ QC โรงงาน",
    agents: ["PIXEL", "READ"],
    preferredModels: ["gpt-4o", "gemini-pro", "llava"],
    minPlan: "pro",
    availability: "pro",
    icon: "eye",
    color: "#65A30D",
  },
];

// ── Pricing ──────────────────────────────────────────────────────────────────

export const PRICING_PLANS: PricingPlanInfo[] = [
  {
    id: "free",
    name: "Free",
    nameTh: "ฟรี",
    description: "Open source models — learn, code, create with OSS AI",
    descriptionTh: "โมเดลโอเพ่นซอร์ส — เรียนรู้ เขียนโค้ด สร้างงานด้วย AI ฟรี",
    includedBrains: ["developer"],
    modelTiers: ["free"],
  },
  {
    id: "pro",
    name: "Pro",
    nameTh: "โปร",
    description: "Pick and pay per brain — only buy what you need",
    descriptionTh: "เลือกซื้อเฉพาะสมองที่ต้องการ — ไม่ต้องจ่ายทุกอย่าง",
    includedBrains: ["ceo", "cto", "developer", "marketing", "data", "voice", "vision"],
    modelTiers: ["free", "low_cost", "premium"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    nameTh: "องค์กร",
    description: "Private AI, self-hosted, company knowledge, ERP, security",
    descriptionTh: "AI ส่วนตัว โฮสต์เอง ความรู้บริษัท ERP ความปลอดภัย",
    includedBrains: ["ceo", "cto", "developer", "marketing", "data", "voice", "vision"],
    modelTiers: ["free", "low_cost", "premium"],
  },
];

// ── Intent rules for Brain Team planning ─────────────────────────────────────

interface IntentRule {
  id: string;
  patterns: RegExp;
  intent: string;
  intentTh: string;
  categories: BrainCategoryId[];
  workflow: BrainTeamPlan["workflow"];
}

const INTENT_RULES: IntentRule[] = [
  {
    id: "new-business",
    patterns: /เปิดบริษัท|start (a )?company|new business|ก่อตั้ง|ธุรกิจใหม่/i,
    intent: "new_business",
    intentTh: "เปิดบริษัทใหม่",
    categories: ["ceo", "marketing", "data", "developer"],
    workflow: "parallel_then_synthesize",
  },
  {
    id: "build-software",
    patterns: /สร้างแอป|build app|เขียนโค้ด|develop|software|website|deploy/i,
    intent: "build_software",
    intentTh: "สร้างซอฟต์แวร์",
    categories: ["developer", "cto"],
    workflow: "sequential",
  },
  {
    id: "marketing-campaign",
    patterns: /marketing|โฆษณา|content|คอนเทนต์|campaign|ลูกค้า|customer/i,
    intent: "marketing_campaign",
    intentTh: "แคมเปญการตลาด",
    categories: ["marketing", "data"],
    workflow: "parallel_then_synthesize",
  },
  {
    id: "security-audit",
    patterns: /security|ความปลอดภัย|audit|vulnerability|compliance|encrypt/i,
    intent: "security_audit",
    intentTh: "ตรวจสอบความปลอดภัย",
    categories: ["cto", "developer"],
    workflow: "sequential",
  },
  {
    id: "morning-brief",
    patterns: /เช้านี้|morning|วันนี้|today|briefing|สรุป|จัดการให้/i,
    intent: "morning_briefing",
    intentTh: "สรุปเช้า / จัดการให้",
    categories: ["ceo", "data"],
    workflow: "parallel_then_synthesize",
  },
  {
    id: "data-analysis",
    patterns: /วิเคราะห์|analyze|dashboard|forecast|รายงาน|report|ข้อมูล/i,
    intent: "data_analysis",
    intentTh: "วิเคราะห์ข้อมูล",
    categories: ["data", "ceo"],
    workflow: "sequential",
  },
  {
    id: "voice-command",
    patterns: /เสียง|voice|พูด|speak|ประชุม|meeting/i,
    intent: "voice_task",
    intentTh: "งานด้วยเสียง",
    categories: ["voice", "ceo"],
    workflow: "single",
  },
  {
    id: "vision-task",
    patterns: /ภาพ|image|ocr|เอกสาร|document|qc|โรงงาน|factory/i,
    intent: "vision_task",
    intentTh: "งานวิชั่น / เอกสาร",
    categories: ["vision", "data"],
    workflow: "sequential",
  },
];

const DEFAULT_RULE: IntentRule = {
  id: "general",
  patterns: /.*/,
  intent: "general",
  intentTh: "งานทั่วไป",
  categories: ["ceo"],
  workflow: "single",
};

// ── Public API ───────────────────────────────────────────────────────────────

export function getBrainsByCategory(category: BrainCategoryId): AiBrain[] {
  return AI_BRAINS.filter((b) => b.category === category);
}

export function getBrainsForPlan(plan: PricingPlan): AiBrain[] {
  const info = PRICING_PLANS.find((p) => p.id === plan);
  if (!info) return [];
  return AI_BRAINS.filter((b) => info.includedBrains.includes(b.category));
}

export function getProvidersByRegion(region: BrainRegion): GlobalProvider[] {
  return GLOBAL_PROVIDERS.filter((p) => p.region === region || p.region === "global");
}

export function getBrainCategory(id: BrainCategoryId): BrainCategory {
  return BRAIN_CATEGORIES[id];
}

/** Plan which brain categories, agents, and models to use for a user message */
export function planBrainTeam(message: string): BrainTeamPlan {
  const rule = INTENT_RULES.find((r) => r.patterns.test(message)) ?? DEFAULT_RULE;
  const categories = rule.categories;
  const primaryCategory = categories[0];

  const agentSet = new Set<string>();
  const modelSet = new Set<string>();
  const brainIds: string[] = [];

  for (const cat of categories) {
    const category = BRAIN_CATEGORIES[cat];
    category.defaultAgents.forEach((a) => agentSet.add(a));
    category.preferredModels.forEach((m) => modelSet.add(m));
    const brain = AI_BRAINS.find((b) => b.category === cat);
    if (brain) brainIds.push(brain.id);
  }

  // DESK always orchestrates
  agentSet.add("DESK");
  // FLOW for multi-step workflows
  if (rule.workflow !== "single") agentSet.add("FLOW");

  return {
    intent: rule.intent,
    intentTh: rule.intentTh,
    primaryCategory,
    categories,
    agents: Array.from(agentSet),
    brains: brainIds,
    preferredModels: Array.from(modelSet),
    workflow: rule.workflow,
    reasoning: `Matched intent "${rule.intent}" → ${categories.join(" + ")} brain team`,
    reasoningTh: `จับคู่ความตั้งใจ "${rule.intentTh}" → ทีมสมอง ${categories.map((c) => BRAIN_CATEGORIES[c].nameTh).join(" + ")}`,
  };
}

export function getBrainStats() {
  return {
    totalBrains: AI_BRAINS.length,
    totalCategories: Object.keys(BRAIN_CATEGORIES).length,
    totalProviders: GLOBAL_PROVIDERS.length,
    regions: Array.from(new Set(GLOBAL_PROVIDERS.map((p) => p.region))),
    freeBrains: AI_BRAINS.filter((b) => b.minPlan === "free").length,
    proBrains: AI_BRAINS.filter((b) => b.minPlan === "pro").length,
  };
}
