/**
 * Morning Briefing — Executive Dashboard data layer (v0.16)
 * Aggregates tasks, reports, infrastructure into daily briefing.
 */

import { listTasks } from "../db/index.ts";
import { buildOrganizationReport } from "../reports/index.ts";
import { planBrainTeam, type BrainTeamPlan } from "../../shared/brains.ts";
import { executeRoute } from "../router/index.ts";
import { broadcastTaskUpdate } from "../ws/index.ts";
import type { UserRole } from "../../shared/permissions.ts";

export interface MorningTaskItem {
  id: string;
  title: string;
  agent: string;
  status: string;
  progress: number;
}

export interface MorningPriority {
  id: string;
  action: string;
  agent: string;
  status: string;
}

export interface MorningIssue {
  id: string;
  title: string;
  agent: string;
  severity: string;
}

export interface MorningInfrastructure {
  ollama: "online" | "offline" | "unknown";
  qdrant: "online" | "offline" | "unknown";
  n8n: "online" | "offline" | "unknown";
}

export interface MorningBriefing {
  generatedAt: string;
  greeting: string;
  greetingTh: string;
  todayTasks: MorningTaskItem[];
  priorities: MorningPriority[];
  issues: MorningIssue[];
  companyPulse: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    memoryEntries: number;
    totalAgents: number;
  };
  infrastructure: MorningInfrastructure;
  brainTeam: BrainTeamPlan;
  summaryTh: string;
  summaryEn: string;
}

export interface MorningExecuteResult {
  ok: boolean;
  message: string;
  messageTh: string;
  briefing: MorningBriefing;
  tasksCreated: number;
  tasks: { id: string; title: string; agent: string; status: string }[];
  runId?: string;
}

function timeGreeting(): { en: string; th: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { en: "Good morning", th: "สวัสดีตอนเช้า" };
  if (hour < 17) return { en: "Good afternoon", th: "สวัสดีตอนบ่าย" };
  return { en: "Good evening", th: "สวัสดีตอนเย็น" };
}

export function generateMorningBriefing(opts: {
  tenantId?: string;
  infrastructure?: MorningInfrastructure;
} = {}): MorningBriefing {
  const report = buildOrganizationReport(opts.tenantId);
  const tasks = listTasks(undefined, opts.tenantId);
  const { en, th } = timeGreeting();

  const todayTasks = tasks
    .filter((t) => t.status === "running" || t.status === "queued")
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      agent: t.agent,
      status: t.status,
      progress: t.progress,
    }));

  const priorities = report.nextSteps.slice(0, 5).map((s) => ({
    id: s.id,
    action: s.action,
    agent: s.agent,
    status: s.status,
  }));

  const issues = report.issues.slice(0, 5).map((i) => ({
    id: i.id,
    title: i.title,
    agent: i.agent,
    severity: i.severity,
  }));

  const infra = opts.infrastructure ?? {
    ollama: "unknown",
    qdrant: "unknown",
    n8n: "unknown",
  };

  const offlineServices = [
    infra.ollama === "offline" ? "Ollama" : null,
    infra.qdrant === "offline" ? "Qdrant" : null,
    infra.n8n === "offline" ? "n8n" : null,
  ].filter(Boolean);

  const brainTeam = planBrainTeam("สรุปเช้าและจัดการงานวันนี้");

  const issueNote = issues.length > 0
    ? ` มีปัญหา ${issues.length} รายการที่ต้องติดตาม`
    : "";
  const infraNote = offlineServices.length > 0
    ? ` ${offlineServices.join(", ")} offline`
    : " ระบบพร้อมทำงาน";

  const summaryTh = `${th} — วันนี้มีงาน ${todayTasks.length} รายการ, คิว ${report.summary.activeTasks} งาน${issueNote}.${infraNote}`;
  const summaryEn = `${en} — ${todayTasks.length} tasks today, ${report.summary.activeTasks} in queue.${issues.length ? ` ${issues.length} issues.` : ""}${offlineServices.length ? ` ${offlineServices.join(", ")} offline.` : " All systems ready."}`;

  return {
    generatedAt: new Date().toISOString(),
    greeting: en,
    greetingTh: th,
    todayTasks,
    priorities,
    issues,
    companyPulse: {
      activeTasks: report.summary.activeTasks,
      completedTasks: report.summary.completedTasks,
      failedTasks: report.summary.failedTasks,
      memoryEntries: report.summary.memoryEntries,
      totalAgents: report.summary.totalAgents,
    },
    infrastructure: infra,
    brainTeam,
    summaryTh,
    summaryEn,
  };
}

export function executeMorningActions(opts: {
  tenantId?: string;
  infrastructure?: MorningInfrastructure;
  userRole?: UserRole;
  tenantAllowlist?: string[];
} = {}): MorningExecuteResult {
  const briefing = generateMorningBriefing(opts);

  const executeMessage = briefing.issues.length > 0
    ? `จัดการให้: แก้ปัญหา ${briefing.issues.length} รายการ และดำเนินงานสำคัญวันนี้`
    : "จัดการให้: ดำเนินการตาม morning briefing และงานที่ค้าง";

  const route = executeRoute(executeMessage, opts.userRole ?? "admin", {
    tenantId: opts.tenantId,
    tenantAllowlist: opts.tenantAllowlist,
    analysis: undefined,
  });

  for (const task of route.tasks) {
    broadcastTaskUpdate(task);
  }

  const messageTh = route.tasks.length > 0
    ? `DESK มอบหมาย ${route.tasks.length} งานให้ทีม Agent แล้ว — ตรวจสอบที่ Tasks`
    : "ไม่มีงานใหม่ที่ต้องสร้าง — ทุกอย่างดูเรียบร้อย";

  const message = route.tasks.length > 0
    ? `DESK assigned ${route.tasks.length} tasks to the agent team — check Tasks`
    : "No new tasks needed — everything looks on track";

  return {
    ok: true,
    message,
    messageTh,
    briefing,
    tasksCreated: route.tasks.length,
    tasks: route.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      agent: t.agent,
      status: t.status,
    })),
    runId: route.runId,
  };
}
