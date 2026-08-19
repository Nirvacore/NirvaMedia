/**
 * NMD Query Optimizer
 * Analyze SQL query performance and suggest optimizations
 */

export interface QueryMetrics {
  query: string;
  executionTime: number; // milliseconds
  rowsAffected: number;
  rowsExamined: number;
  indexUsed: string[];
  fullTableScan: boolean;
  executionPlan: string;
}

export interface OptimizationSuggestion {
  query: string;
  severity: "low" | "medium" | "high";
  issue: string;
  suggestion: string;
  estimatedImprovement: string;
}

export interface QueryReport {
  timestamp: string;
  queries: QueryMetrics[];
  slowQueries: QueryMetrics[];
  suggestions: OptimizationSuggestion[];
  summary: {
    totalQueries: number;
    averageTime: number;
    slowThreshold: number;
    slowQueryCount: number;
  };
}

const queryLog: QueryMetrics[] = [];
const slowQueryThreshold = 100; // milliseconds

export function recordQuery(
  query: string,
  executionTime: number,
  rowsAffected: number,
  indexUsed: string[] = [],
  executionPlan: string = ""
): void {
  queryLog.push({
    query,
    executionTime,
    rowsAffected,
    rowsExamined: Math.max(rowsAffected * 2, 100), // Estimate
    indexUsed,
    fullTableScan: indexUsed.length === 0,
    executionPlan,
  });
}

export function analyzeQueries(): QueryReport {
  const slowQueries = queryLog.filter((q) => q.executionTime > slowQueryThreshold);

  const suggestions = generateSuggestions(queryLog);

  const averageTime =
    queryLog.length > 0
      ? queryLog.reduce((sum, q) => sum + q.executionTime, 0) / queryLog.length
      : 0;

  const report: QueryReport = {
    timestamp: new Date().toISOString(),
    queries: queryLog,
    slowQueries,
    suggestions,
    summary: {
      totalQueries: queryLog.length,
      averageTime,
      slowThreshold: slowQueryThreshold,
      slowQueryCount: slowQueries.length,
    },
  };

  queryLog.length = 0;

  return report;
}

function generateSuggestions(queries: QueryMetrics[]): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const queryMap = new Map<string, QueryMetrics[]>();

  for (const query of queries) {
    if (!queryMap.has(query.query)) {
      queryMap.set(query.query, []);
    }
    queryMap.get(query.query)!.push(query);
  }

  for (const [queryStr, instances] of queryMap.entries()) {
    const avgTime = instances.reduce((sum, q) => sum + q.executionTime, 0) / instances.length;
    const allFullTableScans = instances.every((q) => q.fullTableScan);

    if (avgTime > slowQueryThreshold && allFullTableScans) {
      suggestions.push({
        query: queryStr,
        severity: avgTime > 500 ? "high" : "medium",
        issue: "Full table scans detected on slow query",
        suggestion: "Add indexes on WHERE clause columns or JOIN conditions",
        estimatedImprovement: "50-90% improvement",
      });
    }

    if (instances.length > 10) {
      const totalTime = instances.reduce((sum, q) => sum + q.executionTime, 0);
      if (totalTime > slowQueryThreshold * instances.length * 0.5) {
        suggestions.push({
          query: queryStr,
          severity: "high",
          issue: `Query executed ${instances.length} times, avg ${avgTime.toFixed(0)}ms`,
          suggestion:
            "Consider caching results or implementing query result pagination",
          estimatedImprovement: "30-70% improvement with caching",
        });
      }
    }

    if (queryStr.toUpperCase().includes("SELECT *")) {
      suggestions.push({
        query: queryStr,
        severity: "low",
        issue: "SELECT * query pattern detected",
        suggestion: "Specify only required columns to reduce data transfer",
        estimatedImprovement: "10-30% improvement",
      });
    }

    const joinCount = (queryStr.match(/JOIN/gi) || []).length;
    if (joinCount > 3) {
      suggestions.push({
        query: queryStr,
        severity: "medium",
        issue: `Complex query with ${joinCount} JOINs`,
        suggestion: "Consider breaking into multiple queries or adding materialized views",
        estimatedImprovement: "20-40% improvement",
      });
    }
  }

  return suggestions;
}

