/**
 * Coding Workspace — execute Idea → Deploy pipeline (v0.18)
 */

import { createTask, updateTaskStatus } from "../db/index.ts";
import { broadcastTaskUpdate } from "../ws/index.ts";
import { isN8nAvailable, triggerWorkflow } from "../n8n/index.ts";
import { WORKFLOW_TEMPLATES } from "../n8n/index.ts";
import {
  planWorkspacePipeline,
  WORKSPACE_WORKFLOW_ID,
  type WorkspacePipeline,
  type WorkspaceStage,
} from "../../shared/workspace.ts";
import type { UserRole } from "../../shared/permissions.ts";

export interface WorkspaceExecuteResult {
  ok: boolean;
  message: string;
  messageTh: string;
  pipeline: WorkspacePipeline;
  tasksCreated: number;
  tasks: { id: string; title: string; agent: string; status: string; stageId: string }[];
  workflowStatus: "triggered" | "simulated" | "skipped";
  executionId?: string;
  runId: string;
}

function stageTaskTitle(stage: WorkspaceStage, idea: string): string {
  const short = idea.trim().slice(0, 60) || "New feature";
  return `[${stage.labelTh}] ${short}`;
}

export function planWorkspace(idea: string): WorkspacePipeline {
  return planWorkspacePipeline(idea);
}

export async function executeWorkspacePipeline(opts: {
  idea: string;
  tenantId?: string;
  n8nUrl?: string;
  userRole?: UserRole;
}): Promise<WorkspaceExecuteResult> {
  const pipeline = planWorkspacePipeline(opts.idea);
  const runId = `ws_${Date.now()}`;
  const tasks: WorkspaceExecuteResult["tasks"] = [];

  for (const stage of pipeline.stages) {
    if (stage.id === "idea") continue;

    const agent = stage.agents[0] || "DESK";
    const task = createTask({
      title: stageTaskTitle(stage, pipeline.idea),
      agent,
      description: `${stage.actionTh} (workspace run ${runId})`,
      tenantId: opts.tenantId,
    });
    updateTaskStatus(task.id, "queued", 0);
    broadcastTaskUpdate(task);
    tasks.push({
      id: task.id,
      title: task.title,
      agent: task.agent,
      status: task.status,
      stageId: stage.id,
    });
  }

  const template = WORKFLOW_TEMPLATES.find((t) => t.id === WORKSPACE_WORKFLOW_ID);
  let workflowStatus: WorkspaceExecuteResult["workflowStatus"] = "skipped";
  let executionId: string | undefined;

  const n8nUrl = opts.n8nUrl || process.env.VITE_N8N_URL || "http://localhost:5678";
  const n8nOnline = await isN8nAvailable(n8nUrl);

  if (n8nOnline && template) {
    try {
      const result = await triggerWorkflow(n8nUrl, template.n8nWorkflowId || template.id, {
        idea: pipeline.idea,
        runId,
        stages: pipeline.stages.map((s) => s.id),
      });
      workflowStatus = "triggered";
      executionId = result.executionId;
    } catch {
      workflowStatus = "simulated";
    }
  } else if (template) {
    const flowTask = createTask({
      title: template.name,
      agent: "FLOW",
      description: `${template.description} — idea: ${pipeline.idea.slice(0, 100)} (simulated)`,
      tenantId: opts.tenantId,
    });
    updateTaskStatus(flowTask.id, "running", 10);
    broadcastTaskUpdate(flowTask);
    tasks.push({
      id: flowTask.id,
      title: flowTask.title,
      agent: flowTask.agent,
      status: flowTask.status,
      stageId: "deploy",
    });
    workflowStatus = "simulated";
  }

  const updatedStages = pipeline.stages.map((s) => ({
    ...s,
    status: s.id === "idea" ? ("done" as const) : ("running" as const),
  }));

  const messageTh =
    workflowStatus === "triggered"
      ? `เริ่ม pipeline แล้ว — สร้าง ${tasks.length} งาน + trigger n8n workflow`
      : workflowStatus === "simulated"
        ? `เริ่ม pipeline แล้ว — สร้าง ${tasks.length} งาน (n8n offline — simulated)`
        : `สร้าง ${tasks.length} งานจาก pipeline`;

  const message =
    workflowStatus === "triggered"
      ? `Pipeline started — ${tasks.length} tasks created + n8n workflow triggered`
      : workflowStatus === "simulated"
        ? `Pipeline started — ${tasks.length} tasks created (n8n offline — simulated)`
        : `${tasks.length} tasks created from pipeline`;

  return {
    ok: true,
    message,
    messageTh,
    pipeline: { ...pipeline, stages: updatedStages },
    tasksCreated: tasks.length,
    tasks,
    workflowStatus,
    executionId,
    runId,
  };
}
