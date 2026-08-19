import { describe, it, expect } from "vitest";
import { getHealthStatus, getSystemMetrics, recordModuleMetric } from "../health/index.ts";

describe("NMD Production Deployment", () => {
  describe("Health checks", () => {
    it("returns health status", async () => {
      const health = await getHealthStatus();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it("includes database status", async () => {
      const health = await getHealthStatus();
      expect(health.database).toBeDefined();
      expect(health.database.status).toMatch(/connected|disconnected/);
      expect(health.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("includes cache status", async () => {
      const health = await getHealthStatus();
      expect(health.cache).toBeDefined();
      expect(health.cache.status).toMatch(/connected|disconnected/);
      expect(health.cache.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("includes memory metrics", async () => {
      const health = await getHealthStatus();
      expect(health.memory).toBeDefined();
      expect(health.memory.used).toBeGreaterThan(0);
      expect(health.memory.total).toBeGreaterThan(0);
      expect(health.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(health.memory.percentage).toBeLessThanOrEqual(100);
    });

    it("includes module status", async () => {
      const health = await getHealthStatus();
      expect(health.modules).toBeDefined();
      expect(Array.isArray(health.modules)).toBe(true);
      expect(health.modules.length).toBeGreaterThan(0);

      for (const mod of health.modules) {
        expect(mod.name).toBeDefined();
        expect(mod.status).toMatch(/operational|degraded|offline/);
        expect(mod.version).toBeDefined();
      }
    });

    it("includes health checks", async () => {
      const health = await getHealthStatus();
      expect(health.checks).toBeDefined();
      expect(Array.isArray(health.checks)).toBe(true);
      expect(health.checks.length).toBeGreaterThan(0);

      for (const check of health.checks) {
        expect(check.name).toBeDefined();
        expect(check.status).toMatch(/pass|warn|fail/);
        expect(check.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles unhealthy state", async () => {
      const health = await getHealthStatus();
      // Should still return valid structure even if unhealthy
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("timestamp");
      expect(health).toHaveProperty("checks");
    });
  });

  describe("System metrics", () => {
    it("returns system metrics", () => {
      const metrics = getSystemMetrics();
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    });
  });

  describe("Module monitoring", () => {
    it("records module metrics", () => {
      recordModuleMetric("content", 10, "operational");
      recordModuleMetric("templates", 8, "operational");
      recordModuleMetric("webhooks", 15, "degraded");

      const metrics = getSystemMetrics();
      expect(metrics).toBeDefined();
    });

    it("handles multiple module updates", async () => {
      recordModuleMetric("content", 5, "operational");
      recordModuleMetric("metrics", 7, "operational");
      recordModuleMetric("alerts", 12, "operational");

      const health = await getHealthStatus();
      expect(health.modules).toBeDefined();
      expect(health.modules.length).toBeGreaterThan(0);
    });
  });

  describe("Deployment readiness", () => {
    it("verifies all modules are available", async () => {
      const health = await getHealthStatus();
      const modules = health.modules.map((m) => m.name);

      const required = [
        "content",
        "templates",
        "metrics",
        "collaboration",
        "webhooks",
        "alerts",
        "roi",
        "publishing",
      ];

      for (const req of required) {
        expect(modules).toContain(req);
      }
    });

    it("confirms database connectivity for production", async () => {
      const health = await getHealthStatus();
      expect(health.database.status).toBe("connected");
    });

    it("verifies health check passes", async () => {
      const health = await getHealthStatus();
      const allChecks = health.checks;
      const criticalFails = allChecks.filter((c) => c.status === "fail" && c.name.startsWith("database"));
      expect(criticalFails.length).toBe(0);
    });

    it("ensures memory usage is healthy", async () => {
      const health = await getHealthStatus();
      expect(health.memory.percentage).toBeLessThan(90);
    });
  });

  describe("Container health", () => {
    it("has valid uptime calculation", async () => {
      const health = await getHealthStatus();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof health.uptime).toBe("number");
    });

    it("includes response times for all checks", async () => {
      const health = await getHealthStatus();
      for (const check of health.checks) {
        expect(typeof check.duration).toBe("number");
        expect(check.duration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Scalability indicators", () => {
    it("shows memory efficiency", async () => {
      const health = await getHealthStatus();
      // Should be running efficiently
      expect(health.memory.percentage).toBeLessThan(80);
    });

    it("reports connection counts", () => {
      const metrics = getSystemMetrics();
      expect(typeof metrics.activeConnections).toBe("number");
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
    });

    it("tracks request throughput", () => {
      const metrics = getSystemMetrics();
      expect(typeof metrics.requestsPerSecond).toBe("number");
    });
  });
});
