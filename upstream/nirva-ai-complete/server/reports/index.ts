import { listTasks } from "../db/index.ts";
import { getOrganizationSummary } from "../../shared/organization.ts";
import { getRoleMatrix } from "../../shared/permissions.ts";
import { getRouterPipelines } from "../router/index.ts";
import { listMemoryEntries } from "../db/index.ts";
import { AGENT_STATS } from "../../shared/agents.ts";

export function buildOrganizationReport(tenantId?: string) {
  const tasks = listTasks(undefined, tenantId);
  const memories = listMemoryEntries();

  const completed = tasks.filter((t) => t.status === "completed");
  const running = tasks.filter((t) => t.status === "running");
  const queued = tasks.filter((t) => t.status === "queued");
  const failed = tasks.filter((t) => t.status === "failed");

  const routedTasks = tasks.filter((t) => t.title.startsWith("["));
  const issues = failed.map((t) => ({
    id: t.id,
    title: t.title,
    agent: t.agent,
    description: t.description,
    severity: "high" as const,
  }));

  // Heuristic next steps from queued pipeline tasks
  const nextSteps = queued
    .filter((t) => t.title.startsWith("["))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      action: t.title.replace(/^\[[^\]]+\]\s*/, ""),
      agent: t.agent,
      status: t.status,
    }));

  const agentWorkload: Record<string, number> = {};
  for (const t of tasks) {
    agentWorkload[t.agent] = (agentWorkload[t.agent] || 0) + 1;
  }

  const topAgents = Object.entries(agentWorkload)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([agent, count]) => ({ agent, taskCount: count }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalAgents: AGENT_STATS.total,
      activeTasks: running.length + queued.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      memoryEntries: memories.length,
      routedPipelineTasks: routedTasks.length,
    },
    tasks: {
      completed: completed.length,
      running: running.length,
      queued: queued.length,
      failed: failed.length,
      recent: tasks.slice(0, 10),
    },
    issues,
    nextSteps,
    topAgents,
    pipelines: getRouterPipelines(),
    permissions: getRoleMatrix(),
    organization: getOrganizationSummary().summary,
    tenantId: tenantId ?? null,
  };
}
