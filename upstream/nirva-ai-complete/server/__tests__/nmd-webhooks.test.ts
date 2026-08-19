import { describe, it, expect, beforeAll } from "vitest";
import {
  subscribeToWebhook,
  unsubscribeWebhook,
  getWebhookSubscriptions,
  triggerWebhookEvent,
  getWebhookEvents,
  ensureWebhookSchema,
  type WebhookEvent,
} from "../media/webhooks.ts";
import { getDb } from "../db/index.ts";

describe("NMD Webhooks", () => {
  const orgId = "org_webhooks";
  const userId = "user_webhook";

  beforeAll(() => {
    const db = getDb();
    db.exec("DROP TABLE IF EXISTS nmd_webhook_subscriptions");
    db.exec("DROP TABLE IF EXISTS nmd_webhook_events");
    ensureWebhookSchema();
  });

  describe("Webhook subscriptions", () => {
    it("subscribes to webhook", () => {
      const subscription = subscribeToWebhook({
        organizationId: orgId,
        url: "https://example.com/webhooks/content",
        events: ["content.create", "content.publish"],
        actor: userId,
      });

      expect(subscription.url).toBe("https://example.com/webhooks/content");
      expect(subscription.events).toContain("content.create");
      expect(subscription.isActive).toBe(true);
    });

    it("lists active subscriptions", () => {
      subscribeToWebhook({
        organizationId: orgId,
        url: "https://api.example.com/hook1",
        events: ["*"],
        actor: userId,
      });

      const subscriptions = getWebhookSubscriptions(orgId);
      expect(subscriptions.length).toBeGreaterThan(0);
      expect(subscriptions.every((s) => s.isActive)).toBe(true);
    });

    it("unsubscribes from webhook", () => {
      const subscription = subscribeToWebhook({
        organizationId: orgId,
        url: "https://webhook.example.com/remove",
        events: ["alert.triggered"],
        actor: userId,
      });

      const result = unsubscribeWebhook(subscription.id, userId);
      expect(result.success).toBe(true);

      const active = getWebhookSubscriptions(orgId);
      expect(active.find((s) => s.id === subscription.id)).toBeUndefined();
    });
  });

  describe("Webhook events", () => {
    it("triggers webhook event", async () => {
      const event: WebhookEvent = {
        id: `evt_test_${Date.now()}`,
        organizationId: orgId,
        eventType: "content.create",
        resourceType: "content",
        resourceId: "cnt_123",
        payload: {
          title: "Test Post",
          author: "alice",
        },
        timestamp: new Date().toISOString(),
      };

      const result = await triggerWebhookEvent(orgId, event, userId);
      expect(result.success).toBe(true);
      expect(typeof result.delivered).toBe("number");
    });

    it("retrieves webhook events", async () => {
      const event: WebhookEvent = {
        id: `evt_retrieve_${Date.now()}`,
        organizationId: orgId,
        eventType: "content.publish",
        resourceType: "content",
        resourceId: "cnt_456",
        payload: {
          platforms: ["twitter", "instagram"],
        },
        timestamp: new Date().toISOString(),
      };

      await triggerWebhookEvent(orgId, event, userId);
      const events = getWebhookEvents(orgId);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].eventType).toBeDefined();
    });

    it("supports wildcard subscriptions", async () => {
      const wildcard = subscribeToWebhook({
        organizationId: "org_wildcard",
        url: "https://wildcard.example.com/all",
        events: ["*"],
        actor: userId,
      });

      expect(wildcard.events).toContain("*");

      const event: WebhookEvent = {
        id: `evt_wildcard_${Date.now()}`,
        organizationId: "org_wildcard",
        eventType: "any.event",
        resourceType: "resource",
        resourceId: "res_999",
        payload: {},
        timestamp: new Date().toISOString(),
      };

      const result = await triggerWebhookEvent("org_wildcard", event, userId);
      expect(result.success).toBe(true);
    });
  });

  describe("Event filtering", () => {
    it("filters events by type", async () => {
      const orgSpecific = "org_filter_test";

      // Subscribe to specific event types
      subscribeToWebhook({
        organizationId: orgSpecific,
        url: "https://filter1.example.com",
        events: ["content.create"],
        actor: userId,
      });

      subscribeToWebhook({
        organizationId: orgSpecific,
        url: "https://filter2.example.com",
        events: ["content.publish"],
        actor: userId,
      });

      // Trigger an event
      await triggerWebhookEvent(
        orgSpecific,
        {
          id: `evt_filter_${Date.now()}`,
          organizationId: orgSpecific,
          eventType: "content.create",
          resourceType: "content",
          resourceId: "cnt_filter",
          payload: {},
          timestamp: new Date().toISOString(),
        },
        userId
      );

      const events = getWebhookEvents(orgSpecific);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("Database schema", () => {
    it("creates webhook tables", () => {
      const db = ensureWebhookSchema();
      const subscriptionCols = db.prepare("PRAGMA table_info(nmd_webhook_subscriptions)").all() as any[];
      const eventCols = db.prepare("PRAGMA table_info(nmd_webhook_events)").all() as any[];

      expect(subscriptionCols.map((c) => c.name)).toContain("url");
      expect(subscriptionCols.map((c) => c.name)).toContain("events");
      expect(eventCols.map((c) => c.name)).toContain("event_type");
      expect(eventCols.map((c) => c.name)).toContain("payload");
    });
  });
});
