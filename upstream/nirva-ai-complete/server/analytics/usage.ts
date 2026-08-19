/**
 * NMD Usage Analytics
 * Track user activity, feature adoption, and engagement metrics
 */

export interface UsageEvent {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  duration?: number; // milliseconds
  metadata?: Record<string, unknown>;
}

export interface UserActivity {
  userId: string;
  organizationId: string;
  eventsCount: number;
  activeMinutes: number;
  lastActive: string;
  features: FeatureUsage[];
  sessionCount: number;
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  averageTimeSpent: number;
  adoptionRate: number;
}

export interface UsageReport {
  timestamp: string;
  period: "daily" | "weekly" | "monthly";
  totalEvents: number;
  activeUsers: number;
  activeOrganizations: number;
  features: FeatureUsage[];
  topFeatures: FeatureUsage[];
  userActivity: UserActivity[];
}

const eventLog: UsageEvent[] = [];
const userActivityMap: Map<string, UserActivity> = new Map();
const featureUsage: Map<string, FeatureUsage> = new Map();

export function trackUsageEvent(event: Omit<UsageEvent, "id" | "timestamp">): void {
  const usageEvent: UsageEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  eventLog.push(usageEvent);

  // Update user activity
  const userKey = `${event.organizationId}:${event.userId}`;
  let activity = userActivityMap.get(userKey);

  if (!activity) {
    activity = {
      userId: event.userId,
      organizationId: event.organizationId,
      eventsCount: 0,
      activeMinutes: 0,
      lastActive: new Date().toISOString(),
      features: [],
      sessionCount: 1,
    };
    userActivityMap.set(userKey, activity);
  }

  activity.eventsCount++;
  activity.lastActive = new Date().toISOString();

  // Track feature usage
  let featureUse = featureUsage.get(event.action);
  if (!featureUse) {
    featureUse = {
      feature: event.action,
      usageCount: 0,
      uniqueUsers: 0,
      averageTimeSpent: 0,
      adoptionRate: 0,
    };
    featureUsage.set(event.action, featureUse);
  }

  featureUse.usageCount++;
  if (event.duration) {
    featureUse.averageTimeSpent =
      (featureUse.averageTimeSpent * (featureUse.usageCount - 1) + event.duration) /
      featureUse.usageCount;
  }
}

export function generateUsageReport(period: "daily" | "weekly" | "monthly" = "daily"): UsageReport {
  const uniqueUsers = new Set<string>();
  const uniqueOrganizations = new Set<string>();
  const features: FeatureUsage[] = Array.from(featureUsage.values());

  for (const event of eventLog) {
    uniqueUsers.add(`${event.organizationId}:${event.userId}`);
    uniqueOrganizations.add(event.organizationId);
  }

  // Calculate adoption rate (percentage of active users using the feature)
  const activeUserCount = uniqueUsers.size;
  for (const feature of features) {
    feature.adoptionRate = (feature.uniqueUsers / activeUserCount) * 100;
  }

  const topFeatures = [...features]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  return {
    timestamp: new Date().toISOString(),
    period,
    totalEvents: eventLog.length,
    activeUsers: uniqueUsers.size,
    activeOrganizations: uniqueOrganizations.size,
    features,
    topFeatures,
    userActivity: Array.from(userActivityMap.values()),
  };
}

export function getUserActivity(userId: string, organizationId: string): UserActivity | null {
  const key = `${organizationId}:${userId}`;
  return userActivityMap.get(key) || null;
}

export function getFeatureUsage(feature: string): FeatureUsage | null {
  return featureUsage.get(feature) || null;
}

export function getActiveUsersCount(): number {
  return userActivityMap.size;
}

export function calculateEngagementScore(userId: string, organizationId: string): number {
  const activity = getUserActivity(userId, organizationId);
  if (!activity) return 0;

  const eventScore = Math.min(activity.eventsCount / 100, 1);
  const sessionScore = Math.min(activity.sessionCount / 10, 1);
  const recencyScore = calculateRecencyScore(new Date(activity.lastActive));

  return (eventScore * 0.4 + sessionScore * 0.3 + recencyScore * 0.3) * 100;
}

function calculateRecencyScore(lastActive: Date): number {
  const now = Date.now();
  const lastActiveTime = lastActive.getTime();
  const daysSinceActive = (now - lastActiveTime) / (24 * 60 * 60 * 1000);

  if (daysSinceActive <= 1) return 1;
  if (daysSinceActive <= 7) return 0.8;
  if (daysSinceActive <= 30) return 0.5;
  return 0;
}

export function generateUsageReportText(report: UsageReport): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD USAGE ANALYTICS REPORT");
  lines.push("═".repeat(80));
  lines.push(`Report Period: ${report.period.toUpperCase()}`);
  lines.push(`Generated: ${report.timestamp}`);
  lines.push("");

  lines.push("USAGE SUMMARY");
  lines.push("─".repeat(80));
  lines.push(`Total Events: ${report.totalEvents}`);
  lines.push(`Active Users: ${report.activeUsers}`);
  lines.push(`Active Organizations: ${report.activeOrganizations}`);
  lines.push(`Average Events per User: ${(report.totalEvents / report.activeUsers).toFixed(1)}`);
  lines.push("");

  if (report.topFeatures.length > 0) {
    lines.push("TOP FEATURES");
    lines.push("─".repeat(80));

    for (let i = 0; i < Math.min(5, report.topFeatures.length); i++) {
      const feature = report.topFeatures[i];
      lines.push(`${i + 1}. ${feature.feature}`);
      lines.push(`   Usage Count: ${feature.usageCount}`);
      lines.push(`   Adoption Rate: ${feature.adoptionRate.toFixed(1)}%`);
      lines.push(`   Avg Time: ${feature.averageTimeSpent.toFixed(0)}ms`);
    }
    lines.push("");
  }

  if (report.userActivity.length > 0) {
    lines.push("MOST ACTIVE USERS");
    lines.push("─".repeat(80));

    const topUsers = report.userActivity
      .sort((a, b) => b.eventsCount - a.eventsCount)
      .slice(0, 5);

    for (const user of topUsers) {
      lines.push(
        `User ${user.userId}: ${user.eventsCount} events, ${user.sessionCount} sessions`
      );
    }
  }

  lines.push("\n" + "═".repeat(80));

  return lines.join("\n");
}
