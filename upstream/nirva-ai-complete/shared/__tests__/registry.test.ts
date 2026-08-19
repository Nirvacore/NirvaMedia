import { describe, it, expect } from "vitest";
import { AGENTS, AGENT_STATS } from "../agents.ts";
import { NIRVA_ECOSYSTEM, getControlTower, getProductApps } from "../ecosystem.ts";

describe("agents registry", () => {
  it("has exactly 109 agents", () => {
    expect(AGENTS).toHaveLength(109);
    expect(AGENT_STATS.total).toBe(109);
  });

  it("tier counts sum to total", () => {
    expect(AGENT_STATS.selfHosted + AGENT_STATS.hybrid + AGENT_STATS.cloud).toBe(109);
  });

  it("all agents have required fields", () => {
    for (const agent of AGENTS) {
      expect(agent.name).toBeTruthy();
      expect(agent.role).toBeTruthy();
      expect(["self-hosted", "hybrid", "cloud"]).toContain(agent.tier);
      expect(agent.category).toBeTruthy();
    }
  });

  it("DESK is the control tower agent", () => {
    const desk = AGENTS.find((a) => a.name === "DESK");
    expect(desk?.tier).toBe("self-hosted");
    expect(desk?.category).toBe("Core Control Tower");
  });
});

describe("Nirva ecosystem", () => {
  it("has 6 ecosystem apps", () => {
    expect(NIRVA_ECOSYSTEM).toHaveLength(6);
  });

  it("has one control tower", () => {
    const tower = getControlTower();
    expect(tower.id).toBe("nirva-ai");
    expect(tower.role).toBe("control-tower");
  });

  it("has 5 product apps", () => {
    expect(getProductApps()).toHaveLength(5);
  });

  it("all apps have repo links", () => {
    for (const app of NIRVA_ECOSYSTEM) {
      expect(app.repo).toMatch(/^https:\/\/github\.com\/Nirvacore\//);
    }
  });
});
