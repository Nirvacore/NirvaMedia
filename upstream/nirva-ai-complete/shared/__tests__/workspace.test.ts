import { describe, it, expect } from "vitest";
import { planWorkspacePipeline, WORKSPACE_WORKFLOW_ID } from "../workspace.ts";

describe("planWorkspacePipeline", () => {
  it("returns 5 pipeline stages", () => {
    const p = planWorkspacePipeline("สร้างหน้า login ด้วย OAuth");
    expect(p.stages).toHaveLength(5);
    expect(p.stages.map((s) => s.id)).toEqual(["idea", "design", "code", "test", "deploy"]);
  });

  it("uses code-arch-ship workflow", () => {
    const p = planWorkspacePipeline("build REST API");
    expect(p.workflowId).toBe(WORKSPACE_WORKFLOW_ID);
    expect(p.workflowId).toBe("code-arch-ship");
  });

  it("assigns agents per stage", () => {
    const p = planWorkspacePipeline("deploy dashboard");
    expect(p.stages.find((s) => s.id === "design")?.agents).toEqual(["ARCH", "PIXEL"]);
    expect(p.stages.find((s) => s.id === "code")?.agents).toEqual(["CODE"]);
    expect(p.stages.find((s) => s.id === "test")?.agents).toEqual(["WALL"]);
    expect(p.stages.find((s) => s.id === "deploy")?.agents).toEqual(["SHIP", "FLOW"]);
  });

  it("includes brain team from planBrainTeam", () => {
    const p = planWorkspacePipeline("สร้างระบบ ERP ใหม่");
    expect(p.brainTeam.agents).toContain("DESK");
    expect(p.summaryTh).toContain("Pipeline");
  });

  it("embeds idea in stage actions", () => {
    const p = planWorkspacePipeline("Todo app with React");
    expect(p.stages[1]?.action).toContain("Todo app");
    expect(p.stages[2]?.actionTh).toContain("Todo app");
  });
});
