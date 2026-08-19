import { describe, it, expect } from "vitest";
import {
  AI_BRAINS,
  BRAIN_CATEGORIES,
  GLOBAL_PROVIDERS,
  PRICING_PLANS,
  planBrainTeam,
  getBrainsForPlan,
  getBrainsByCategory,
  getBrainStats,
} from "../brains.ts";

describe("brains catalog", () => {
  it("has 7 brain categories", () => {
    expect(Object.keys(BRAIN_CATEGORIES)).toHaveLength(7);
  });

  it("has marketplace brains for each category", () => {
    const categories = new Set(AI_BRAINS.map((b) => b.category));
    expect(categories.size).toBe(7);
  });

  it("has global providers from 5+ regions", () => {
    const regions = new Set(GLOBAL_PROVIDERS.map((p) => p.region));
    expect(regions.size).toBeGreaterThanOrEqual(5);
    expect(GLOBAL_PROVIDERS.length).toBeGreaterThanOrEqual(10);
  });

  it("has 3 pricing plans", () => {
    expect(PRICING_PLANS).toHaveLength(3);
    expect(PRICING_PLANS.map((p) => p.id)).toEqual(["free", "pro", "enterprise"]);
  });

  it("free plan includes developer brain only", () => {
    const free = getBrainsForPlan("free");
    expect(free.every((b) => b.category === "developer")).toBe(true);
    expect(free.length).toBeGreaterThan(0);
  });

  it("pro plan includes all categories", () => {
    const pro = getBrainsForPlan("pro");
    const cats = new Set(pro.map((b) => b.category));
    expect(cats.size).toBe(7);
  });
});

describe("planBrainTeam", () => {
  it("plans new business team", () => {
    const plan = planBrainTeam("ช่วยเปิดบริษัทใหม่");
    expect(plan.intent).toBe("new_business");
    expect(plan.categories).toContain("ceo");
    expect(plan.agents).toContain("DESK");
    expect(plan.agents).toContain("FLOW");
    expect(plan.workflow).toBe("parallel_then_synthesize");
  });

  it("plans developer team for coding", () => {
    const plan = planBrainTeam("ช่วยสร้างแอป website");
    expect(plan.intent).toBe("build_software");
    expect(plan.categories).toContain("developer");
    expect(plan.agents).toContain("CODE");
  });

  it("plans morning briefing", () => {
    const plan = planBrainTeam("จัดการให้");
    expect(plan.intent).toBe("morning_briefing");
    expect(plan.categories).toContain("ceo");
  });

  it("defaults to CEO for unknown intent", () => {
    const plan = planBrainTeam("hello");
    expect(plan.intent).toBe("general");
    expect(plan.primaryCategory).toBe("ceo");
    expect(plan.agents).toContain("DESK");
  });
});

describe("getBrainStats", () => {
  it("returns consistent stats", () => {
    const stats = getBrainStats();
    expect(stats.totalBrains).toBe(AI_BRAINS.length);
    expect(stats.totalCategories).toBe(7);
    expect(stats.freeBrains + stats.proBrains).toBe(AI_BRAINS.length);
  });
});

describe("getBrainsByCategory", () => {
  it("returns developer brains", () => {
    const dev = getBrainsByCategory("developer");
    expect(dev.length).toBeGreaterThan(0);
    expect(dev[0].category).toBe("developer");
  });
});
