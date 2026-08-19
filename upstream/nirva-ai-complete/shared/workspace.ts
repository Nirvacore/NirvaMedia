/**
 * Coding Workspace — Idea → Deploy pipeline (v0.18)
 */

import { planBrainTeam, type BrainTeamPlan } from "./brains.ts";

export type WorkspaceStageId = "idea" | "design" | "code" | "test" | "deploy";

export type WorkspaceStageStatus = "pending" | "running" | "done" | "skipped";

export interface WorkspaceStage {
  id: WorkspaceStageId;
  label: string;
  labelTh: string;
  agents: string[];
  action: string;
  actionTh: string;
  duration: string;
  status: WorkspaceStageStatus;
}

export interface WorkspacePipeline {
  idea: string;
  generatedAt: string;
  workflowId: string;
  stages: WorkspaceStage[];
  brainTeam: BrainTeamPlan;
  summaryTh: string;
  summaryEn: string;
}

export const WORKSPACE_WORKFLOW_ID = "code-arch-ship";

const BASE_STAGES: Omit<WorkspaceStage, "action" | "actionTh" | "status">[] = [
  {
    id: "idea",
    label: "Idea",
    labelTh: "ไอเดีย",
    agents: ["DESK"],
    duration: "0.5s",
  },
  {
    id: "design",
    label: "AI Design",
    labelTh: "ออกแบบ",
    agents: ["ARCH", "PIXEL"],
    duration: "2-5s",
  },
  {
    id: "code",
    label: "Code",
    labelTh: "เขียนโค้ด",
    agents: ["CODE"],
    duration: "5-30s",
  },
  {
    id: "test",
    label: "Test",
    labelTh: "ทดสอบ",
    agents: ["WALL"],
    duration: "2-10s",
  },
  {
    id: "deploy",
    label: "Deploy",
    labelTh: "Deploy",
    agents: ["SHIP", "FLOW"],
    duration: "10-60s",
  },
];

function truncateIdea(idea: string, max = 80): string {
  const trimmed = idea.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function planWorkspacePipeline(idea: string): WorkspacePipeline {
  const trimmed = idea.trim();
  const brainTeam = planBrainTeam(trimmed || "สร้าง feature ใหม่");
  const short = truncateIdea(trimmed || "New feature");

  const stages: WorkspaceStage[] = BASE_STAGES.map((stage) => {
    const actions: Record<WorkspaceStageId, { en: string; th: string }> = {
      idea: {
        en: `Capture idea: "${short}"`,
        th: `รับไอเดีย: "${short}"`,
      },
      design: {
        en: `Design architecture & UI for: ${short}`,
        th: `ออกแบบ architecture และ UI สำหรับ: ${short}`,
      },
      code: {
        en: `Implement: ${short}`,
        th: `เขียนโค้ด: ${short}`,
      },
      test: {
        en: `Run tests & security review for: ${short}`,
        th: `ทดสอบและตรวจ security: ${short}`,
      },
      deploy: {
        en: `Deploy via n8n pipeline: ${short}`,
        th: `Deploy ผ่าน n8n: ${short}`,
      },
    };
    return {
      ...stage,
      action: actions[stage.id].en,
      actionTh: actions[stage.id].th,
      status: "pending",
    };
  });

  const summaryTh = `Pipeline 5 ขั้น — ${stages.map((s) => s.labelTh).join(" → ")} | ทีม: ${brainTeam.agents.slice(0, 5).join(", ")}`;
  const summaryEn = `5-stage pipeline — ${stages.map((s) => s.label).join(" → ")} | Team: ${brainTeam.agents.slice(0, 5).join(", ")}`;

  return {
    idea: trimmed,
    generatedAt: new Date().toISOString(),
    workflowId: WORKSPACE_WORKFLOW_ID,
    stages,
    brainTeam,
    summaryTh,
    summaryEn,
  };
}
