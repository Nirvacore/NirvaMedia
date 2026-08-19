import { describe, it, expect } from "vitest";
import { generateMorningBriefing, executeMorningActions } from "../morning/index.ts";

describe("morning briefing", () => {
  it("generates briefing with required fields", () => {
    const b = generateMorningBriefing();
    expect(b.greetingTh).toMatch(/สวัสดี/);
    expect(b.brainTeam.intent).toBe("morning_briefing");
    expect(b.companyPulse.totalAgents).toBe(109);
    expect(b.summaryTh.length).toBeGreaterThan(10);
  });

  it("includes infrastructure status when provided", () => {
    const b = generateMorningBriefing({
      infrastructure: { ollama: "offline", qdrant: "online", n8n: "offline" },
    });
    expect(b.summaryTh).toContain("Ollama");
    expect(b.infrastructure.ollama).toBe("offline");
  });

  it("executeMorningActions creates tasks via DESK routing", () => {
    const result = executeMorningActions();
    expect(result.ok).toBe(true);
    expect(result.briefing).toBeDefined();
    expect(result.tasksCreated).toBeGreaterThanOrEqual(0);
    expect(result.messageTh).toBeTruthy();
  });
});
