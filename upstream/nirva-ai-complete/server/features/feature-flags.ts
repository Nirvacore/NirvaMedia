/**
 * NMD Feature Flags System
 * Centralized feature management for gradual rollouts and A/B testing
 */

export type FeatureFlag = 'feature' | 'experiment' | 'config';

export interface Feature {
  id: string;
  name: string;
  description: string;
  type: FeatureFlag;
  enabled: boolean;
  rolloutPercentage: number;
  targetUserIds?: string[];
  targetOrganizationIds?: string[];
  targetRegions?: string[];
  startDate?: Date;
  endDate?: Date;
  config?: Record<string, unknown>;
}

export interface FeatureFlagContext {
  userId: string;
  organizationId: string;
  region?: string;
  userHash?: string;
  customAttributes?: Record<string, unknown>;
}

export class FeatureFlagManager {
  private features: Map<string, Feature> = new Map();
  private overrides: Map<string, Map<string, boolean>> = new Map();

  registerFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
  }

  isEnabled(featureId: string, context: FeatureFlagContext): boolean {
    // Check overrides first
    const override = this.getOverride(featureId, context.userId);
    if (override !== undefined) {
      return override;
    }

    const feature = this.features.get(featureId);
    if (!feature) {
      return false;
    }

    // Check if feature is enabled globally
    if (!feature.enabled) {
      return false;
    }

    // Check date range
    const now = new Date();
    if (feature.startDate && now < feature.startDate) {
      return false;
    }
    if (feature.endDate && now > feature.endDate) {
      return false;
    }

    // Check target users
    if (feature.targetUserIds && !feature.targetUserIds.includes(context.userId)) {
      return false;
    }

    // Check target organizations
    if (feature.targetOrganizationIds && !feature.targetOrganizationIds.includes(context.organizationId)) {
      return false;
    }

    // Check target regions
    if (feature.targetRegions && context.region && !feature.targetRegions.includes(context.region)) {
      return false;
    }

    // Check rollout percentage
    if (feature.rolloutPercentage < 100) {
      return this.isInRollout(featureId, context);
    }

    return true;
  }

  private isInRollout(featureId: string, context: FeatureFlagContext): boolean {
    const hash = context.userHash || this.hashUser(context.userId, featureId);
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const percentile = (hashValue % 100) + 1;
    
    const feature = this.features.get(featureId);
    return percentile <= (feature?.rolloutPercentage || 0);
  }

  private hashUser(userId: string, featureId: string): string {
    const combined = `${featureId}:${userId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  setOverride(featureId: string, userId: string, enabled: boolean): void {
    if (!this.overrides.has(featureId)) {
      this.overrides.set(featureId, new Map());
    }
    this.overrides.get(featureId)!.set(userId, enabled);
  }

  clearOverride(featureId: string, userId: string): void {
    const userOverrides = this.overrides.get(featureId);
    if (userOverrides) {
      userOverrides.delete(userId);
    }
  }

  private getOverride(featureId: string, userId: string): boolean | undefined {
    return this.overrides.get(featureId)?.get(userId);
  }

  getMetrics(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};
    
    for (const [id, feature] of this.features) {
      metrics[id] = {
        enabled: feature.enabled,
        rolloutPercentage: feature.rolloutPercentage,
        type: feature.type,
        targetsCount: {
          users: feature.targetUserIds?.length || 0,
          organizations: feature.targetOrganizationIds?.length || 0,
          regions: feature.targetRegions?.length || 0,
        },
      };
    }
    
    return metrics;
  }
}

// Global instance
export const featureFlagManager = new FeatureFlagManager();

// Pre-registered features
export const FEATURES = {
  // AI Features
  AI_CONTENT_GENERATION: 'ai_content_generation',
  AI_CONTENT_OPTIMIZATION: 'ai_content_optimization',
  AI_TITLE_SUGGESTIONS: 'ai_title_suggestions',

  // Advanced Features
  ADVANCED_SEARCH: 'advanced_search',
  FULL_TEXT_SEARCH: 'full_text_search',
  FACETED_SEARCH: 'faceted_search',

  // Analytics
  REAL_TIME_DASHBOARDS: 'real_time_dashboards',
  TREND_ANALYSIS: 'trend_analysis',
  ANOMALY_DETECTION: 'anomaly_detection',
  ROI_TRACKING: 'roi_tracking',

  // Collaboration
  REAL_TIME_COLLABORATION: 'real_time_collaboration',
  APPROVAL_WORKFLOWS: 'approval_workflows',
  COMMENTS_AND_FEEDBACK: 'comments_and_feedback',

  // Publishing
  SCHEDULED_PUBLISHING: 'scheduled_publishing',
  BULK_PUBLISHING: 'bulk_publishing',
  CONDITIONAL_PUBLISHING: 'conditional_publishing',

  // Testing
  A_B_TESTING: 'a_b_testing',
  MULTIVARIATE_TESTING: 'multivariate_testing',

  // Content
  CONTENT_VERSIONING: 'content_versioning',
  CONTENT_TEMPLATES: 'content_templates',
  CONTENT_LIBRARY: 'content_library',

  // Performance
  PERFORMANCE_MONITORING: 'performance_monitoring',
  ADVANCED_CACHING: 'advanced_caching',
  QUERY_OPTIMIZATION: 'query_optimization',

  // Infrastructure
  GRAPHQL_API: 'graphql_api',
  WEBHOOK_SYSTEM: 'webhook_system',
  MULTI_REGION_SUPPORT: 'multi_region_support',
} as const;

// Register default features
export function initializeFeatures(): void {
  Object.values(FEATURES).forEach((featureId) => {
    featureFlagManager.registerFeature({
      id: featureId,
      name: featureId.replace(/_/g, ' ').toUpperCase(),
      description: `Feature: ${featureId}`,
      type: 'feature',
      enabled: true,
      rolloutPercentage: 100,
    });
  });
}

// Utility function to check feature
export function isFeatureEnabled(
  featureId: string,
  context: FeatureFlagContext
): boolean {
  return featureFlagManager.isEnabled(featureId, context);
}

// Utility function for experiments
export interface Experiment {
  id: string;
  featureId: string;
  variants: Map<string, { weight: number; config?: Record<string, unknown> }>;
}

export class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();

  registerExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  getVariant(
    experimentId: string,
    context: FeatureFlagContext
  ): { variant: string; config?: Record<string, unknown> } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { variant: 'control' };
    }

    const hash = this.hashUser(context.userId, experimentId);
    const hashValue = parseInt(hash.substring(0, 8), 16);
    let bucket = hashValue % 100;

    let accumulated = 0;
    for (const [variant, config] of experiment.variants) {
      accumulated += config.weight;
      if (bucket < accumulated) {
        return { variant, config: config.config };
      }
    }

    return { variant: 'control' };
  }

  private hashUser(userId: string, experimentId: string): string {
    const combined = `${experimentId}:${userId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export const experimentManager = new ExperimentManager();
