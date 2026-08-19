import {
  INTENT_PIPELINES,
  AI_COMPANIES,
  CONTROL_TOWER,
  findCompanyForAgent,
  type IntentPipeline,
} from "../../shared/organization.ts";
import {
  canInvokeAgent,
  DEFAULT_USER_ROLE,
  type UserRole,
} from "../../shared/permissions.ts";
import { createTask, listTasks } from "../db/index.ts";
import { classifyWithLLM, type ClassifierMethod } from "./classifier.ts";
import { planPipelineAndRecord } from "../orchestration/index.ts";
import type { PipelineModelPlan } from "../../shared/model-orchestration.ts";

export interface RouteAnalysis {
  intent: string;
  intentLabel: string;
  intentLabelTh: string;
  confidence: number;
  classifierMethod: ClassifierMethod;
  classifierReasoning?: string;
  companyId: string;
  companyName: string;
  pipeline: IntentPipeline;
  agents: string[];
  workflowId?: string;
  description: string;
  blockedAgents: { agent: string; reason: string }[];
}

export interface RouteExecution {
  runId: string;
  analysis: RouteAnalysis;
  modelPlan: PipelineModelPlan;
  tasks: ReturnType<typeof createTask>[];
  status: "queued" | "running" | "completed";
  message: string;
}

function scorePipeline(message: string, pipeline: IntentPipeline): number {
  const lower = message.toLowerCase();
  let score = 0;
  for (const kw of pipeline.keywords) {
    if (lower.includes(kw.toLowerCase())) score += kw.length > 4 ? 2 : 1;
  }
  return score;
}

function pickKeywordPipeline(message: string): { pipeline: IntentPipeline; score: number } {
  const trimmed = message.trim();
  let best = INTENT_PIPELINES[0];
  let bestScore = 0;

  for (const pipeline of INTENT_PIPELINES) {
    const score = scorePipeline(trimmed, pipeline);
    if (score > bestScore) {
      bestScore = score;
      best = pipeline;
    }
  }

  if (bestScore === 0) {
    best = INTENT_PIPELINES.find((p) => p.id === "daily-ops")!;
    bestScore = 1;
  }

  return { pipeline: best, score: bestScore };
}

function buildRouteAnalysis(
  message: string,
  pipeline: IntentPipeline,
  score: number,
  userRole: UserRole,
  tenantAllowlist: string[] | undefined,
  classifierMethod: ClassifierMethod,
  classifierReasoning?: string,
  llmConfidence?: number
): RouteAnalysis {
  const company = AI_COMPANIES.find((c) => c.id === pipeline.companyId)!;
  const confidence =
    classifierMethod === "llm" && llmConfidence != null
      ? llmConfidence
      : Math.min(0.95, 0.4 + score * 0.12);

  const blockedAgents: { agent: string; reason: string }[] = [];
  const allowedAgents = pipeline.agents.filter((agent) => {
    if (tenantAllowlist && tenantAllowlist.length > 0 && !tenantAllowlist.includes(agent)) {
      blockedAgents.push({ agent, reason: "Not enabled for this organization" });
      return false;
    }
    const check = canInvokeAgent(userRole, agent);
    if (!check.allowed) {
      blockedAgents.push({ agent, reason: check.reason || "denied" });
      return false;
    }
    return true;
  });

  return {
    intent: pipeline.id,
    intentLabel: pipeline.label,
    intentLabelTh: pipeline.labelTh,
    confidence,
    classifierMethod,
    classifierReasoning,
    companyId: pipeline.companyId,
    companyName: company.name,
    pipeline,
    agents: allowedAgents.length > 0 ? allowedAgents : ["DESK"],
    workflowId: pipeline.workflowId,
    description: pipeline.description,
    blockedAgents,
  };
}

export function analyzeIntent(
  message: string,
  userRole: UserRole = DEFAULT_USER_ROLE,
  tenantAllowlist?: string[]
): RouteAnalysis {
  const { pipeline, score } = pickKeywordPipeline(message);
  return buildRouteAnalysis(message, pipeline, score, userRole, tenantAllowlist, "keyword");
}

export async function analyzeIntentAsync(
  message: string,
  userRole: UserRole = DEFAULT_USER_ROLE,
  tenantAllowlist?: string[],
  options?: { useLLM?: boolean; ollamaUrl?: string; model?: string }
): Promise<RouteAnalysis> {
  if (options?.useLLM) {
    const llm = await classifyWithLLM(message, {
      ollamaUrl: options.ollamaUrl,
      model: options.model,
    });
    if (llm) {
      const pipeline = INTENT_PIPELINES.find((p) => p.id === llm.pipelineId);
      if (pipeline) {
        return buildRouteAnalysis(
          message,
          pipeline,
          0,
          userRole,
          tenantAllowlist,
          "llm",
          llm.reasoning,
          llm.confidence
        );
      }
    }
  }

  return analyzeIntent(message, userRole, tenantAllowlist);
}

