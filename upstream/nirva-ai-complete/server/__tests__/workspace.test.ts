import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { planWorkspace, executeWorkspacePipeline } from "../workspace/index.ts";

describe("workspace execute", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline")) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("plans workspace via planWorkspace", () => {
    const p = planWorkspace("สร้าง API");
    expect(p.stages).toHaveLength(5);
    expect(p.idea).toBe("สร้าง API");
  });

  it("creates tasks for design through deploy stages", async () => {
    const result = await executeWorkspacePipeline({ idea: "Landing page redesign" });
    expect(result.ok).toBe(true);
    expect(result.tasksCreated).toBeGreaterThanOrEqual(4);
    expect(result.runId).toMatch(/^ws_/);
    expect(result.pipeline.stages[0]?.status).toBe("done");
  });

  it("simulates workflow when n8n offline", async () => {
    const result = await executeWorkspacePipeline({ idea: "Mobile app MVP" });
    expect(result.workflowStatus).toBe("simulated");
    expect(result.messageTh).toContain("simulated");
  });
});
