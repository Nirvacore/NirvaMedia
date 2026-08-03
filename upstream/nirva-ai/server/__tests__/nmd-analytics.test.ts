import { describe, it, expect, beforeEach } from "vitest";
import {
  globalDashboard,
  generateSampleCharts,
  AnalyticsDashboard,
} from "../analytics/dashboard.ts";
import {
  trackUsageEvent,
  generateUsageReport,
  getUserActivity,
  calculateEngagementScore,
  generateUsageReportText,
} from "../analytics/usage.ts";
import {
  globalTrendAnalyzer,
  generateTrendReportText,
} from "../analytics/trends.ts";
import {
  globalAnomalyDetector,
  generateAnomalyReport,
} from "../analytics/anomaly-detection.ts";
import {
  reportingEngine,
  generateReportManifest,
} from "../analytics/reporting.ts";

describe("NMD Advanced Analytics", () => {
  describe("Dashboard Metrics", () => {
    it("creates dashboard with default metrics", () => {
      const metrics = globalDashboard.getAllMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("retrieves individual metrics", () => {
      const metric = globalDashboard.getMetric("content_created_daily");
      expect(metric).toBeDefined();
      expect(metric?.name).toBe("Content Created (Daily)");
      expect(metric?.unit).toBe("items");
    });

    it("updates metric values", () => {
      globalDashboard.updateMetric("error_rate", 0.5, "down", -10);
      const metric = globalDashboard.getMetric("error_rate");

      expect(metric?.value).toBe(0.5);
      expect(metric?.trend).toBe("down");
      expect(metric?.trendPercent).toBe(-10);
    });

    it("calculates metric status based on thresholds", () => {
      globalDashboard.updateMetric("avg_response_time", 150);
      const metric = globalDashboard.getMetric("avg_response_time");

      expect(metric?.status).toBe("warning");

      globalDashboard.updateMetric("avg_response_time", 50);
      const updated = globalDashboard.getMetric("avg_response_time");
      expect(updated?.status).toBe("healthy");
    });
  });

  describe("Dashboard KPIs", () => {
    it("tracks KPI progress to targets", () => {
      const kpi = globalDashboard.getKPI("content_throughput");
      expect(kpi).toBeDefined();
      expect(kpi?.percentToTarget).toBeGreaterThan(0);
      expect(kpi?.percentToTarget).toBeLessThanOrEqual(100);
    });

    it("updates KPI values", () => {
      globalDashboard.updateKPI("system_uptime", 99.95);
      const kpi = globalDashboard.getKPI("system_uptime");

      expect(kpi?.currentValue).toBe(99.95);
      expect(kpi?.status).toBe("on_track");
    });

    it("classifies KPI status based on progress", () => {
      globalDashboard.updateKPI("content_throughput", 500, 1000);
      const kpi = globalDashboard.getKPI("content_throughput");

      expect(kpi?.status).toBe("at_risk");
      expect(kpi?.percentToTarget).toBe(50);
    });
  });

  describe("Dashboard Alerts", () => {
    it("adds alerts to dashboard", () => {
      globalDashboard.addAlert({
        severity: "warning",
        title: "High Memory Usage",
        message: "Memory usage exceeding 80%",
      });

      const data = globalDashboard.generateDashboardData();
      expect(data.alerts.length).toBeGreaterThan(0);
    });

    it("resolves alerts", () => {
      const data1 = globalDashboard.generateDashboardData();
      const alertId = data1.alerts[0]?.id;

      if (alertId) {
        globalDashboard.resolveAlert(alertId);
        globalDashboard.clearResolvedAlerts();

        const data2 = globalDashboard.generateDashboardData();
        expect(data2.alerts.find((a) => a.id === alertId)).toBeUndefined();
      }
    });
  });

  describe("Dashboard Charts", () => {
    it("generates sample chart data", () => {
      const charts = generateSampleCharts();
      expect(charts.length).toBeGreaterThan(0);
    });

    it("includes various chart types", () => {
      const charts = generateSampleCharts();
      const types = charts.map((c) => c.type);

      expect(types).toContain("line");
      expect(types).toContain("bar");
      expect(types).toContain("pie");
      expect(types).toContain("area");
    });

    it("provides properly formatted chart data", () => {
      const charts = generateSampleCharts();

      for (const chart of charts) {
        expect(chart).toHaveProperty("id");
        expect(chart).toHaveProperty("type");
        expect(chart).toHaveProperty("title");
        expect(chart).toHaveProperty("data");
        expect(Array.isArray(chart.data)).toBe(true);

        for (const dataPoint of chart.data) {
          expect(dataPoint).toHaveProperty("label");
          expect(dataPoint).toHaveProperty("value");
        }
      }
    });
  });

  describe("Usage Analytics", () => {
    beforeEach(() => {
      // Track sample events for each test
    });

    it("tracks usage events", () => {
      trackUsageEvent({
        organizationId: "org_test",
        userId: "user_test",
        action: "content.create",
        resource: "content_123",
        duration: 2500,
      });

      const report = generateUsageReport();
      expect(report.totalEvents).toBeGreaterThan(0);
    });

    it("calculates user activity metrics", () => {
      trackUsageEvent({
        organizationId: "org_analytics",
        userId: "user_analytics",
        action: "content.view",
        resource: "content_456",
      });

      const activity = getUserActivity("user_analytics", "org_analytics");
      expect(activity).toBeDefined();
      expect(activity?.eventsCount).toBeGreaterThan(0);
    });

    it("calculates engagement scores", () => {
      // Generate multiple events for consistent scoring
      for (let i = 0; i < 10; i++) {
        trackUsageEvent({
          organizationId: "org_engagement",
          userId: "user_engagement",
          action: "content.create",
          resource: `content_${i}`,
        });
      }

      const score = calculateEngagementScore("user_engagement", "org_engagement");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("generates usage reports", () => {
      const report = generateUsageReport("daily");

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("period");
      expect(report).toHaveProperty("totalEvents");
      expect(report).toHaveProperty("activeUsers");
      expect(report).toHaveProperty("activeOrganizations");
      expect(report).toHaveProperty("features");
      expect(report).toHaveProperty("topFeatures");
      expect(report).toHaveProperty("userActivity");
    });

    it("generates readable usage reports", () => {
      const report = generateUsageReport();
      const text = generateUsageReportText(report);

      expect(text).toContain("USAGE ANALYTICS REPORT");
      expect(text).toContain("Active Users");
    });
  });

  describe("Trend Analysis", () => {
    beforeEach(() => {
      for (let i = 0; i < 50; i++) {
        globalTrendAnalyzer.addDataPoint("test_metric", 50 + i * 0.5, new Date(Date.now() - (50 - i) * 60000).toISOString());
      }
    });

    it("detects upward trends", () => {
      const trend = globalTrendAnalyzer.calculateTrend("test_metric", "30d");

      expect(trend).toBeDefined();
      if (trend) {
        expect(trend.direction).toBe("up");
        expect(trend.changePercent).toBeGreaterThan(0);
      }
    });

    it("calculates trend strength", () => {
      const trend = globalTrendAnalyzer.calculateTrend("test_metric", "30d");

      expect(trend?.strength).toBeGreaterThanOrEqual(0);
      expect(trend?.strength).toBeLessThanOrEqual(100);
    });

    it("generates forecasts", () => {
      const trend = globalTrendAnalyzer.calculateTrend("test_metric", "30d");

      expect(trend?.forecast).toBeDefined();
      expect(trend?.forecast.length).toBeGreaterThan(0);
    });

    it("detects seasonal patterns", () => {
      const pattern = globalTrendAnalyzer.detectSeasonality("test_metric", "daily");

      if (pattern) {
        expect(pattern).toHaveProperty("peaks");
        expect(pattern).toHaveProperty("troughs");
        expect(pattern).toHaveProperty("confidence");
      }
    });

    it("generates trend reports", () => {
      const report = globalTrendAnalyzer.generateTrendReport();

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("trends");
      expect(report).toHaveProperty("patterns");
      expect(report).toHaveProperty("anomalies");
    });

    it("generates readable trend reports", () => {
      const report = globalTrendAnalyzer.generateTrendReport();
      const text = generateTrendReportText(report);

      expect(text).toContain("TREND ANALYSIS REPORT");
    });
  });

  describe("Anomaly Detection", () => {
    beforeEach(() => {
      // Add baseline data
      for (let i = 0; i < 20; i++) {
        globalAnomalyDetector.addDataPoint("error_rate", 0.3 + Math.random() * 0.2);
      }
    });

    it("detects anomalies using z-score", () => {
      // Add a clear anomaly
      globalAnomalyDetector.addDataPoint("error_rate", 5.0);

      const result = globalAnomalyDetector.detectAnomalyZScore("error_rate", 5.0);

      expect(result.isAnomaly).toBe(true);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it("detects anomalies using isolation forest", () => {
      globalAnomalyDetector.addDataPoint("memory_usage", 50);

      const result = globalAnomalyDetector.detectAnomalyIsolationForest("memory_usage", 95);

      expect(result).toHaveProperty("isAnomaly");
      expect(result).toHaveProperty("confidence");
    });

    it("retrieves anomaly alerts", () => {
      globalAnomalyDetector.detectAnomalyZScore("cpu_usage", 99);

      const alerts = globalAnomalyDetector.getAlerts("cpu_usage");

      expect(Array.isArray(alerts)).toBe(true);
    });

    it("calculates metric health", () => {
      const health = globalAnomalyDetector.getMetricHealth("error_rate");

      expect(health).toHaveProperty("healthScore");
      expect(health).toHaveProperty("status");
      expect(health.healthScore).toBeGreaterThanOrEqual(0);
      expect(health.healthScore).toBeLessThanOrEqual(100);
    });

    it("generates anomaly reports", () => {
      const report = generateAnomalyReport();

      expect(report).toContain("ANOMALY DETECTION REPORT");
    });
  });

  describe("Reporting Engine", () => {
    it("generates reports with configuration", () => {
      const report = reportingEngine.generateReport({
        title: "Test Report",
        period: "daily",
        format: "text",
        sections: ["executive_summary"],
      });

      expect(report).toHaveProperty("id");
      expect(report).toHaveProperty("title");
      expect(report).toHaveProperty("generatedAt");
      expect(report).toHaveProperty("content");
    });

    it("schedules recurring reports", () => {
      const schedule = reportingEngine.scheduleReport("daily_report", "daily", [
        "admin@example.com",
      ]);

      expect(schedule).toHaveProperty("id");
      expect(schedule).toHaveProperty("schedule");
      expect(schedule.enabled).toBe(true);
    });

    it("retrieves generated reports", () => {
      const report = reportingEngine.generateReport({
        title: "Retrieval Test",
        period: "weekly",
        format: "text",
        sections: ["performance_report"],
      });

      const retrieved = reportingEngine.getReport(report.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe("Retrieval Test");
    });

    it("lists recent reports", () => {
      const reports = reportingEngine.listReports(5);
      expect(Array.isArray(reports)).toBe(true);
    });

    it("exports reports in multiple formats", () => {
      const report = reportingEngine.generateReport({
        title: "Export Test",
        period: "monthly",
        format: "text",
        sections: [],
      });

      const jsonExport = reportingEngine.exportReport(report.id, "json");
      expect(jsonExport).toContain("Export Test");

      const csvExport = reportingEngine.exportReport(report.id, "csv");
      expect(csvExport).toContain("Export Test");

      const htmlExport = reportingEngine.exportReport(report.id, "html");
      expect(htmlExport).toContain("<!DOCTYPE");
    });

    it("generates comprehensive reports", () => {
      const report = reportingEngine.generateComprehensiveReport("org_123");

      expect(report).toHaveProperty("id");
      expect(report.title).toBe("Comprehensive Analytics Report");
      expect(report.content.length).toBeGreaterThan(100);
    });

    it("generates report manifest", () => {
      const manifest = generateReportManifest();

      expect(manifest).toContain("REPORTING ENGINE");
      expect(manifest).toContain("AVAILABLE REPORTS");
      expect(manifest).toContain("EXPORT FORMATS");
    });
  });

  describe("Analytics Integration", () => {
    it("combines dashboard with trending data", () => {
      globalDashboard.updateMetric("content_created_daily", 50, "up", 15);

      const metrics = globalDashboard.getAllMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("correlates usage with performance metrics", () => {
      trackUsageEvent({
        organizationId: "org_integration",
        userId: "user_integration",
        action: "content.create",
        resource: "test",
        duration: 2000,
      });

      const usageReport = generateUsageReport();
      const metrics = globalDashboard.getAllMetrics();

      expect(usageReport.totalEvents).toBeGreaterThan(0);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("generates comprehensive analytics snapshot", () => {
      const dashboardData = globalDashboard.generateDashboardData();
      const usageReport = generateUsageReport();
      const trendReport = globalTrendAnalyzer.generateTrendReport();

      expect(dashboardData).toHaveProperty("metrics");
      expect(dashboardData).toHaveProperty("kpis");
      expect(usageReport).toHaveProperty("totalEvents");
      expect(trendReport).toHaveProperty("trends");
    });
  });

  describe("Analytics Compliance", () => {
    it("maintains data integrity in reports", () => {
      const report1 = reportingEngine.generateReport({
        title: "Integrity Test",
        period: "daily",
        format: "json",
        sections: [],
      });

      const retrieved = reportingEngine.getReport(report1.id);

      expect(retrieved?.title).toBe(report1.title);
      expect(retrieved?.generatedAt).toBe(report1.generatedAt);
    });

    it("provides audit trail through reporting", () => {
      const report = reportingEngine.generateReport({
        title: "Audit Test",
        period: "monthly",
        format: "text",
        sections: [],
        organizationId: "org_audit",
      });

      expect(report.metadata.organizationId).toBe("org_audit");
      expect(report.generatedAt).toBeDefined();
    });

    it("supports multi-format exports", () => {
      const report = reportingEngine.generateReport({
        title: "Format Test",
        period: "daily",
        format: "text",
        sections: [],
      });

      const formats = ["json", "csv", "html"] as const;

      for (const format of formats) {
        const exported = reportingEngine.exportReport(report.id, format);
        expect(exported).toBeDefined();
        expect(exported.length).toBeGreaterThan(0);
      }
    });
  });
});
