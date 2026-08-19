/**
 * NMD Analytics Dashboard
 * Real-time metrics, KPIs, and visualization data
 */

export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  lastUpdated: string;
  threshold?: number;
  status: "healthy" | "warning" | "critical";
}

export interface DashboardKPI {
  id: string;
  name: string;
  currentValue: number;
  targetValue: number;
  percentToTarget: number;
  unit: string;
  status: "on_track" | "at_risk" | "off_track";
  lastUpdated: string;
}

export interface DashboardData {
  timestamp: string;
  metrics: DashboardMetric[];
  kpis: DashboardKPI[];
  charts: ChartData[];
  alerts: AlertItem[];
}

export interface ChartData {
  id: string;
  type: "line" | "bar" | "pie" | "area";
  title: string;
  data: Array<{ label: string; value: number; timestamp?: string }>;
  xAxis: string;
  yAxis: string;
}

export interface AlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export class AnalyticsDashboard {
  private metrics: Map<string, DashboardMetric> = new Map();
  private kpis: Map<string, DashboardKPI> = new Map();
  private alerts: AlertItem[] = [];
  private chartData: Map<string, ChartData> = new Map();

  constructor() {
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics(): void {
    // Content metrics
    this.metrics.set("content_created_daily", {
      id: "content_created_daily",
      name: "Content Created (Daily)",
      value: 42,
      unit: "items",
      trend: "up",
      trendPercent: 12.5,
      lastUpdated: new Date().toISOString(),
      status: "healthy",
    });

    this.metrics.set("content_published", {
      id: "content_published",
      name: "Published Content",
      value: 156,
      unit: "items",
      trend: "up",
      trendPercent: 8.3,
      lastUpdated: new Date().toISOString(),
      status: "healthy",
    });

    // Performance metrics
    this.metrics.set("avg_response_time", {
      id: "avg_response_time",
      name: "Avg Response Time",
      value: 42,
      unit: "ms",
      trend: "stable",
      trendPercent: 0,
      lastUpdated: new Date().toISOString(),
      threshold: 100,
      status: "healthy",
    });

    this.metrics.set("cache_hit_rate", {
      id: "cache_hit_rate",
      name: "Cache Hit Rate",
      value: 78.5,
      unit: "%",
      trend: "up",
      trendPercent: 5.2,
      lastUpdated: new Date().toISOString(),
      threshold: 70,
      status: "healthy",
    });

    // User metrics
    this.metrics.set("active_users", {
      id: "active_users",
      name: "Active Users (24h)",
      value: 324,
      unit: "users",
      trend: "up",
      trendPercent: 15.8,
      lastUpdated: new Date().toISOString(),
      status: "healthy",
    });

    this.metrics.set("error_rate", {
      id: "error_rate",
      name: "Error Rate",
      value: 0.32,
      unit: "%",
      trend: "down",
      trendPercent: -22.1,
      lastUpdated: new Date().toISOString(),
      threshold: 1,
      status: "healthy",
    });

    // Initialize KPIs
    this.kpis.set("content_throughput", {
      id: "content_throughput",
      name: "Monthly Content Throughput",
      currentValue: 892,
      targetValue: 1000,
      percentToTarget: 89.2,
      unit: "items",
      status: "on_track",
      lastUpdated: new Date().toISOString(),
    });

    this.kpis.set("system_uptime", {
      id: "system_uptime",
      name: "System Uptime",
      currentValue: 99.94,
      targetValue: 99.9,
      percentToTarget: 100,
      unit: "%",
      status: "on_track",
      lastUpdated: new Date().toISOString(),
    });

    this.kpis.set("user_satisfaction", {
      id: "user_satisfaction",
      name: "User Satisfaction Score",
      currentValue: 4.6,
      targetValue: 4.5,
      percentToTarget: 102,
      unit: "stars",
      status: "on_track",
      lastUpdated: new Date().toISOString(),
    });
  }

  updateMetric(
    id: string,
    value: number,
    trend: "up" | "down" | "stable" = "stable",
    trendPercent: number = 0
  ): void {
    const metric = this.metrics.get(id);
    if (metric) {
      metric.value = value;
      metric.trend = trend;
      metric.trendPercent = trendPercent;
      metric.lastUpdated = new Date().toISOString();

      if (metric.threshold) {
        if (value > metric.threshold * 1.5) {
          metric.status = "critical";
        } else if (value > metric.threshold) {
          metric.status = "warning";
        } else {
          metric.status = "healthy";
        }
      }
    }
  }

  updateKPI(
    id: string,
    currentValue: number,
    targetValue?: number
  ): void {
    const kpi = this.kpis.get(id);
    if (kpi) {
      kpi.currentValue = currentValue;
      if (targetValue !== undefined) {
        kpi.targetValue = targetValue;
      }
      kpi.percentToTarget = (currentValue / kpi.targetValue) * 100;

      if (kpi.percentToTarget >= 95) {
        kpi.status = "on_track";
      } else if (kpi.percentToTarget >= 75) {
        kpi.status = "at_risk";
      } else {
        kpi.status = "off_track";
      }

      kpi.lastUpdated = new Date().toISOString();
    }
  }

  addAlert(alert: Omit<AlertItem, "id" | "timestamp" | "resolved">): void {
    this.alerts.push({
      id: `alert_${Date.now()}`,
      ...alert,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  addChartData(chart: ChartData): void {
    this.chartData.set(chart.id, chart);
  }

  getMetric(id: string): DashboardMetric | undefined {
    return this.metrics.get(id);
  }

  getKPI(id: string): DashboardKPI | undefined {
    return this.kpis.get(id);
  }

  getAllMetrics(): DashboardMetric[] {
    return Array.from(this.metrics.values());
  }

  getAllKPIs(): DashboardKPI[] {
    return Array.from(this.kpis.values());
  }

  getChartData(id: string): ChartData | undefined {
    return this.chartData.get(id);
  }

  generateDashboardData(): DashboardData {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      kpis: this.getAllKPIs(),
      charts: Array.from(this.chartData.values()),
      alerts: this.alerts.filter((a) => !a.resolved).slice(0, 10),
    };
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter((a) => !a.resolved);
  }
}

export const globalDashboard = new AnalyticsDashboard();

// Sample chart data generator
export function generateSampleCharts(): ChartData[] {
  const now = Date.now();
  const data: ChartData[] = [];

  // Content creation trend
  data.push({
    id: "content_trend",
    type: "line",
    title: "Content Creation Trend (30 days)",
    xAxis: "Date",
    yAxis: "Items Created",
    data: Array.from({ length: 30 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.floor(30 + Math.random() * 40),
      timestamp: new Date(now - (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
    })),
  });

  // Performance distribution
  data.push({
    id: "response_time_dist",
    type: "bar",
    title: "Response Time Distribution",
    xAxis: "Response Time (ms)",
    yAxis: "Request Count",
    data: [
      { label: "0-50ms", value: 1240 },
      { label: "50-100ms", value: 580 },
      { label: "100-200ms", value: 210 },
      { label: "200-500ms", value: 45 },
      { label: "500ms+", value: 8 },
    ],
  });

  // Content status breakdown
  data.push({
    id: "content_status",
    type: "pie",
    title: "Content Status Breakdown",
    xAxis: "Status",
    yAxis: "Count",
    data: [
      { label: "Published", value: 312 },
      { label: "Draft", value: 145 },
      { label: "Scheduled", value: 62 },
      { label: "Archived", value: 89 },
    ],
  });

  // Error rate trend
  data.push({
    id: "error_rate_trend",
    type: "area",
    title: "Error Rate Trend (7 days)",
    xAxis: "Date",
    yAxis: "Error Rate (%)",
    data: Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      value: Math.max(0, 0.5 - Math.random() * 0.3),
      timestamp: new Date(now - (7 - i) * 24 * 60 * 60 * 1000).toISOString(),
    })),
  });

  return data;
}
