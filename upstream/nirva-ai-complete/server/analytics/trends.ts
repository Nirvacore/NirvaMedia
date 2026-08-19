/**
 * NMD Trend Analysis
 * Identify patterns, seasonality, and forecasting
 */

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface Trend {
  metric: string;
  direction: "up" | "down" | "stable";
  strength: number; // 0-100
  period: string; // "7d", "30d", "90d"
  changePercent: number;
  forecast: number[];
}

export interface SeasonalPattern {
  metric: string;
  period: "hourly" | "daily" | "weekly" | "monthly";
  peaks: number[];
  troughs: number[];
  amplitude: number;
  confidence: number;
}

export interface TrendReport {
  timestamp: string;
  trends: Trend[];
  patterns: SeasonalPattern[];
  anomalies: Anomaly[];
  forecast: ForecastData[];
}

export interface Anomaly {
  timestamp: string;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  deviation: number;
  severity: "low" | "medium" | "high";
}

export interface ForecastData {
  metric: string;
  period: "7d" | "30d" | "90d";
  forecast: Array<{ date: string; value: number; confidence: number }>;
}

export class TrendAnalyzer {
  private dataPoints: Map<string, DataPoint[]> = new Map();

  addDataPoint(metric: string, value: number, timestamp: string): void {
    if (!this.dataPoints.has(metric)) {
      this.dataPoints.set(metric, []);
    }

    this.dataPoints.get(metric)!.push({
      timestamp,
      value,
    });
  }

  calculateTrend(metric: string, period: "7d" | "30d" | "90d" = "30d"): Trend | null {
    const data = this.dataPoints.get(metric);
    if (!data || data.length < 2) return null;

    const periodDays = parseInt(period);
    const now = Date.now();
    const cutoff = now - periodDays * 24 * 60 * 60 * 1000;

    const relevantData = data.filter(
      (point) => new Date(point.timestamp).getTime() > cutoff
    );

    if (relevantData.length < 2) return null;

    const values = relevantData.map((p) => p.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    // Calculate linear regression slope for trend strength
    const avgX = relevantData.length / 2;
    const avgY = values.reduce((a, b) => a + b, 0) / values.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < relevantData.length; i++) {
      const x = i + 1;
      const y = values[i];
      numerator += (x - avgX) * (y - avgY);
      denominator += (x - avgX) * (x - avgX);
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    const strength = Math.min(Math.abs(slope) * 10, 100);

    // Generate forecast
    const forecast: number[] = [];
    for (let i = 1; i <= 7; i++) {
      forecast.push(lastValue + slope * i);
    }

    return {
      metric,
      direction:
        changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable",
      strength: Math.max(0, Math.min(100, strength)),
      period,
      changePercent,
      forecast,
    };
  }

  detectSeasonality(
    metric: string,
    period: "hourly" | "daily" | "weekly" = "daily"
  ): SeasonalPattern | null {
    const data = this.dataPoints.get(metric);
    if (!data || data.length < 30) return null;

    const values = data.map((p) => p.value);
    const groupSize =
      period === "hourly" ? 24 : period === "daily" ? 7 : 30;

    const groups: number[][] = [];
    for (let i = 0; i < values.length; i += groupSize) {
      groups.push(values.slice(i, i + groupSize));
    }

    if (groups.length < 2) return null;

    // Calculate averages for each time slot
    const slotAverages: number[] = [];
    for (let slot = 0; slot < groupSize; slot++) {
      const slotValues = groups
        .map((group) => group[slot])
        .filter((v) => v !== undefined);
      slotAverages.push(slotValues.reduce((a, b) => a + b, 0) / slotValues.length);
    }

    const overallAvg = slotAverages.reduce((a, b) => a + b, 0) / slotAverages.length;
    const variance = slotAverages.reduce(
      (sum, val) => sum + Math.pow(val - overallAvg, 2),
      0
    ) / slotAverages.length;
    const stdDev = Math.sqrt(variance);

    // Find peaks and troughs
    const peaks: number[] = [];
    const troughs: number[] = [];

    for (let i = 0; i < slotAverages.length; i++) {
      if (slotAverages[i] > overallAvg + stdDev) {
        peaks.push(i);
      } else if (slotAverages[i] < overallAvg - stdDev) {
        troughs.push(i);
      }
    }

    // Calculate correlation coefficient for seasonality confidence
    const amplitude = Math.max(...slotAverages) - Math.min(...slotAverages);
    const confidence = Math.min(100, (stdDev / overallAvg) * 100);

    return {
      metric,
      period,
      peaks,
      troughs,
      amplitude,
      confidence: Math.max(0, Math.min(100, confidence)),
    };
  }

  detectAnomalies(metric: string): Anomaly[] {
    const data = this.dataPoints.get(metric);
    if (!data || data.length < 10) return [];

    const values = data.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce(
      (sum, val) => sum + Math.pow(val - mean, 2),
      0
    ) / values.length;
    const stdDev = Math.sqrt(variance);

    const anomalies: Anomaly[] = [];
    const threshold = 2; // 2 standard deviations

    for (let i = data.length - 20; i < data.length; i++) {
      if (i < 0) continue;

      const point = data[i];
      const value = point.value;
      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > threshold) {
        const min = mean - stdDev * threshold;
        const max = mean + stdDev * threshold;

        anomalies.push({
          timestamp: point.timestamp,
          metric,
          value,
          expectedRange: { min, max },
          deviation: zScore,
          severity:
            zScore > 3 ? "high" : zScore > 2.5 ? "medium" : "low",
        });
      }
    }

    return anomalies;
  }