export function executeRoute(
  message: string,
  userRole: UserRole = DEFAULT_USER_ROLE,
  options?: { createTasks?: boolean; tenantId?: string; tenantAllowlist?: string[]; analysis?: RouteAnalysis }
): RouteExecution {
  const analysis = options?.analysis ?? analyzeIntent(message, userRole, options?.tenantAllowlist);
  const modelPlan = planPipelineAndRecord(message, analysis.agents, options?.tenantId);
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tasks: ReturnType<typeof createTask>[] = [];

  if (options?.createTasks !== false) {
    const tenantId = options?.tenantId;
    // DESK receives the user request
    tasks.push(createTask({
      title: `[DESK] ${analysis.intentLabelTh}`,
      agent: "DESK",
      description: `User request: ${message.slice(0, 200)}`,
      tenantId,
    }));

    // FLOW orchestrates if in pipeline
    if (analysis.agents.includes("FLOW")) {
      tasks.push(createTask({
        title: `[FLOW] Orchestrate: ${analysis.intentLabel}`,
        agent: "FLOW",
        description: analysis.description,
        tenantId,
      }));
    }

    // Specialist agents (skip DESK, FLOW, BRIEF for middle steps)
    const specialists = analysis.agents.filter(
      (a) => !["DESK", "FLOW", "BRIEF"].includes(a)
    );
    for (const agent of specialists) {
      tasks.push(createTask({
        title: `[${agent}] ${analysis.intentLabel}`,
        agent,
        description: `Pipeline step for: ${message.slice(0, 120)}`,
        tenantId,
      }));
    }

    // Report back
    if (analysis.agents.includes("BRIEF")) {
      tasks.push(createTask({
        title: `[BRIEF] Report: ${analysis.intentLabelTh}`,
        agent: "BRIEF",
        description: "สรุปผลและขั้นตอนถัดไป",
        tenantId,
      }));
    }
  }

  return {
    runId,
    analysis,
    modelPlan,
    tasks,
    status: "queued",
    message: buildRouteSummary(analysis, message, modelPlan),
  };
}

function buildRouteSummary(analysis: RouteAnalysis, userMessage: string, modelPlan?: PipelineModelPlan): string {
  const agentChain = analysis.agents.join(" → ");
  const methodLabel = analysis.classifierMethod === "llm" ? "LLM (Ollama)" : "Keyword";
  const lines = [
    `**DESK วิเคราะห์คำสั่งแล้ว** (confidence: ${Math.round(analysis.confidence * 100)}%, method: ${methodLabel})`,
    "",
    `**เป้าหมาย:** ${analysis.intentLabelTh}`,
    `**บริษัท:** ${analysis.companyName}`,
    `**Pipeline:** ${analysis.description}`,
    "",
    `**Agent Chain:**\n\`${agentChain}\``,
    "",
    `**คำสั่ง:** ${userMessage}`,
  ];
  if (analysis.blockedAgents.length > 0) {
    lines.push("", "**หมายเหตุ:** บาง agent ถูกจำกัดสิทธิ์:", ...analysis.blockedAgents.map((b) => `- ${b.agent}: ${b.reason}`));
  }
  if (analysis.workflowId) {
    lines.push("", `**Workflow:** \`${analysis.workflowId}\` (พร้อม trigger ผ่าน FLOW)`);
  }
  if (modelPlan) {
    lines.push("", `**ROUTER (Model):** ${modelPlan.summaryTh}`);
    const modelLines = modelPlan.decisions.slice(0, 6).map(
      (d: { agent: string; model: { name: string }; recommendedTier: string }) =>
        `- ${d.agent}: **${d.model.name}** (${d.recommendedTier})`
    );
    lines.push(...modelLines);
  }
  return lines.join("\n");
}

export function getRouterStatus() {
  const recentTasks = listTasks().slice(0, 20);
  return {
    controlTower: CONTROL_TOWER,
    pipelines: getRouterPipelines(),
    recentRoutedTasks: recentTasks.filter((t) =>
      t.title.startsWith("[DESK]") || t.title.startsWith("[FLOW]")
    ),
  };
}

export function getRouterPipelines() {
  return INTENT_PIPELINES.map((p) => ({
    id: p.id,
    label: p.label,
    labelTh: p.labelTh,
    agents: p.agents,
    companyId: p.companyId,
    workflowId: p.workflowId,
  }));
}

export function getAgentOrgContext(agentName: string) {
  const company = findCompanyForAgent(agentName);
  const inControlTower = CONTROL_TOWER.some((c) => c.agent === agentName.toUpperCase());
  return {
    agent: agentName.toUpperCase(),
    company: company ? { id: company.id, name: company.name } : null,
    controlTower: inControlTower,
  };
}
