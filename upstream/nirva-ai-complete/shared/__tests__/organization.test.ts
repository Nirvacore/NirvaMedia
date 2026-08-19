import { describe, it, expect } from "vitest";
import {
  AI_COMPANIES,
  CONTROL_TOWER,
  INTENT_PIPELINES,
  getAllOrgAgents,
  getOrganizationSummary,
  findCompanyForAgent,
} from "../organization.ts";
import { AGENTS } from "../agents.ts";

describe("organization blueprint", () => {
  it("has 8 AI companies", () => {
    expect(AI_COMPANIES).toHaveLength(8);
  });

  it("control tower has DESK, FLOW, SAGE (ORACLE)", () => {
    const names = CONTROL_TOWER.map((c) => c.agent);
    expect(names).toContain("DESK");
    expect(names).toContain("FLOW");
    expect(names).toContain("SAGE");
  });

  it("maps only existing registry agents", () => {
    const registry = new Set(AGENTS.map((a) => a.name));
    const virtual = new Set(["ROUTER"]);
    for (const agent of getAllOrgAgents()) {
      if (virtual.has(agent)) continue;
      expect(registry.has(agent)).toBe(true);
    }
  });

  it("control tower includes ROUTER orchestration agent", () => {
    const names = CONTROL_TOWER.map((c) => c.agent);
    expect(names).toContain("ROUTER");
  });

  it("has intent pipelines for key use cases", () => {
    const ids = INTENT_PIPELINES.map((p) => p.id);
    expect(ids).toContain("build-software");
    expect(ids).toContain("sell-online");
    expect(ids).toContain("strategy");
  });

  it("summarizes organization", () => {
    const summary = getOrganizationSummary();
    expect(summary.summary.totalCompanies).toBe(8);
    expect(summary.summary.registryAgents).toBe(109);
  });

  it("finds company for CODE", () => {
    const company = findCompanyForAgent("CODE");
    expect(company?.id).toBe("software");
  });
});

describe("permissions", () => {
  it("viewer cannot deploy", async () => {
    const { canInvokeAgent } = await import("../permissions.ts");
    expect(canInvokeAgent("viewer", "SHIP").allowed).toBe(false);
  });

  it("developer can deploy", async () => {
    const { canInvokeAgent } = await import("../permissions.ts");
    expect(canInvokeAgent("developer", "SHIP").allowed).toBe(true);
  });
});

describe("agent router", () => {
  it("routes commerce sell intent", async () => {
    const { analyzeIntent } = await import("../../server/router/index.ts");
    const result = analyzeIntent("ขายของออนไลน์ ecommerce shop");
    expect(result.agents).toContain("DESK");
    expect(result.companyId).toBe("commerce");
  });

  it("routes code intent to software company", async () => {
    const { analyzeIntent } = await import("../../server/router/index.ts");
    const result = analyzeIntent("build REST API with typescript");
    expect(result.intent).toBe("build-software");
    expect(result.agents).toContain("ARCH");
    expect(result.agents).toContain("CODE");
  });

  it("executes route and creates tasks", async () => {
    const { executeRoute } = await import("../../server/router/index.ts");
    const result = executeRoute("สร้าง website", "developer");
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks[0].agent).toBe("DESK");
    expect(result.runId).toMatch(/^run_/);
  });
});
