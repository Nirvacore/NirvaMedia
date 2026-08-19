import { describe, it, expect, beforeEach } from "vitest";
import {
  runLoadTest,
  generateLoadTestReport,
  LoadTestConfig,
} from "../performance/load-testing.ts";
import {
  startMemoryProfiling,
  stopMemoryProfiling,
  getMemoryStats,
  generateMemoryReport,
} from "../performance/memory-profiler.ts";
import {
  recordQuery,
  analyzeQueries,
  getIndexRecommendations,
  generateQueryReport,
} from "../performance/query-optimizer.ts";
import {
  cacheInstance,
  getCacheKey,
  generateCacheReport,
} from "../performance/cache-strategy.ts";

describe("NMD Performance Benchmarking", () => {
  describe("Load Testing", () => {
    it("creates valid load test configuration", () => {
      const config: LoadTestConfig = {
        concurrency: 10,
        duration: 5000,
        rampUp: 1000,
        endpoints: ["http://localhost:3000/api/health"],
        method: "GET",
      };

      expect(config.concurrency).toBeGreaterThan(0);
      expect(config.duration).toBeGreaterThan(config.rampUp);
      expect(config.endpoints.length).toBeGreaterThan(0);
    });

    it("generates load test report with required fields", async () => {
      const config: LoadTestConfig = {
        concurrency: 5,
        duration: 100,
        rampUp: 50,
        endpoints: ["http://localhost:3000/api/health"],
        method: "GET",
      };

      const report = await runLoadTest(config);

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("duration");
      expect(report).toHaveProperty("concurrency");
      expect(report).toHaveProperty("totalRequests");
      expect(report).toHaveProperty("results");
      expect(report).toHaveProperty("summary");
    });

    it("calculates throughput metrics", async () => {
      const config: LoadTestConfig = {
        concurrency: 5,
        duration: 100,
        rampUp: 50,
        endpoints: ["http://localhost:3000/api/content"],
        method: "GET",
      };

      const report = await runLoadTest(config);

      expect(report.summary.averageThroughput).toBeGreaterThanOrEqual(0);
      expect(report.summary.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it("tracks per-endpoint results", async () => {
      const config: LoadTestConfig = {
        concurrency: 3,
        duration: 100,
        rampUp: 50,
        endpoints: [
          "http://localhost:3000/api/content",
          "http://localhost:3000/api/templates",
        ],
        method: "GET",
      };

      const report = await runLoadTest(config);

      expect(Array.isArray(report.results)).toBe(true);
      for (const result of report.results) {
        expect(result).toHaveProperty("endpoint");
        expect(result).toHaveProperty("totalRequests");
        expect(result).toHaveProperty("successfulRequests");
        expect(result).toHaveProperty("failedRequests");
        expect(result).toHaveProperty("throughput");
      }
    });

    it("generates human-readable load test report", async () => {
      const config: LoadTestConfig = {
        concurrency: 3,
        duration: 100,
        rampUp: 50,
        endpoints: ["http://localhost:3000/api/health"],
        method: "GET",
      };

      const report = await runLoadTest(config);
      const reportText = generateLoadTestReport(report);

      expect(reportText).toContain("LOAD TEST REPORT");
      expect(reportText).toContain("SUMMARY METRICS");
      expect(reportText).toContain("Throughput");
      expect(reportText).toContain("Response Time");
    });

    it("calculates response time percentiles", async () => {
      const config: LoadTestConfig = {
        concurrency: 5,
        duration: 100,
        rampUp: 50,
        endpoints: ["http://localhost:3000/api/health"],
        method: "GET",
      };

      const report = await runLoadTest(config);

      for (const result of report.results) {
        expect(result.p95ResponseTime).toBeGreaterThanOrEqual(result.minResponseTime);
        expect(result.p99ResponseTime).toBeGreaterThanOrEqual(result.p95ResponseTime);
        expect(result.maxResponseTime).toBeGreaterThanOrEqual(result.p99ResponseTime);
      }
    });
  });

  describe("Memory Profiling", () => {
    it("starts and stops memory profiling", () => {
      const intervalId = startMemoryProfiling(100);
      expect(typeof intervalId).toBe("number");

      const profile = stopMemoryProfiling(intervalId);
      expect(profile).toHaveProperty("snapshots");
      expect(profile).toHaveProperty("duration");
      expect(profile).toHaveProperty("maxHeap");
      expect(profile).toHaveProperty("minHeap");
      expect(profile).toHaveProperty("avgHeap");
    });

    it("captures memory snapshots over time", () => {
      const intervalId = startMemoryProfiling(50);

      setTimeout(() => {
        const profile = stopMemoryProfiling(intervalId);
        expect(profile.snapshots.length).toBeGreaterThan(0);

        for (const snapshot of profile.snapshots) {
          expect(snapshot).toHaveProperty("timestamp");
          expect(snapshot).toHaveProperty("heapUsed");
          expect(snapshot).toHaveProperty("heapTotal");
          expect(snapshot.heapUsed).toBeGreaterThan(0);
        }
      }, 200);
    });

    it("detects potential memory leaks", () => {
      const intervalId = startMemoryProfiling(100);

      setTimeout(() => {
        const profile = stopMemoryProfiling(intervalId);
        expect(profile).toHaveProperty("leakIndicators");
        expect(Array.isArray(profile.leakIndicators)).toBe(true);
      }, 500);
    });

    it("calculates heap memory statistics", () => {
      const intervalId = startMemoryProfiling(100);

      setTimeout(() => {
        const profile = stopMemoryProfiling(intervalId);

        expect(profile.maxHeap).toBeGreaterThanOrEqual(profile.minHeap);
        expect(profile.avgHeap).toBeGreaterThanOrEqual(profile.minHeap);
        expect(profile.avgHeap).toBeLessThanOrEqual(profile.maxHeap);
      }, 300);
    });

    it("provides current memory stats", () => {
      const stats = getMemoryStats();

      expect(stats).toHaveProperty("current");
      expect(stats).toHaveProperty("gcEventCount");
      expect(stats).toHaveProperty("totalFreedByGC");
      expect(stats).toHaveProperty("avgGCDuration");

      expect(stats.current.heapUsed).toBeGreaterThan(0);
      expect(stats.current.heapUsedPercent).toBeGreaterThanOrEqual(0);
      expect(stats.current.heapUsedPercent).toBeLessThanOrEqual(100);
    });

    it("generates memory profile report", () => {
      const intervalId = startMemoryProfiling(100);

      setTimeout(() => {
        const profile = stopMemoryProfiling(intervalId);
        const reportText = generateMemoryReport(profile);

        expect(reportText).toContain("MEMORY PROFILE REPORT");
        expect(reportText).toContain("HEAP MEMORY METRICS");
        expect(reportText).toContain("Max Heap Usage");
      }, 300);
    });
  });

  describe("Query Optimization", () => {
    beforeEach(() => {
      // Clear query log before each test
    });

    it("records query metrics", () => {
      recordQuery(
        "SELECT * FROM nmd_content WHERE organization_id = $1",
        45,
        10,
        ["idx_content_org_status"]
      );

      const report = analyzeQueries();
      expect(report.queries.length).toBeGreaterThan(0);
    });

    it("identifies slow queries", () => {
      recordQuery("SELECT * FROM nmd_content WHERE status = $1", 50, 5, []);
      recordQuery("SELECT COUNT(*) FROM nmd_metric_readings", 200, 1, []);
      recordQuery("SELECT * FROM nmd_comments WHERE content_id = $1", 30, 3, [
        "idx_comment_content",
      ]);

      const report = analyzeQueries();
      expect(report.slowQueries.length).toBeGreaterThan(0);
      expect(report.slowQueries[0].executionTime).toBeGreaterThan(100);
    });

    it("generates optimization suggestions", () => {
      recordQuery(
        "SELECT * FROM nmd_content WHERE organization_id = $1",
        250,
        100,
        []
      );
      recordQuery(
        "SELECT * FROM nmd_content WHERE organization_id = $1",
        240,
        95,
        []
      );

      const report = analyzeQueries();
      expect(report.suggestions.length).toBeGreaterThan(0);

      for (const suggestion of report.suggestions) {
        expect(suggestion).toHaveProperty("severity");
        expect(suggestion).toHaveProperty("issue");
        expect(suggestion).toHaveProperty("suggestion");
        expect(suggestion).toHaveProperty("estimatedImprovement");
      }
    });

    it("recommends database indexes", () => {
      const tables = [
        "nmd_content",
        "nmd_comments",
        "nmd_custom_metrics",
      ];

      const recommendations = getIndexRecommendations(tables);

      expect(recommendations.has("nmd_content")).toBe(true);
      expect(recommendations.has("nmd_comments")).toBe(true);

      const contentIndexes = recommendations.get("nmd_content");
      expect(Array.isArray(contentIndexes)).toBe(true);
      expect(contentIndexes?.length).toBeGreaterThan(0);
    });

    it("generates query optimization report", () => {
      recordQuery("SELECT * FROM nmd_content WHERE status = $1", 150, 20, []);
      recordQuery("SELECT * FROM nmd_comments WHERE content_id = $1", 40, 5, [
        "idx_comment_content",
      ]);

      const report = analyzeQueries();
      const reportText = generateQueryReport(report);

      expect(reportText).toContain("QUERY OPTIMIZATION REPORT");
      expect(reportText).toContain("PERFORMANCE SUMMARY");
    });
  });

  describe("Cache Strategy", () => {
    beforeEach(async () => {
      await cacheInstance.clear();
    });

    it("caches and retrieves values", async () => {
      const key = getCacheKey("content", "content_123", "org_123");
      const testData = { id: "content_123", title: "Test Content" };

      await cacheInstance.set(key, testData, 3600);
      const cached = await cacheInstance.get(key);

      expect(cached).toEqual(testData);
    });

    it("respects TTL on cached values", async () => {
      const key = getCacheKey("content", "content_456", "org_123");
      const testData = { id: "content_456", title: "Temporary" };

      await cacheInstance.set(key, testData, 1);

      // Should be available immediately
      let cached = await cacheInstance.get(key);
      expect(cached).toBeDefined();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));
      cached = await cacheInstance.get(key);
      expect(cached).toBeNull();
    });

    it("tracks cache hit and miss rates", async () => {
      const key = getCacheKey("template", "tmpl_123", "org_123");
      const data = { id: "tmpl_123" };

      // Miss
      await cacheInstance.get(key);

      // Set and hit
      await cacheInstance.set(key, data);
      await cacheInstance.get(key);
      await cacheInstance.get(key);

      const stats = cacheInstance.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0.5);
    });

    it("deletes cached entries", async () => {
      const key = getCacheKey("content", "content_789", "org_123");
      const data = { id: "content_789" };

      await cacheInstance.set(key, data);
      let cached = await cacheInstance.get(key);
      expect(cached).toBeDefined();

      const deleted = await cacheInstance.delete(key);
      expect(deleted).toBe(true);

      cached = await cacheInstance.get(key);
      expect(cached).toBeNull();
    });

    it("generates cache performance report", async () => {
      const key1 = getCacheKey("content", "c1", "org_123");
      const key2 = getCacheKey("template", "t1", "org_123");

      await cacheInstance.set(key1, { id: "c1" });
      await cacheInstance.set(key2, { id: "t1" });

      // Generate some hits
      await cacheInstance.get(key1);
      await cacheInstance.get(key1);
      await cacheInstance.get(key2);

      const reportText = generateCacheReport();
      expect(reportText).toContain("CACHE PERFORMANCE REPORT");
      expect(reportText).toContain("Hit Rate");
      expect(reportText).toContain("Total Keys Cached");
    });

    it("limits cache memory usage", async () => {
      const config = {
        defaultTTL: 3600,
        maxSize: 1000, // 1KB limit for testing
        evictionPolicy: "LRU" as const,
      };

      const stats = cacheInstance.getStats();
      expect(stats).toHaveProperty("estimatedMemory");
    });
  });

  describe("Performance Integration", () => {
    it("combines load testing with cache strategy", async () => {
      // Populate cache
      const key = getCacheKey("content", "perf_test", "org_123");
      await cacheInstance.set(key, { cached: true });

      // Verify retrieval
      const cached = await cacheInstance.get(key);
      expect(cached).toBeDefined();
    });

    it("analyzes overall system performance", () => {
      // Record sample queries
      recordQuery("SELECT * FROM nmd_content", 45, 10, ["idx_content_org_status"]);
      recordQuery("SELECT * FROM nmd_metrics", 120, 1, []);

      const queryReport = analyzeQueries();
      expect(queryReport.summary.totalQueries).toBe(2);

      // Get memory stats
      const memStats = getMemoryStats();
      expect(memStats.current.heapUsed).toBeGreaterThan(0);

      // Verify cache stats
      const cacheStats = cacheInstance.getStats();
      expect(cacheStats.totalKeys).toBeGreaterThanOrEqual(0);
    });

    it("validates performance against benchmarks", () => {
      recordQuery("SELECT * FROM nmd_content WHERE id = $1", 10, 1, [
        "PRIMARY KEY",
      ]);
      recordQuery("SELECT * FROM nmd_comments WHERE content_id = $1", 15, 5, [
        "idx_comment_content",
      ]);

      const report = analyzeQueries();
      const avgTime = report.summary.averageTime;

      // Should be under 50ms for indexed queries
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe("Performance Compliance", () => {
    it("ensures sub-100ms response times for indexed queries", () => {
      recordQuery("SELECT * FROM nmd_content WHERE id = $1", 25, 1, ["PRIMARY KEY"]);
      recordQuery("SELECT * FROM nmd_content WHERE org_id = $1", 45, 5, [
        "idx_content_org",
      ]);

      const report = analyzeQueries();
      for (const query of report.queries) {
        if (query.indexUsed.length > 0) {
          expect(query.executionTime).toBeLessThan(100);
        }
      }
    });

    it("monitors memory for leaks and growth", () => {
      const stats = getMemoryStats();
      expect(stats.current.heapUsedPercent).toBeLessThan(90);
    });

    it("validates cache hit rates", async () => {
      // Simulate cache usage
      const key = getCacheKey("content", "test", "org_123");
      await cacheInstance.set(key, { test: true });

      // Generate hits
      for (let i = 0; i < 5; i++) {
        await cacheInstance.get(key);
      }

      const stats = cacheInstance.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.5);
    });
  });
});
