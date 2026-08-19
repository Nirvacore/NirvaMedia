import {
  FeatureFlagManager,
  ExperimentManager,
  FEATURES,
  initializeFeatures,
} from '../features/feature-flags';

describe('Feature Flags', () => {
  let manager: FeatureFlagManager;

  beforeEach(() => {
    manager = new FeatureFlagManager();
    initializeFeatures();
  });

  describe('Feature Registration', () => {
    it('should register a feature', () => {
      manager.registerFeature({
        id: 'test_feature',
        name: 'Test Feature',
        description: 'A test feature',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 100,
      });

      const feature = manager.getFeature('test_feature');
      expect(feature).toBeDefined();
      expect(feature?.name).toBe('Test Feature');
    });
  });

  describe('Feature Enablement', () => {
    beforeEach(() => {
      manager.registerFeature({
        id: 'test_feature',
        name: 'Test Feature',
        description: 'A test feature',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 100,
      });
    });

    it('should enable feature for eligible users', () => {
      const enabled = manager.isEnabled('test_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(enabled).toBe(true);
    });

    it('should disable feature when disabled globally', () => {
      manager.registerFeature({
        id: 'disabled_feature',
        name: 'Disabled Feature',
        description: 'A disabled feature',
        type: 'feature',
        enabled: false,
        rolloutPercentage: 100,
      });

      const enabled = manager.isEnabled('disabled_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(enabled).toBe(false);
    });

    it('should respect target user restrictions', () => {
      manager.registerFeature({
        id: 'targeted_feature',
        name: 'Targeted Feature',
        description: 'Feature for specific users',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 100,
        targetUserIds: ['user_123', 'user_456'],
      });

      const enabledForTarget = manager.isEnabled('targeted_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      const enabledForNonTarget = manager.isEnabled('targeted_feature', {
        userId: 'user_789',
        organizationId: 'org_456',
      });

      expect(enabledForTarget).toBe(true);
      expect(enabledForNonTarget).toBe(false);
    });

    it('should respect target organization restrictions', () => {
      manager.registerFeature({
        id: 'org_feature',
        name: 'Org Feature',
        description: 'Feature for specific organizations',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 100,
        targetOrganizationIds: ['org_456'],
      });

      const enabledForTarget = manager.isEnabled('org_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      const enabledForNonTarget = manager.isEnabled('org_feature', {
        userId: 'user_123',
        organizationId: 'org_789',
      });

      expect(enabledForTarget).toBe(true);
      expect(enabledForNonTarget).toBe(false);
    });

    it('should respect rollout percentages', () => {
      manager.registerFeature({
        id: 'rollout_feature',
        name: 'Rollout Feature',
        description: 'Feature with gradual rollout',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 50,
      });

      // Test with different users to check rollout distribution
      const results = [];
      for (let i = 0; i < 100; i++) {
        const enabled = manager.isEnabled('rollout_feature', {
          userId: `user_${i}`,
          organizationId: 'org_456',
        });
        results.push(enabled ? 1 : 0);
      }

      const enabledCount = results.reduce((a, b) => a + b, 0);
      expect(enabledCount).toBeCloseTo(50, 15); // Allow 15% variance
    });

    it('should respect date range restrictions', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      manager.registerFeature({
        id: 'future_feature',
        name: 'Future Feature',
        description: 'Feature available in the future',
        type: 'feature',
        enabled: true,
        rolloutPercentage: 100,
        startDate: tomorrow,
      });

      const enabled = manager.isEnabled('future_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(enabled).toBe(false);
    });
  });

  describe('Feature Overrides', () => {
    it('should override feature flag for specific user', () => {
      manager.registerFeature({
        id: 'override_feature',
        name: 'Override Feature',
        description: 'Feature with overrides',
        type: 'feature',
        enabled: false,
        rolloutPercentage: 0,
      });

      manager.setOverride('override_feature', 'user_123', true);

      const enabled = manager.isEnabled('override_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(enabled).toBe(true);
    });

    it('should clear feature flag overrides', () => {
      manager.registerFeature({
        id: 'clearable_feature',
        name: 'Clearable Feature',
        description: 'Feature with clearable overrides',
        type: 'feature',
        enabled: false,
        rolloutPercentage: 0,
      });

      manager.setOverride('clearable_feature', 'user_123', true);
      manager.clearOverride('clearable_feature', 'user_123');

      const enabled = manager.isEnabled('clearable_feature', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(enabled).toBe(false);
    });
  });

  describe('Experiments', () => {
    it('should assign variants consistently', () => {
      const experimentManager = new ExperimentManager();

      experimentManager.registerExperiment({
        id: 'test_experiment',
        featureId: 'test_feature',
        variants: new Map([
          ['control', { weight: 50 }],
          ['variant_a', { weight: 50 }],
        ]),
      });

      const variant1 = experimentManager.getVariant('test_experiment', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      const variant2 = experimentManager.getVariant('test_experiment', {
        userId: 'user_123',
        organizationId: 'org_456',
      });

      expect(variant1.variant).toBe(variant2.variant);
    });

    it('should distribute users across variants', () => {
      const experimentManager = new ExperimentManager();

      experimentManager.registerExperiment({
        id: 'distribution_experiment',
        featureId: 'test_feature',
        variants: new Map([
          ['control', { weight: 50 }],
          ['variant_a', { weight: 50 }],
        ]),
      });

      const variants: Record<string, number> = {
        control: 0,
        variant_a: 0,
      };

      for (let i = 0; i < 100; i++) {
        const result = experimentManager.getVariant('distribution_experiment', {
          userId: `user_${i}`,
          organizationId: 'org_456',
        });
        variants[result.variant]++;
      }

      expect(variants.control).toBeCloseTo(50, 15);
      expect(variants.variant_a).toBeCloseTo(50, 15);
    });
  });

  describe('Pre-registered Features', () => {
    it('should have AI features', () => {
      expect(FEATURES.AI_CONTENT_GENERATION).toBeDefined();
      expect(FEATURES.AI_CONTENT_OPTIMIZATION).toBeDefined();
      expect(FEATURES.AI_TITLE_SUGGESTIONS).toBeDefined();
    });

    it('should have analytics features', () => {
      expect(FEATURES.REAL_TIME_DASHBOARDS).toBeDefined();
      expect(FEATURES.TREND_ANALYSIS).toBeDefined();
      expect(FEATURES.ANOMALY_DETECTION).toBeDefined();
    });

    it('should have publishing features', () => {
      expect(FEATURES.SCHEDULED_PUBLISHING).toBeDefined();
      expect(FEATURES.BULK_PUBLISHING).toBeDefined();
    });
  });
});
