/**
 * NIRVA AI Model Orchestration System
 * ROUTER — AI Resource Manager: picks the right brain for each task.
 */

export type OrchestrationTier = "free" | "low_cost" | "premium";

export type TaskDimension = "complexity" | "importance" | "speed" | "cost" | "privacy";

export interface ModelCatalogEntry {
  id: string;
  name: string;
  provider: "ollama" | "anthropic" | "openai" | "google" | "deepseek";
  tier: OrchestrationTier;
  /** USD per 1M input tokens (estimate) */
  costPer1M: number;
  ollamaTag?: string;
  apiModel?: string;
  strengths: string[];
}

export interface TaskScores {
  complexity: number;
  importance: number;
  speed: number;
  costSensitivity: number;
  privacy: number;
}

export interface ModelRouteDecision {
  agent: string;
  task: string;
  scores: TaskScores;
  recommendedTier: OrchestrationTier;
  model: ModelCatalogEntry;
  fallbackModel?: ModelCatalogEntry;
  reasoning: string;
  reasoningTh: string;
  ruleHits: string[];
  estimatedCostUsd: number;
}

export interface PipelineModelPlan {
  userTask: string;
  scores: TaskScores;
  decisions: ModelRouteDecision[];
  summary: string;
  summaryTh: string;
}

export interface CostBreakdown {
  period: string;
  freePercent: number;
  lowCostPercent: number;
  premiumPercent: number;
  totalCostUsd: number;
  totalCalls: number;
  savingsPercent: number;
  byTier: Record<OrchestrationTier, { calls: number; costUsd: number }>;
}

export const MODEL_ROUTER_AGENT = "ROUTER";

export const ORCHESTRATION_TIERS: Record<
  OrchestrationTier,
  { label: string; labelTh: string; description: string }
> = {
  free: {
    label: "Free / Open Source",
    labelTh: "ฟรี / โอเพ่นซอร์ส",
    description: "Llama, Qwen, DeepSeek, Mistral — summaries, docs, tests, routine work",
  },
  low_cost: {
    label: "Low Cost",
    labelTh: "ต้นทุนต่ำ",
    description: "Mid-tier coding, data analysis, content — when free models are not enough",
  },
  premium: {
    label: "Premium",
    labelTh: "พรีเมียม",
    description: "Claude, GPT, Gemini — architecture, strategy, security, critical decisions",
  },
};

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: "llama3.1-8b",
    name: "Llama 3.1 8B",
    provider: "ollama",
    tier: "free",
    costPer1M: 0,
    ollamaTag: "llama3.1:8b",
    strengths: ["routing", "summaries", "simple tasks"],
  },
  {
    id: "qwen2.5-14b",
    name: "Qwen 2.5 14B",
    provider: "ollama",
    tier: "free",
    costPer1M: 0,
    ollamaTag: "qwen2.5:14b",
    strengths: ["thai", "general", "documentation"],
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "ollama",
    tier: "free",
    costPer1M: 0,
    ollamaTag: "deepseek-coder:6.7b",
    strengths: ["coding", "tests", "refactors"],
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    provider: "ollama",
    tier: "free",
    costPer1M: 0,
    ollamaTag: "mistral:7b",
    strengths: ["fast", "lightweight"],
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    tier: "low_cost",
    costPer1M: 0.14,
    apiModel: "deepseek-chat",
    strengths: ["coding", "analysis", "medium complexity"],
  },
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "ollama",
    tier: "low_cost",
    costPer1M: 0.35,
    ollamaTag: "qwen2.5:32b",
    strengths: ["coding", "workflows", "content"],
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "anthropic",
    tier: "premium",
    costPer1M: 3.0,
    apiModel: "claude-sonnet-4-20250514",
    strengths: ["architecture", "security", "strategy"],
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    tier: "premium",
    costPer1M: 2.5,
    apiModel: "gpt-4o",
    strengths: ["architecture", "decisions", "complex reasoning"],
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "google",
    tier: "premium",
    costPer1M: 1.25,
    apiModel: "gemini-2.0-flash",
    strengths: ["multimodal", "analysis", "planning"],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    provider: "anthropic",
    tier: "premium",
    costPer1M: 3.0,
    apiModel: "claude-sonnet-4-20250514",
    strengths: ["hard coding", "large refactors", "system design"],
  },
];

/** Default tier bias per agent role */
export const AGENT_DEFAULT_TIER: Record<string, OrchestrationTier> = {
  DESK: "free",
  FLOW: "free",
  BRIEF: "free",
  WALL: "free",
  SPARK: "free",
  SHIP: "free",
  "RAG-BUILDER": "free",
  INK: "free",
  GATHER: "free",
  DEEP: "free",
  MEMORY: "free",
  ARCH: "premium",
  SAGE: "premium",
  SEAL: "premium",
  SHIELD: "premium",
  VAULT: "premium",
  CODE: "low_cost",
  ROOT: "low_cost",
  PIXEL: "low_cost",
  NET: "low_cost",
  COIN: "low_cost",
  REACH: "low_cost",
  BLOOM: "low_cost",
};

