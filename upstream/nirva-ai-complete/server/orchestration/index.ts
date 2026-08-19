import {
  routeModelForAgent,
  routePipelineModels,
  getOrchestrationSummary,
  computeCostBreakdown,
  MODEL_CATALOG,
  type ModelRouteDecision,
  type PipelineModelPlan,
  type OrchestrationTier,
} from "../../shared/model-orchestration.ts";
import { getDb } from "../db/index.ts";

export interface OrchestrationPrefs {
  maxPremiumPercent?: number;
  preferSelfHosted?: boolean;
}

export function resolveOllamaModel(
  decision: ModelRouteDecision,
  fallback = "llama3.1:8b"
): string {
  if (decision.model.ollamaTag) return decision.model.ollamaTag;
  if (decision.fallbackModel?.ollamaTag) return decision.fallbackModel.ollamaTag;
  const sameTier = MODEL_CATALOG.find((m) => m.tier === decision.recommendedTier && m.ollamaTag);
  if (sameTier?.ollamaTag) return sameTier.ollamaTag;
  return fallback;
}

function applyOrchestrationLimits(
  decision: ModelRouteDecision,
  tenantId?: string,
  prefs?: OrchestrationPrefs
): ModelRouteDecision {
  let result = decision;

  if (prefs?.preferSelfHosted && result.scores.privacy >= 0.5) {
    const selfHosted = MODEL_CATALOG.find((m) => m.provider === "ollama" && m.tier === "free");
    if (selfHosted) {
      result = {
        ...result,
        recommendedTier: "free",
        model: selfHosted,
        reasoningTh: `${result.reasoningTh} (เลือก self-hosted ตามนโยบายความเป็นส่วนตัว)`,
        estimatedCostUsd: 0,
      };
    }
  }

  const cap = prefs?.maxPremiumPercent;
  if (cap != null && result.recommendedTier === "premium") {
    const stats = getTodayUsage(tenantId);
    if (stats.totalCalls > 0 && stats.premiumPercent >= cap) {
      const lowModel =
        MODEL_CATALOG.find((m) => m.tier === "low_cost" && m.ollamaTag) ||
        MODEL_CATALOG.find((m) => m.tier === "free" && m.ollamaTag);
      if (lowModel) {
        result = {
          ...result,
          recommendedTier: lowModel.tier,
          model: lowModel,
          reasoningTh: `${result.reasoningTh} (ลด tier — premium วันนี้ ${stats.premiumPercent}% ≥ ${cap}%)`,
          estimatedCostUsd: 0,
        };
      }
    }
  }

  return result;
}

export function getRecentRouting(tenantId?: string, limit = 10) {
  const db = getDb();
  const rows = tenantId
    ? (db
        .prepare(
          `SELECT id, agent, model_id, tier, task_preview, cost_usd, created_at
           FROM model_usage WHERE tenant_id = ?
           ORDER BY created_at DESC LIMIT ?`
        )
        .all(tenantId, limit) as {
        id: string;
        agent: string;
        model_id: string;
        tier: OrchestrationTier;
        task_preview: string;
        cost_usd: number;
        created_at: string;
      }[])
    : (db
        .prepare(
          `SELECT id, agent, model_id, tier, task_preview, cost_usd, created_at
           FROM model_usage ORDER BY created_at DESC LIMIT ?`
        )
        .all(limit) as {
        id: string;
        agent: string;
        model_id: string;
        tier: OrchestrationTier;
        task_preview: string;
        cost_usd: number;
        created_at: string;
      }[]);

  return rows.map((r) => ({
    id: r.id,
    agent: r.agent,
    modelId: r.model_id,
    tier: r.tier,
    taskPreview: r.task_preview,
    costUsd: r.cost_usd,
    createdAt: r.created_at,
  }));
}

export function recordModelUsage(opts: {
  tenantId?: string;
  agent: string;
  modelId: string;
  tier: OrchestrationTier;
  taskPreview: string;
  costUsd: number;
  tokensEstimate?: number;
}) {
  const db = getDb();
  const id = `muse_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    `INSERT INTO model_usage (id, tenant_id, agent, model_id, tier, task_preview, cost_usd, tokens_estimate, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    id,
    opts.tenantId || "tenant_nirva_default",
    opts.agent.toUpperCase(),
    opts.modelId,
    opts.tier,
    opts.taskPreview.slice(0, 200),
    opts.costUsd,
    opts.tokensEstimate ?? 0
  );
  return id;
}

export function getTodayUsage(tenantId?: string) {
  const db = getDb();
  const rows = tenantId
    ? (db
        .prepare(
          `SELECT tier, cost_usd FROM model_usage
           WHERE date(created_at) = date('now') AND tenant_id = ?`
        )
        .all(tenantId) as { tier: OrchestrationTier; cost_usd: number }[])
    : (db
        .prepare(`SELECT tier, cost_usd FROM model_usage WHERE date(created_at) = date('now')`)
        .all() as { tier: OrchestrationTier; cost_usd: number }[]);
  return computeCostBreakdown(rows);
}

export function routeAndRecord(
  task: string,
  agent: string,
  tenantId?: string,
  prefs?: OrchestrationPrefs
): ModelRouteDecision {
  const decision = applyOrchestrationLimits(routeModelForAgent(task, agent), tenantId, prefs);
  recordModelUsage({
    tenantId,
    agent: decision.agent,
    modelId: decision.model.id,
    tier: decision.recommendedTier,
    taskPreview: task,
    costUsd: decision.estimatedCostUsd,
  });
  return decision;
}

export function planPipelineAndRecord(
  userTask: string,
  agents: string[],
  tenantId?: string
): PipelineModelPlan {
  const plan = routePipelineModels(userTask, agents);
  for (const d of plan.decisions) {
    recordModelUsage({
      tenantId,
      agent: d.agent,
      modelId: d.model.id,
      tier: d.recommendedTier,
      taskPreview: userTask,
      costUsd: d.estimatedCostUsd,
    });
  }
  return plan;
}

export { routeModelForAgent, routePipelineModels, getOrchestrationSummary, getTodayUsage as getCostStats };
