import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export type ConnectorAccountStatus = "setup_required" | "connected" | "error";
export type PublishJobStatus = "queued" | "blocked_auth" | "published" | "failed";
export type TranslationMemorySource = "provider" | "manual";
export type TranslationMemoryStatus = "active" | "archived";

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    brief: text("brief").notNull(),
    language: text("language").notNull(),
    tone: text("tone").notNull(),
    channels: text("channels", { mode: "json" }).$type<string[]>().notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_campaigns_created_at").on(table.createdAt)],
);

export const campaignPosts = sqliteTable(
  "campaign_posts",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    format: text("format").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    scheduledAt: text("scheduled_at"),
    status: text("status").notNull().default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_campaign_posts_campaign_id").on(table.campaignId),
    index("idx_campaign_posts_status").on(table.status),
  ],
);

export const solutionConfigs = sqliteTable(
  "solution_configs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    bundleId: text("bundle_id"),
    moduleIds: text("module_ids", { mode: "json" }).$type<string[]>().notNull(),
    connectorIds: text("connector_ids", { mode: "json" }).$type<string[]>().notNull(),
    status: text("status").notNull().default("saved"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_solution_configs_created_at").on(table.createdAt)],
);

export const workspaceEntitlements = sqliteTable("workspace_entitlements", {
  workspaceId: text("workspace_id").primaryKey(),
  workspaceName: text("workspace_name").notNull(),
  solutionConfigId: text("solution_config_id").references(() => solutionConfigs.id, { onDelete: "set null" }),
  bundleId: text("bundle_id"),
  moduleIds: text("module_ids", { mode: "json" }).$type<string[]>().notNull(),
  connectorIds: text("connector_ids", { mode: "json" }).$type<string[]>().notNull(),
  status: text("status").notNull().default("active"),
  activatedAt: integer("activated_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const connectorAccounts = sqliteTable(
  "connector_accounts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    connectorId: text("connector_id").notNull(),
    accountName: text("account_name").notNull(),
    status: text("status").$type<ConnectorAccountStatus>().notNull().default("setup_required"),
    externalAccountId: text("external_account_id"),
    scopes: text("scopes", { mode: "json" }).$type<string[]>().notNull(),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_connector_accounts_workspace_connector").on(table.workspaceId, table.connectorId),
  ],
);

export const publishJobs = sqliteTable(
  "publish_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id"),
    connectorAccountId: text("connector_account_id").references(() => connectorAccounts.id, {
      onDelete: "set null",
    }),
    channel: text("channel").notNull(),
    status: text("status").$type<PublishJobStatus>().notNull().default("queued"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_publish_jobs_workspace_status").on(table.workspaceId, table.status),
    index("idx_publish_jobs_scheduled_at").on(table.scheduledAt),
  ],
);

export const connectorEvents = sqliteTable(
  "connector_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    connectorAccountId: text("connector_account_id").references(() => connectorAccounts.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_connector_events_workspace_created_at").on(table.workspaceId, table.createdAt),
  ],
);

export const translationMemories = sqliteTable(
  "translation_memories",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    sourceHash: text("source_hash").notNull(),
    sourceLanguage: text("source_language").notNull(),
    targetLanguage: text("target_language").notNull(),
    sourceText: text("source_text").notNull(),
    translatedText: text("translated_text").notNull(),
    source: text("source").$type<TranslationMemorySource>().notNull(),
    providerId: text("provider_id"),
    status: text("status").$type<TranslationMemoryStatus>().notNull().default("active"),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_translation_memories_workspace_hash").on(table.workspaceId, table.sourceHash),
    index("idx_translation_memories_workspace_updated_at").on(table.workspaceId, table.updatedAt),
  ],
);