const TIER_RANK: Record<OrchestrationTier, number> = { free: 0, low_cost: 1, premium: 2 };

const RULES: { id: string; labelTh: string; patterns: RegExp; tier: OrchestrationTier; boost: Partial<TaskScores> }[] = [
  {
    id: "new-system",
    labelTh: "คิดระบบใหม่ / architecture",
    patterns: /architecture|ออกแบบระบบ|erp|สร้างระบบ|greenfield|microservice|คิดระบบ/i,
    tier: "premium",
    boost: { complexity: 0.9, importance: 0.85 },
  },
  {
    id: "security",
    labelTh: "security / compliance",
    patterns: /security|shield|vulnerability|compliance|encrypt|audit|ความปลอดภัย/i,
    tier: "premium",
    boost: { importance: 0.95, privacy: 0.9 },
  },
  {
    id: "strategy",
    labelTh: "กลยุทธ์ / ตัดสินใจ",
    patterns: /strategy|กลยุทธ์|decision|roadmap|ตัดสินใจ|oracle|sage/i,
    tier: "premium",
    boost: { importance: 0.9, complexity: 0.7 },
  },
  {
    id: "typo",
    labelTh: "แก้ typo / งานเล็ก",
    patterns: /typo|แก้คำ|spelling|ข้อความสั้น|rename variable/i,
    tier: "free",
    boost: { complexity: 0.1, costSensitivity: 0.9 },
  },
  {
    id: "test",
    labelTh: "เขียน test",
    patterns: /\btest\b|unit test|e2e|ทดสอบ|spec file/i,
    tier: "free",
    boost: { complexity: 0.35, costSensitivity: 0.8 },
  },
  {
    id: "deploy-routine",
    labelTh: "deploy routine",
    patterns: /deploy routine|restart service|health check|routine deploy/i,
    tier: "free",
    boost: { complexity: 0.2, speed: 0.8 },
  },
  {
    id: "coding-hard",
    labelTh: "โค้ดซับซ้อน",
    patterns: /refactor|migrate|legacy|distributed|concurrent|algorithm/i,
    tier: "low_cost",
    boost: { complexity: 0.75 },
  },
  {
    id: "private-data",
    labelTh: "ข้อมูลส่วนตัว / internal",
    patterns: /confidential|internal only|hr data|payroll|ส่วนตัว|ลับ|pii/i,
    tier: "free",
    boost: { privacy: 1, costSensitivity: 0.5 },
  },
];