  generateForecast(metric: string, period: "7d" | "30d" | "90d" = "30d"): ForecastData | null {
    const trend = this.calculateTrend(metric, period);
    if (!trend) return null;

    const forecast: Array<{ date: string; value: number; confidence: number }> = [];
    const now = Date.now();

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(now + i * 24 * 60 * 60 * 1000);
      const value = trend.forecast[i - 1] || trend.forecast[trend.forecast.length - 1];
      const confidence = Math.max(20, 100 - i * 10); // Decreasing confidence

      forecast.push({
        date: forecastDate.toISOString(),
        value: Math.max(0, value),
        confidence,
      });
    }

    return {
      metric,
      period,
      forecast,
    };
  }

  generateTrendReport(): TrendReport {
    const trends: Trend[] = [];
    const patterns: SeasonalPattern[] = [];
    const anomalies: Anomaly[] = [];
    const forecasts: ForecastData[] = [];

    for (const metric of this.dataPoints.keys()) {
      const trend = this.calculateTrend(metric, "30d");
      if (trend) trends.push(trend);

      const pattern = this.detectSeasonality(metric, "daily");
      if (pattern) patterns.push(pattern);

      const metricAnomalies = this.detectAnomalies(metric);
      anomalies.push(...metricAnomalies);

      const forecast = this.generateForecast(metric, "30d");
      if (forecast) forecasts.push(forecast);
    }

    return {
      timestamp: new Date().toISOString(),
      trends,
      patterns,
      anomalies,
      forecast: forecasts,
    };
  }
}

export const globalTrendAnalyzer = new TrendAnalyzer();

export function generateTrendReportText(report: TrendReport): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD TREND ANALYSIS REPORT");
  lines.push("═".repeat(80));
  lines.push(`Generated: ${report.timestamp}`);
  lines.push("");

  if (report.trends.length > 0) {
    lines.push("IDENTIFIED TRENDS");
    lines.push("─".repeat(80));

    for (const trend of report.trends.slice(0, 5)) {
      lines.push(`\n${trend.metric}`);
      lines.push(
        `  Direction: ${trend.direction.toUpperCase()} | Change: ${trend.changePercent.toFixed(1)}%`
      );
      lines.push(`  Strength: ${"█".repeat(Math.ceil(trend.strength / 10))} ${trend.strength.toFixed(0)}/100`);
    }
    lines.push("");
  }

  if (report.patterns.length > 0) {
    lines.push("SEASONAL PATTERNS");
    lines.push("─".repeat(80));

    for (const pattern of report.patterns.slice(0, 3)) {
      lines.push(`\n${pattern.metric} (${pattern.period})`);
      lines.push(`  Confidence: ${pattern.confidence.toFixed(1)}%`);
      lines.push(`  Amplitude: ${pattern.amplitude.toFixed(2)}`);
      lines.push(`  Peak Times: ${pattern.peaks.join(", ")}`);
    }
    lines.push("");
  }

  if (report.anomalies.length > 0) {
    lines.push("DETECTED ANOMALIES");
    lines.push("─".repeat(80));

    for (const anomaly of report.anomalies.slice(0, 5)) {
      lines.push(
        `\n[${anomaly.severity.toUpperCase()}] ${anomaly.metric} at ${anomaly.timestamp}`
      );
      lines.push(`  Value: ${anomaly.value.toFixed(2)} (Expected: ${anomaly.expectedRange.min.toFixed(2)}-${anomaly.expectedRange.max.toFixed(2)})`);
    }
    lines.push("");
  }

  lines.push("═".repeat(80));

  return lines.join("\n");
}
