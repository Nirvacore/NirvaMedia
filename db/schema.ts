import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