function clamp(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreTask(message: string): TaskScores {
  const lower = message.toLowerCase();
  const scores: TaskScores = {
    complexity: 0.35,
    importance: 0.4,
    speed: 0.5,
    costSensitivity: 0.6,
    privacy: 0.3,
  };

  if (lower.length > 200) scores.complexity += 0.15;
  if (lower.length > 500) scores.complexity += 0.1;
  if (/erp|enterprise|production|mission.?critical/i.test(lower)) {
    scores.importance += 0.35;
    scores.complexity += 0.2;
  }
  if (/urgent|ด่วน|asap|real.?time/i.test(lower)) scores.speed += 0.35;
  if (/budget|ประหยัด|cheap|cost/i.test(lower)) scores.costSensitivity += 0.25;

  for (const rule of RULES) {
    if (rule.patterns.test(message)) {
      if (rule.boost.complexity != null) scores.complexity = Math.max(scores.complexity, rule.boost.complexity);
      if (rule.boost.importance != null) scores.importance = Math.max(scores.importance, rule.boost.importance);
      if (rule.boost.speed != null) scores.speed = Math.max(scores.speed, rule.boost.speed);
      if (rule.boost.costSensitivity != null) scores.costSensitivity = Math.max(scores.costSensitivity, rule.boost.costSensitivity);
      if (rule.boost.privacy != null) scores.privacy = Math.max(scores.privacy, rule.boost.privacy);
    }
  }

  return {
    complexity: clamp(scores.complexity),
    importance: clamp(scores.importance),
    speed: clamp(scores.speed),
    costSensitivity: clamp(scores.costSensitivity),
    privacy: clamp(scores.privacy),
  };
}

function pickTier(scores: TaskScores, agentDefault: OrchestrationTier, ruleTier?: OrchestrationTier): OrchestrationTier {
  let tier = agentDefault;

  const composite = scores.complexity * 0.35 + scores.importance * 0.35 + scores.privacy * 0.15 - scores.costSensitivity * 0.15;

  if (composite >= 0.72) tier = "premium";
  else if (composite >= 0.48) tier = "low_cost";
  else tier = "free";

  if (scores.privacy >= 0.85) tier = "free";

  if (ruleTier && TIER_RANK[ruleTier] > TIER_RANK[tier]) tier = ruleTier;

  if (agentDefault === "premium" && tier === "free" && scores.complexity < 0.25) {
    tier = "low_cost";
  }

  return tier;
}

function modelsForTier(tier: OrchestrationTier, agent: string): ModelCatalogEntry[] {
  const tierModels = MODEL_CATALOG.filter((m) => m.tier === tier);
  if (agent === "CODE" || agent === "ROOT" || agent === "NET") {
    const coder = tierModels.find((m) => m.id.includes("deepseek") || m.id.includes("claude-code"));
    if (coder) return [coder, ...tierModels.filter((m) => m !== coder)];
  }
  if (agent === "ARCH" || agent === "SAGE") {
    const premium = tierModels.find((m) => m.provider === "anthropic" || m.provider === "openai");
    if (premium) return [premium, ...tierModels.filter((m) => m !== premium)];
  }
  return tierModels;
}

export function routeModelForAgent(task: string, agent: string): ModelRouteDecision {
  const scores = scoreTask(task);
  const ruleHits: string[] = [];
  let ruleTier: OrchestrationTier | undefined;

  for (const rule of RULES) {
    if (rule.patterns.test(task)) {
      ruleHits.push(rule.labelTh);
      if (!ruleTier || TIER_RANK[rule.tier] > TIER_RANK[ruleTier]) ruleTier = rule.tier;
    }
  }

  const agentDefault = AGENT_DEFAULT_TIER[agent.toUpperCase()] ?? "free";
  const recommendedTier = pickTier(scores, agentDefault, ruleTier);
  const candidates = modelsForTier(recommendedTier, agent.toUpperCase());
  const model = candidates[0] ?? MODEL_CATALOG[0];
  const fallbackModel = MODEL_CATALOG.find((m) => m.tier === "free" && m.id !== model.id);

  const tokenEstimate = Math.max(500, task.length * 4);
  const estimatedCostUsd = (tokenEstimate / 1_000_000) * model.costPer1M;

  const reasoning = `Agent ${agent}: tier=${recommendedTier} (complexity=${Math.round(scores.complexity * 100)}%, importance=${Math.round(scores.importance * 100)}%). Selected ${model.name}.`;
  const reasoningTh = `งาน${ruleHits.length ? ` (${ruleHits.join(", ")})` : ""} → ใช้ ${ORCHESTRATION_TIERS[recommendedTier].labelTh} → ${model.name}`;

  return {
    agent: agent.toUpperCase(),
    task: task.slice(0, 200),
    scores,
    recommendedTier,
    model,
    fallbackModel,
    reasoning,
    reasoningTh,
    ruleHits,
    estimatedCostUsd,
  };
}

export function routePipelineModels(userTask: string, agents: string[]): PipelineModelPlan {
  const scores = scoreTask(userTask);
  const decisions = agents.map((a) => routeModelForAgent(userTask, a));

  const tierCounts = { free: 0, low_cost: 0, premium: 0 };
  for (const d of decisions) tierCounts[d.recommendedTier]++;

  const summary = `ROUTER planned ${decisions.length} agents: ${tierCounts.free} free, ${tierCounts.low_cost} low-cost, ${tierCounts.premium} premium.`;
  const summaryTh = `ROUTER จัดสรร ${decisions.length} agent — ฟรี ${tierCounts.free}, ต้นทุนต่ำ ${tierCounts.low_cost}, พรีเมียม ${tierCounts.premium}`;

  return { userTask, scores, decisions, summary, summaryTh };
}

export function getOrchestrationSummary() {
  return {
    routerAgent: MODEL_ROUTER_AGENT,
    role: "AI Resource Manager",
    roleTh: "ผู้จัดการเลือกสมองให้ Agent",
    tiers: ORCHESTRATION_TIERS,
    models: MODEL_CATALOG,
    rules: RULES.map((r) => ({ id: r.id, labelTh: r.labelTh, tier: r.tier })),
    agentDefaults: AGENT_DEFAULT_TIER,
    flow: ["User", "DESK", "ROUTER", "เลือก Model", "Agent ทำงาน", "REPORT"],
  };
}

export function computeCostBreakdown(
  rows: { tier: OrchestrationTier; cost_usd: number }[]
): CostBreakdown {
  const byTier: CostBreakdown["byTier"] = {
    free: { calls: 0, costUsd: 0 },
    low_cost: { calls: 0, costUsd: 0 },
    premium: { calls: 0, costUsd: 0 },
  };
  let totalCostUsd = 0;
  for (const row of rows) {
    byTier[row.tier].calls += 1;
    byTier[row.tier].costUsd += row.cost_usd;
    totalCostUsd += row.cost_usd;
  }
  const totalCalls = rows.length || 1;
  const freePercent = Math.round((byTier.free.calls / totalCalls) * 100);
  const lowCostPercent = Math.round((byTier.low_cost.calls / totalCalls) * 100);
  const premiumPercent = Math.round((byTier.premium.calls / totalCalls) * 100);

  const allPremiumCost = totalCalls * 0.003;
  const savingsPercent = allPremiumCost > 0 ? Math.round((1 - totalCostUsd / allPremiumCost) * 100) : 100;

  return {
    period: "today",
    freePercent,
    lowCostPercent,
    premiumPercent,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalCalls: rows.length,
    savingsPercent: clamp(savingsPercent),
    byTier,
  };
}
