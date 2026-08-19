/**
 * NMD Anomaly Detection
 * Statistical and ML-based anomaly detection for system monitoring
 */

export interface AnomalyDetectionConfig {
  windowSize: number; // historical data points to consider
  sensitivity: number; // 0-1, higher = more sensitive
  algorithms: ("zscore" | "isolation_forest" | "isolation_forest")[];
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  algorithm: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  action?: string;
}

export interface AnomalyDetectionResult {
  timestamp: string;
  metric: string;
  isAnomaly: boolean;
  confidence: number;
  reason?: string;
  alerts: AnomalyAlert[];
}

export class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private historicalData: Map<string, number[]> = new Map();
  private alerts: AnomalyAlert[] = [];
  private alertThresholds: Map<string, number> = new Map();

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = {
      windowSize: 100,
      sensitivity: 0.7,
      algorithms: ["zscore", "isolation_forest"],
      ...config,
    };

    // Initialize alert thresholds for critical metrics
    this.alertThresholds.set("error_rate", 2);
    this.alertThresholds.set("response_time", 500);
    this.alertThresholds.set("memory_usage", 85);
    this.alertThresholds.set("cpu_usage", 80);
  }

  addDataPoint(metric: string, value: number): void {
    if (!this.historicalData.has(metric)) {
      this.historicalData.set(metric, []);
    }

    const data = this.historicalData.get(metric)!;
    data.push(value);

    // Keep only windowSize points
    if (data.length > this.config.windowSize) {
      data.shift();
    }
  }

  detectAnomalyZScore(metric: string, value: number): AnomalyDetectionResult {
    const data = this.historicalData.get(metric) || [];

    if (data.length < 5) {
      return {
        timestamp: new Date().toISOString(),
        metric,
        isAnomaly: false,
        confidence: 0,
        reason: "Insufficient historical data",
        alerts: [],
      };
    }

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs((value - mean) / stdDev);
    const threshold = 2 + (1 - this.config.sensitivity); // Adjust based on sensitivity

    const isAnomaly = zScore > threshold;
    const confidence = Math.min(100, (zScore / threshold) * 100);

    const alert: AnomalyAlert | undefined = isAnomaly
      ? {
          id: `anom_${Date.now()}_${metric}`,
          timestamp: new Date().toISOString(),
          metric,
          value,
          expectedRange: {
            min: mean - stdDev * 2,
            max: mean + stdDev * 2,
          },
          algorithm: "zscore",
          confidence,
          severity: this.calculateSeverity(metric, confidence),
        }
      : undefined;

    if (alert) {
      this.alerts.push(alert);
    }

    return {
      timestamp: new Date().toISOString(),
      metric,
      isAnomaly,
      confidence: Math.max(0, Math.min(100, confidence)),
      reason: isAnomaly ? `Z-Score: ${zScore.toFixed(2)}` : undefined,
      alerts: alert ? [alert] : [],
    };
  }

  detectAnomalyIsolationForest(
    metric: string,
    value: number
  ): AnomalyDetectionResult {
    const data = this.historicalData.get(metric) || [];

    if (data.length < 10) {
      return {
        timestamp: new Date().toISOString(),
        metric,
        isAnomaly: false,
        confidence: 0,
        alerts: [],
      };
    }

    // Simplified isolation forest: check if value is extreme
    const sortedData = [...data].sort((a, b) => a - b);
    const q1 = sortedData[Math.floor(sortedData.length * 0.25)];
    const q3 = sortedData[Math.floor(sortedData.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const isOutlier = value < lowerBound || value > upperBound;
    const distanceFromBounds = Math.min(
      Math.abs(value - lowerBound),
      Math.abs(value - upperBound)
    );
    const confidence = Math.min(100, (Math.abs(distanceFromBounds) / iqr) * 50);

    const alert: AnomalyAlert | undefined = isOutlier
      ? {
          id: `anom_if_${Date.now()}_${metric}`,
          timestamp: new Date().toISOString(),
          metric,
          value,
          expectedRange: {
            min: lowerBound,
            max: upperBound,
          },
          algorithm: "isolation_forest",
          confidence,
          severity: this.calculateSeverity(metric, confidence),
        }
      : undefined;

    if (alert) {
      this.alerts.push(alert);
    }

    return {
      timestamp: new Date().toISOString(),
      metric,
      isAnomaly: isOutlier,
      confidence: Math.max(0, Math.min(100, confidence)),
      reason: isOutlier ? `Outside IQR bounds: [${lowerBound}, ${upperBound}]` : undefined,
      alerts: alert ? [alert] : [],
    };
  }

  private calculateSeverity(
    metric: string,
    confidence: number
  ): "low" | "medium" | "high" | "critical" {
    const threshold = this.alertThresholds.get(metric);

    if (!threshold) {
      if (confidence > 90) return "high";
      if (confidence > 75) return "medium";
      return "low";
    }

    if (confidence > 95) return "critical";
    if (confidence > 85) return "high";
    if (confidence > 70) return "medium";
    return "low";
  }

  getAlerts(metric?: string, unresolved = true): AnomalyAlert[] {
    let alerts = this.alerts;

    if (metric) {
      alerts = alerts.filter((a) => a.metric === metric);
    }

    if (unresolved) {
      // Return recent alerts (within last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      alerts = alerts.filter((a) => new Date(a.timestamp).getTime() > oneHourAgo);
    }

    return alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getMetricHealth(metric: string): {
    healthScore: number;
    recentAnomalies: number;
    status: "healthy" | "degraded" | "critical";
  } {
    const recentAlerts = this.getAlerts(metric, true);
    const criticalAlerts = recentAlerts.filter((a) => a.severity === "critical").length;
    const highAlerts = recentAlerts.filter((a) => a.severity === "high").length;

    const healthScore = Math.max(0, 100 - criticalAlerts * 30 - highAlerts * 15);
    const status =
      healthScore >= 80 ? "healthy" : healthScore >= 50 ? "degraded" : "critical";

    return {
      healthScore,
      recentAnomalies: recentAlerts.length,
      status,
    };
  }
}

export const globalAnomalyDetector = new AnomalyDetector({
  windowSize: 200,
  sensitivity: 0.75,
});

export function generateAnomalyReport(): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD ANOMALY DETECTION REPORT");
  lines.push("═".repeat(80));
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  const alerts = globalAnomalyDetector.getAlerts();

  if (alerts.length === 0) {
    lines.push("✓ No anomalies detected in the last hour");
  } else {
    lines.push("RECENT ANOMALIES");
    lines.push("─".repeat(80));

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const highAlerts = alerts.filter((a) => a.severity === "high");
    const mediumAlerts = alerts.filter((a) => a.severity === "medium");

    if (criticalAlerts.length > 0) {
      lines.push(`\n🔴 CRITICAL (${criticalAlerts.length}):`);
      for (const alert of criticalAlerts.slice(0, 3)) {
        lines.push(`  • ${alert.metric}: ${alert.value.toFixed(2)}`);
        lines.push(`    Expected: ${alert.expectedRange.min.toFixed(2)}-${alert.expectedRange.max.toFixed(2)}`);
      }
    }

    if (highAlerts.length > 0) {
      lines.push(`\n🟠 HIGH (${highAlerts.length}):`);
      for (const alert of highAlerts.slice(0, 3)) {
        lines.push(
          `  • ${alert.metric} (${alert.algorithm}): Confidence ${alert.confidence.toFixed(1)}%`
        );
      }
    }

    if (mediumAlerts.length > 0) {
      lines.push(`\n🟡 MEDIUM (${mediumAlerts.length}):`);
      lines.push(`  ${mediumAlerts.length} medium-severity anomalies detected`);
    }
  }

  lines.push("\n" + "═".repeat(80));

  return lines.join("\n");
}
