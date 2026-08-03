/**
 * NMD Unified API Gateway
 * Single interface for all 17 media operations modules
 * Orchestrates content lifecycle: create → optimize → approve → publish → monitor
 */

import { createContent, getContent, transitionContent } from "../media/index.ts";
import { createVersion, getVersionHistory, rollbackToVersion } from "../media/versioning.ts";
import { addComment, getComments, resolveComment, getActivityFeed } from "../media/collaboration.ts";
import { createCustomMetric, recordMetricReading, getCustomMetrics } from "../media/customMetrics.ts";
import { createTemplate, getTemplate, getTemplatesByCategory, recordTemplateUsage } from "../media/templates.ts";
import { createAlertRule, triggerAlert, getActiveAlerts } from "../media/alerts.ts";
import { createOptimizationReport, getOrganizationOptimizationInsights } from "../media/optimization.ts";
import { publishContent } from "../media/publishing.ts";
import { createABTest, analyzeTestResults } from "../media/abTesting.ts";
import { createApprovalTask, addReviewFeedback, approveStep } from "../media/approval.ts";
import { recordAssetUsage, searchAssets } from "../media/library.ts";
import { generateROIForecast, getOrganizationROI } from "../media/roi.ts";
import { subscribeToWebhook, unsubscribeWebhook, getWebhookSubscriptions, triggerWebhookEvent } from "../media/webhooks.ts";