export function getIndexRecommendations(
  tables: string[]
): Map<string, string[]> {
  const recommendations = new Map<string, string[]>();

  const indexStrategies: Record<string, string[]> = {
    nmd_content: [
      "INDEX idx_content_org_status (organization_id, status)",
      "INDEX idx_content_category (category_id)",
      "INDEX idx_content_created (created_at DESC)",
    ],
    nmd_content_versions: [
      "INDEX idx_version_content (content_id)",
      "INDEX idx_version_status (status)",
      "INDEX idx_version_created (created_at DESC)",
    ],
    nmd_custom_metrics: [
      "INDEX idx_metric_org_type (organization_id, metric_type)",
      "INDEX idx_metric_created (created_at DESC)",
    ],
    nmd_metric_readings: [
      "INDEX idx_reading_metric (metric_id, recorded_at DESC)",
      "INDEX idx_reading_org (organization_id, recorded_at DESC)",
    ],
    nmd_comments: [
      "INDEX idx_comment_content (content_id)",
      "INDEX idx_comment_user (user_id)",
      "INDEX idx_comment_created (created_at DESC)",
    ],
    nmd_alert_rules: [
      "INDEX idx_alert_org_active (organization_id, is_active)",
      "INDEX idx_alert_type (alert_type)",
    ],
    nmd_webhook_subscriptions: [
      "INDEX idx_webhook_org_active (organization_id, is_active)",
      "INDEX idx_webhook_event (event_type)",
    ],
  };

  for (const table of tables) {
    if (indexStrategies[table]) {
      recommendations.set(table, indexStrategies[table]);
    }
  }

  return recommendations;
}

export function generateQueryReport(report: QueryReport): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD QUERY OPTIMIZATION REPORT");
  lines.push("═".repeat(80));
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Total Queries Analyzed: ${report.summary.totalQueries}`);
  lines.push("");

  lines.push("PERFORMANCE SUMMARY");
  lines.push("─".repeat(80));
  lines.push(`Average Query Time: ${report.summary.averageTime.toFixed(2)}ms`);
  lines.push(
    `Slow Queries (>${report.summary.slowThreshold}ms): ${report.summary.slowQueryCount}`
  );
  lines.push(`Slow Query Percentage: ${((report.summary.slowQueryCount / report.summary.totalQueries) * 100).toFixed(2)}%`);
  lines.push("");

  if (report.slowQueries.length > 0) {
    lines.push("TOP SLOW QUERIES");
    lines.push("─".repeat(80));

    const topSlow = report.slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);

    for (const query of topSlow) {
      lines.push(
        `\n${query.executionTime.toFixed(2)}ms | ${query.query.substring(0, 60)}...`
      );
      lines.push(`  Rows Examined: ${query.rowsExamined}`);
      lines.push(
        `  Full Table Scan: ${query.fullTableScan ? "YES ⚠" : "NO (Index Used)"}`
      );
      if (query.indexUsed.length > 0) {
        lines.push(`  Indexes: ${query.indexUsed.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (report.suggestions.length > 0) {
    lines.push("OPTIMIZATION SUGGESTIONS");
    lines.push("─".repeat(80));

    for (const sugg of report.suggestions.slice(0, 10)) {
      lines.push(
        `\n[${sugg.severity.toUpperCase()}] ${sugg.issue}`
      );
      lines.push(`  Query: ${sugg.query.substring(0, 50)}...`);
      lines.push(`  Suggestion: ${sugg.suggestion}`);
      lines.push(`  Estimated Improvement: ${sugg.estimatedImprovement}`);
    }
    lines.push("");
  }

  lines.push("═".repeat(80));

  return lines.join("\n");
}
