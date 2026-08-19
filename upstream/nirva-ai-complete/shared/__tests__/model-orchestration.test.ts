import { describe, it, expect } from "vitest";
import {
  scoreTask,
  routeModelForAgent,
  routePipelineModels,
  computeCostBreakdown,
  MODEL_ROUTER_AGENT,
} from "../model-orchestration.ts";

describe("model orchestration", () => {
  it("routes ARCH to premium for ERP system design", () => {
    const decision = routeModelForAgent("สร้างระบบ ERP ใหม่ architecture", "ARCH");
    expect(decision.recommendedTier).toBe("premium");
    expect(decision.agent).toBe("ARCH");
    expect(["claude-sonnet", "gpt-4o", "gemini-pro", "claude-code"]).toContain(decision.model.id);
  });

  it("routes typo fix to free tier", () => {
    const decision = routeModelForAgent("แก้ typo ในหน้า about", "DESK");
    expect(decision.recommendedTier).toBe("free");
    expect(decision.model.costPer1M).toBe(0);
  });

  it("routes test writing to free", () => {
    const decision = routeModelForAgent("เขียน unit test สำหรับ API", "WALL");
    expect(decision.recommendedTier).toBe("free");
  });

  it("routes security to premium", () => {
    const scores = scoreTask("security audit vulnerability scan");
    expect(scores.importance).toBeGreaterThan(0.5);
    const decision = routeModelForAgent("security review production", "SHIELD");
    expect(decision.recommendedTier).toBe("premium");
  });

  it("plans pipeline with mixed tiers", () => {
    const plan = routePipelineModels("สร้างระบบ ERP ใหม่", ["DESK", "ARCH", "CODE", "WALL", "BRIEF"]);
    expect(plan.decisions).toHaveLength(5);
    expect(plan.decisions.find((d) => d.agent === "ARCH")?.recommendedTier).toBe("premium");
    expect(plan.summaryTh).toContain("ROUTER");
  });

  it("computes cost breakdown", () => {
    const breakdown = computeCostBreakdown([
      { tier: "free", cost_usd: 0 },
      { tier: "free", cost_usd: 0 },
      { tier: "premium", cost_usd: 0.002 },
    ]);
    expect(breakdown.freePercent).toBeGreaterThan(50);
    expect(breakdown.totalCalls).toBe(3);
  });

  it("uses ROUTER as orchestration agent id", () => {
    expect(MODEL_ROUTER_AGENT).toBe("ROUTER");
  });
});