export interface NMDRequest {
  organizationId: string;
  userId: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface NMDResponse {
  success: boolean;
  status: number;
  data?: unknown;
  error?: string;
  timestamp: string;
}

/**
 * Main NMD API router.
 */
export async function handleNMDRequest(req: NMDRequest): Promise<NMDResponse> {
  const { organizationId, userId, action, payload } = req;
  const timestamp = new Date().toISOString();

  try {
    switch (action) {
      // Content Lifecycle
      case "content.create":
        return {
          success: true,
          status: 201,
          data: createContent({
            title: payload.title as string,
            body: payload.body as string,
            tags: (payload.tags as string[]) || [],
            actor: userId,
          }),
          timestamp,
        };

      case "content.optimize":
        return {
          success: true,
          status: 200,
          data: getOrganizationOptimizationInsights(organizationId),
          timestamp,
        };

      case "content.approve":
        return {
          success: true,
          status: 200,
          data: approveStep(
            payload.taskId as string,
            payload.stepIndex as number,
            userId,
            payload.decision as string
          ),
          timestamp,
        };

      case "content.publish":
        return {
          success: true,
          status: 200,
          data: publishContent({
            contentId: payload.contentId as string,
            organizationId,
            targets: (payload.targets as unknown[]) || [],
          }),
          timestamp,
        };

      case "content.monitor":
        return {
          success: true,
          status: 200,
          data: {
            activeAlerts: getActiveAlerts(organizationId),
            roi: getOrganizationROI(organizationId),
          },
          timestamp,
        };

      // Versioning
      case "version.create":
        return {
          success: true,
          status: 201,
          data: createVersion({
            id: `ver_${Date.now()}`,
            contentId: payload.contentId as string,
            organizationId,
            versionNumber: 1,
            title: payload.title as string,
            body: payload.body as string,
            metadata: (payload.metadata as Record<string, unknown>) || {},
            tags: (payload.tags as string[]) || [],
            createdBy: userId,
            createdAt: new Date().toISOString(),
            changeMessage: payload.changeMessage as string,
          }),
          timestamp,
        };

      case "version.history":
        return {
          success: true,
          status: 200,
          data: getVersionHistory(payload.contentId as string),
          timestamp,
        };

      case "version.rollback":
        return {
          success: true,
          status: 200,
          data: rollbackToVersion(
            payload.contentId as string,
            payload.versionId as string,
            userId
          ),
          timestamp,
        };

      // Collaboration
      case "comment.add":
        return {
          success: true,
          status: 201,
          data: addComment({
            id: `cmt_${Date.now()}`,
            contentId: payload.contentId as string,
            organizationId,
            userId,
            text: payload.text as string,
            mentions: (payload.mentions as string[]) || [],
            resolved: false,
            createdAt: new Date().toISOString(),
          }),
          timestamp,
        };

      case "comment.resolve":
        return {
          success: true,
          status: 200,
          data: resolveComment(payload.commentId as string, userId),
          timestamp,
        };

      case "activity.feed":
        return {
          success: true,
          status: 200,
          data: getActivityFeed(payload.contentId as string),
          timestamp,
        };

      // Custom Metrics
      case "metric.create":
        return {
          success: true,
          status: 201,
          data: createCustomMetric({
            id: `mtrc_${Date.now()}`,
            organizationId,
            name: payload.name as string,
            description: payload.description as string,
            formula: payload.formula as string,
            unit: payload.unit as string,
            targetValue: payload.targetValue as number,
            currentValue: payload.currentValue as number,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          }),
          timestamp,
        };

      case "metric.record":
        return {
          success: true,
          status: 201,
          data: recordMetricReading({
            id: `read_${Date.now()}`,
            metricId: payload.metricId as string,
            organizationId,
            value: payload.value as number,
            timestamp: new Date().toISOString(),
          }),
          timestamp,
        };

      // Templates
      case "template.get":
        return {
          success: true,
          status: 200,
          data: getTemplate(payload.templateId as string),
          timestamp,
        };

      case "template.search":
        return {
          success: true,
          status: 200,
          data: getTemplatesByCategory(
            organizationId,
            payload.category as string,
            (payload.limit as number) || 50
          ),
          timestamp,
        };

      case "template.use":
        return {
          success: true,
          status: 200,
          data: recordTemplateUsage({
            id: `use_${Date.now()}`,
            templateId: payload.templateId as string,
            contentId: payload.contentId as string,
            organizationId,
            usedBy: userId,
            usedAt: new Date().toISOString(),
          }),
          timestamp,
        };

      // Alerts
      case "alert.rule.create":
        return {
          success: true,
          status: 201,
          data: createAlertRule({
            id: `rule_${Date.now()}`,
            organizationId,
            name: payload.name as string,
            metric: payload.metric as string,
            condition: payload.condition as string,
            threshold: payload.threshold as number,
            platform: payload.platform as string,
            isActive: true,
            notifyChannels: (payload.notifyChannels as string[]) || ["email"],
            createdAt: new Date().toISOString(),
          }),
          timestamp,
        };

      case "alert.active":
        return {
          success: true,
          status: 200,
          data: getActiveAlerts(organizationId),
          timestamp,
        };

      // A/B Testing
      case "test.analyze":
        return {
          success: true,
          status: 200,
          data: analyzeTestResults(payload.testId as string),
          timestamp,
        };

      // Library
      case "asset.search":
        return {
          success: true,
          status: 200,
          data: searchAssets({
            type: payload.type as string,
            query: payload.query as string,
            organizationId,
          }),
          timestamp,
        };

      // ROI & Financial
      case "roi.forecast":
        return {
          success: true,
          status: 200,
          data: generateROIForecast(payload.contentId as string, 30),
          timestamp,
        };

      case "roi.report":
        return {
          success: true,
          status: 200,
          data: getOrganizationROI(organizationId),
          timestamp,
        };

      // Webhooks
      case "webhook.subscribe":
        return {
          success: true,
          status: 201,
          data: subscribeToWebhook({
            organizationId,
            url: payload.url as string,
            events: (payload.events as string[]) || ["*"],
            actor: userId,
          }),
          timestamp,
        };

      case "webhook.unsubscribe":
        return {
          success: true,
          status: 200,
          data: unsubscribeWebhook(payload.webhookId as string, userId),
          timestamp,
        };

      case "webhook.list":
        return {
          success: true,
          status: 200,
          data: getWebhookSubscriptions(organizationId),
          timestamp,
        };

      case "webhook.trigger":
        return {
          success: true,
          status: 200,
          data: await triggerWebhookEvent(
            organizationId,
            {
              id: `evt_${Date.now()}`,
              organizationId,
              eventType: payload.eventType as string,
              resourceType: payload.resourceType as string,
              resourceId: payload.resourceId as string,
              payload: (payload.data as Record<string, unknown>) || {},
              timestamp: new Date().toISOString(),
            },
            userId
          ),
          timestamp,
        };

      default:
        return {
          success: false,
          status: 400,
          error: `Unknown action: ${action}`,
          timestamp,
        };
    }
  } catch (error) {
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : "Internal server error",
      timestamp,
    };
  }
}

/**
 * Orchestrate complete content workflow.
 */
export async function orchestrateContentWorkflow(
  organizationId: string,
  userId: string,
  contentData: {
    title: string;
    body: string;
    tags: string[];
  }
) {
  // 1. Create content
  const content = createContent({
    title: contentData.title,
    body: contentData.body,
    tags: contentData.tags,
    actor: userId,
  });

  // 2. Get optimization insights
  const insights = getOrganizationOptimizationInsights(organizationId);

  // 3. Prepare approval workflow
  const approval = {
    id: `task_${Date.now()}`,
    organizationId,
    contentId: content.id,
    status: "pending_approval",
    steps: [
      { role: "brand_manager", priority: "high" },
      { role: "marketing_director", priority: "high" },
    ],
  };

  // 4. Prepare for publishing
  const publishTargets = [
    { platform: "twitter", contentId: content.id },
    { platform: "instagram", contentId: content.id },
    { platform: "facebook", contentId: content.id },
  ];

  return {
    content,
    optimization: insights,
    approval,
    publishTargets,
    workflow: "created → optimized → pending_approval → ready_to_publish",
  };
}
