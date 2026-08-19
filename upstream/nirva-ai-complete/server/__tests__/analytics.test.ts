import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb } from "../db/index.ts";
import { createContent, ensureMediaSchema, saveBrandBrief } from "../media/index.ts";
import {
  analyzePerformance,
  computeStats,
  listMetrics,
  recordMetrics,
  setAnalystProvider,
} from "../media/analytics.ts";

describe("NMD analytics", () => {
  beforeAll(() => {
    getDb();
    ensureMediaSchema();
  });

  beforeEach(() => {
    delete process.env.NMD_DEMO_CONNECTORS;
  });

  it("records metrics linked to content and lists them with titles", () => {
    const org = `org-metrics-${Date.now()}`;
    const content = createContent({ title: "โพสต์เปิดตัว", body: "x", organizationId: org, actor: "tester" });
    const metric = recordMetrics(
      { contentId: content.id, platform: "facebook", reach: 1200, engagement: 96, clicks: 30, organizationId: org },
      "tester"
    );
    expect(metric.id).toMatch(/^met_/);
    expect(metric.contentTitle).toBe("โพสต์เปิดตัว");

    const entries = listMetrics(org);
    expect(entries).toHaveLength(1);
    expect(entries[0].reach).toBe(1200);
  });

  it("computes deterministic stats with best/worst by engagement rate", () => {
    const org = `org-stats-${Date.now()}`;
    const a = createContent({ title: "ดีมาก", body: "x", organizationId: org, actor: "tester" });
    const b = createContent({ title: "เงียบ", body: "x", organizationId: org, actor: "tester" });
    recordMetrics({ contentId: a.id, platform: "line", reach: 1000, engagement: 150, organizationId: org }, "tester");
    recordMetrics({ contentId: b.id, platform: "facebook", reach: 2000, engagement: 40, organizationId: org }, "tester");

    const stats = computeStats(listMetrics(org));
    expect(stats.entries).toBe(2);
    expect(stats.totalReach).toBe(3000);
    expect(stats.totalEngagement).toBe(190);
    expect(stats.best?.title).toBe("ดีมาก");
    expect(stats.best?.rate).toBeCloseTo(0.15);
    expect(stats.worst?.title).toBe("เงียบ");
  });

  it("analyzes with brand context through a swappable analyst", async () => {
    const org = `org-analyze-${Date.now()}`;
    saveBrandBrief({
      organizationId: org, brandName: "พันนา", product: "", audience: "", tone: "",
      competitors: "", bannedWords: [], notes: "",
    }, "tester");
    recordMetrics({ platform: "facebook", reach: 500, engagement: 50, organizationId: org }, "tester");

    let seenBrand: string | undefined;
    setAnalystProvider("fake-analyst", async (req) => {
      seenBrand = req.brand?.brandName;
      return {
        summary: `วิเคราะห์ ${req.stats.entries} รายการ`,
        working: ["hook คำถามได้ผล"],
        notWorking: [],
        recommendations: ["โพสต์ช่วงเช้าเพิ่ม"],
      };
    });

    const result = await analyzePerformance(org, "tester");
    expect(result.error).toBeUndefined();
    expect(result.insights?.summary).toContain("1 รายการ");
    expect(seenBrand).toBe("พันนา");
  });

  it("normalizes malformed analyst output so the UI never crashes", async () => {
    const org = `org-norm-${Date.now()}`;
    recordMetrics({ platform: "facebook", reach: 100, engagement: 10, organizationId: org }, "tester");
    setAnalystProvider("summary-only", async () =>
      ({ summary: "มีแค่ summary" }) as never
    );
    const result = await analyzePerformance(org, "tester");
    expect(result.error).toBeUndefined();
    expect(result.insights?.summary).toBe("มีแค่ summary");
    expect(result.insights?.working).toEqual([]);
    expect(result.insights?.notWorking).toEqual([]);
    expect(result.insights?.recommendations).toEqual([]);

    setAnalystProvider("no-summary", async () => ({ working: ["x"] }) as never);
    const bad = await analyzePerformance(org, "tester");
    expect(bad.insights).toBeNull();
    expect(bad.error).toContain("Analyst unavailable");
  });

  it("returns structured errors for no data and analyst failure", async () => {
    const emptyOrg = `org-empty-${Date.now()}`;
    setAnalystProvider("never-called", async () => {
      throw new Error("should not run");
    });
    const empty = await analyzePerformance(emptyOrg, "tester");
    expect(empty.insights).toBeNull();
    expect(empty.error).toContain("No metrics");

    const org = `org-broken-${Date.now()}`;
    recordMetrics({ platform: "x", reach: 10, engagement: 1, organizationId: org }, "tester");
    setAnalystProvider("broken-analyst", async () => {
      throw new Error("model offline");
    });
    const failed = await analyzePerformance(org, "tester");
    expect(failed.stats.entries).toBe(1);
    expect(failed.insights).toBeNull();
    expect(failed.error).toContain("Analyst unavailable");
  });
});
