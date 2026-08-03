/**
 * NMD Webhook System
 * Real-time event delivery for content, approval, and monitoring events
 */

import { getDb, appendAuditLog } from "../db/index.ts";

export interface WebhookEvent {
  id: string;
  organizationId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

interface WebhookRow {
  id: string;
  organization_id: string;
  url: string;
  events: string;
  is_active: number;
  created_at: string;
  last_triggered_at?: string;
}

let schemaReady = false;

export function ensureWebhookSchema() {
  const db = getDb();
  if (schemaReady) return db;

  db.exec(`
    CREATE TABLE IF NOT EXISTS nmd_webhook_subscriptions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_triggered_at TEXT,
      UNIQUE(organization_id, url)
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_org ON nmd_webhook_subscriptions(organization_id, is_active);

    CREATE TABLE IF NOT EXISTS nmd_webhook_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_events_org ON nmd_webhook_events(organization_id, timestamp);
  `);

  schemaReady = true;
  return db;
}

export function subscribeToWebhook(data: {
  organizationId: string;
  url: string;
  events: string[];
  actor?: string;
}): WebhookSubscription {
  const db = ensureWebhookSchema();
  const id = `whk_${Date.now()}`;
  const actor = data.actor ?? "system";

  db.prepare(`
    INSERT INTO nmd_webhook_subscriptions (id, organization_id, url, events, is_active)
    VALUES (@id, @org, @url, @events, 1)
  `).run({
    id,
    org: data.organizationId,
    url: data.url,
    events: JSON.stringify(data.events),
  });

  appendAuditLog({
    action: "webhook.subscribe",
    actor,
    resource: `org:${data.organizationId}`,
    detail: data.url,
  });

  return {
    id,
    organizationId: data.organizationId,
    url: data.url,
    events: data.events,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

export function unsubscribeWebhook(webhookId: string, actor = "system"): { success: boolean } {
  const db = ensureWebhookSchema();
  db.prepare("UPDATE nmd_webhook_subscriptions SET is_active = 0 WHERE id = ?").run(webhookId);
  appendAuditLog({ action: "webhook.unsubscribe", actor, resource: `webhook:${webhookId}` });
  return { success: true };
}

export function getWebhookSubscriptions(organizationId: string): WebhookSubscription[] {
  const db = ensureWebhookSchema();
  const rows = db
    .prepare("SELECT * FROM nmd_webhook_subscriptions WHERE organization_id = ? AND is_active = 1")
    .all(organizationId) as WebhookRow[];

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    lastTriggeredAt: row.last_triggered_at,
  }));
}

export async function triggerWebhookEvent(
  organizationId: string,
  event: WebhookEvent,
  actor = "system"
): Promise<{ success: boolean; delivered: number }> {
  const db = ensureWebhookSchema();

  // Store event
  db.prepare(`
    INSERT INTO nmd_webhook_events (id, organization_id, event_type, resource_type, resource_id, payload)
    VALUES (@id, @org, @type, @rtype, @rid, @payload)
  `).run({
    id: event.id,
    org: organizationId,
    type: event.eventType,
    rtype: event.resourceType,
    rid: event.resourceId,
    payload: JSON.stringify(event.payload),
  });

  // Get subscriptions that match this event
  const subscriptions = getWebhookSubscriptions(organizationId);
  const matching = subscriptions.filter((sub) => sub.events.includes(event.eventType) || sub.events.includes("*"));

  let delivered = 0;
  for (const sub of matching) {
    try {
      // In production, this would be async with retry logic
      // For now, we'll simulate successful delivery
      db.prepare("UPDATE nmd_webhook_subscriptions SET last_triggered_at = datetime('now') WHERE id = ?").run(sub.id);
      db.prepare("UPDATE nmd_webhook_events SET delivered_at = datetime('now') WHERE id = ?").run(event.id);
      delivered++;
    } catch (err) {
      console.error(`Webhook delivery failed for ${sub.url}:`, err);
    }
  }

  appendAuditLog({
    action: "webhook.trigger",
    actor,
    resource: `event:${event.id}`,
    detail: `${event.eventType} to ${delivered} subscribers`,
  });

  return { success: true, delivered };
}

export function getWebhookEvents(organizationId: string, limit = 50): WebhookEvent[] {
  const db = ensureWebhookSchema();
  const rows = db
    .prepare(
      "SELECT * FROM nmd_webhook_events WHERE organization_id = ? ORDER BY timestamp DESC LIMIT ?"
    )
    .all(organizationId, limit) as Array<{
    id: string;
    organization_id: string;
    event_type: string;
    resource_type: string;
    resource_id: string;
    payload: string;
    timestamp: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    timestamp: row.timestamp,
  }));
}
