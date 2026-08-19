import { describe, it, expect } from "vitest";
import { handleNMDRequest, orchestrateContentWorkflow, type NMDRequest } from "../api/nmd.ts";

describe("NMD API Gateway", () => {
  const orgId = "org_api_test";
  const userId = "user_api";

  describe("Content lifecycle orchestration", () => {
    it("creates content via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "content.create",
        payload: {
          title: "API Created Content",
          body: "Created through NMD API gateway",
          tags: ["api", "test"],
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
      expect(res.data).toBeDefined();
    });

    it("optimizes content via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "content.optimize",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
    });

    it("retrieves monitoring data via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "content.monitor",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.data).toHaveProperty("activeAlerts");
      expect(res.data).toHaveProperty("roi");
    });
  });

  describe("Versioning API", () => {
    it("creates version via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "version.create",
        payload: {
          contentId: "cnt_api",
          title: "Version 1",
          body: "Initial content",
          tags: ["v1"],
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
    });

    it("retrieves version history via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "version.history",
        payload: { contentId: "cnt_api" },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Collaboration API", () => {
    it("adds comment via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "comment.add",
        payload: {
          contentId: "cnt_api",
          text: "Great work! @user_reviewer",
          mentions: ["user_reviewer"],
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
    });

    it("retrieves activity feed via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "activity.feed",
        payload: { contentId: "cnt_api" },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Custom metrics API", () => {
    it("creates custom metric via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "metric.create",
        payload: {
          name: "API KPI",
          description: "Custom metric via API",
          formula: "test",
          unit: "%",
          targetValue: 100,
          currentValue: 75,
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
    });

    it("records metric reading via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "metric.record",
        payload: {
          metricId: "mtrc_api",
          value: 82,
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
    });
  });

  describe("Templates API", () => {
    it("searches templates via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "template.search",
        payload: {
          category: "announcements",
          limit: 10,
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Alerts API", () => {
    it("creates alert rule via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "alert.rule.create",
        payload: {
          name: "API Alert Rule",
          metric: "roi",
          condition: "exceeds",
          threshold: 100,
          notifyChannels: ["email", "webhook"],
        },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.status).toBe(201);
    });

    it("retrieves active alerts via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "alert.active",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("ROI API", () => {
    it("retrieves ROI report via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "roi.report",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
      expect(res.data).toHaveProperty("totalRevenue");
      expect(res.data).toHaveProperty("overallROI");
    });

    it("generates ROI forecast via API", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "roi.forecast",
        payload: { contentId: "cnt_forecast" },
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("returns error for unknown action", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "unknown.action",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.success).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toBeDefined();
    });

    it("includes timestamp in response", async () => {
      const req: NMDRequest = {
        organizationId: orgId,
        userId,
        action: "content.optimize",
        payload: {},
      };

      const res = await handleNMDRequest(req);
      expect(res.timestamp).toBeDefined();
      expect(new Date(res.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe("Workflow orchestration", () => {
    it("orchestrates complete content workflow", async () => {
      const workflow = await orchestrateContentWorkflow(orgId, userId, {
        title: "Orchestrated Content",
        body: "Full workflow test",
        tags: ["orchestration"],
      });

      expect(workflow.content).toBeDefined();
      expect(workflow.content.id).toBeDefined();
      expect(workflow.optimization).toBeDefined();
      expect(workflow.approval).toBeDefined();
      expect(workflow.publishTargets).toBeDefined();
      expect(workflow.publishTargets).toHaveLength(3);
    });
  });
});
