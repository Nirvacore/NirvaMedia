import {
  BUILTIN_PLUGINS,
  getPluginDefinition,
  type PluginType,
} from "../../shared/plugins.ts";
import { PLAN_LIMITS, type TenantPlan } from "../../shared/tenants.ts";
import { getDb } from "../db/index.ts";
import { createTask } from "../db/index.ts";
import { getTenant } from "../tenants/index.ts";

interface DbPluginRow {
  id: string;
  tenant_id: string;
  plugin_key: string;
  name: string;
  type: string;
  config_json: string;
  agents_json: string;
  enabled: number;
  installed_at: string;
  updated_at: string;
}

function rowToPlugin(row: DbPluginRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    pluginKey: row.plugin_key,
    name: row.name,
    type: row.type as PluginType,
    config: JSON.parse(row.config_json) as Record<string, unknown>,
    agents: JSON.parse(row.agents_json) as string[],
    enabled: row.enabled === 1,
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

export function seedPluginsForTenant(tenantId: string) {
  const count = getDb().prepare(
    "SELECT COUNT(*) as c FROM agent_plugins WHERE tenant_id = ?"
  ).get(tenantId) as { c: number };
  if (count.c > 0) return;

  const tenant = getTenant(tenantId);
  const plan = (tenant?.plan ?? "free") as TenantPlan;
  const maxPlugins = PLAN_LIMITS[plan].plugins;
  const toInstall = BUILTIN_PLUGINS.slice(0, Math.min(maxPlugins, BUILTIN_PLUGINS.length));

  const insert = getDb().prepare(`
    INSERT INTO agent_plugins
      (id, tenant_id, plugin_key, name, type, config_json, agents_json, enabled, installed_at, updated_at)
    VALUES
      (@id, @tenant_id, @plugin_key, @name, @type, @config_json, @agents_json, @enabled, @installed_at, @updated_at)
  `);

  const now = new Date().toISOString();
  const seed = getDb().transaction(() => {
    for (const def of toInstall) {
      const id = `plugin_${tenantId}_${def.key}`;
      insert.run({
        id,
        tenant_id: tenantId,
        plugin_key: def.key,
        name: def.name,
        type: def.type,
        config_json: JSON.stringify(def.defaultConfig),
        agents_json: JSON.stringify(def.compatibleAgents ?? []),
        enabled: def.key === "task-creator" || def.key === "memory-writer" ? 1 : 0,
        installed_at: now,
        updated_at: now,
      });
    }
  });
  seed();
}

export function listPlugins(tenantId: string) {
  seedPluginsForTenant(tenantId);
  const rows = getDb().prepare(
    "SELECT * FROM agent_plugins WHERE tenant_id = ? ORDER BY name"
  ).all(tenantId) as DbPluginRow[];
  const installed = rows.map(rowToPlugin);
  const installedKeys = new Set(installed.map((p) => p.pluginKey));
  const catalog = BUILTIN_PLUGINS.filter((p) => !installedKeys.has(p.key));
  return { installed, catalog, builtin: BUILTIN_PLUGINS };
}

export function getPlugin(id: string) {
  const row = getDb().prepare("SELECT * FROM agent_plugins WHERE id = ?").get(id) as DbPluginRow | undefined;
  return row ? rowToPlugin(row) : null;
}

export function installPlugin(tenantId: string, pluginKey: string, agents?: string[]) {
  const def = getPluginDefinition(pluginKey);
  if (!def) return null;

  const tenant = getTenant(tenantId);
  if (!tenant) return null;

  const { installed } = listPlugins(tenantId);
  if (installed.length >= PLAN_LIMITS[tenant.plan].plugins) {
    return null;
  }

  const existing = getDb().prepare(
    "SELECT id FROM agent_plugins WHERE tenant_id = ? AND plugin_key = ?"
  ).get(tenantId, pluginKey);
  if (existing) return getPlugin((existing as { id: string }).id);

  const id = `plugin_${tenantId}_${pluginKey}_${Date.now()}`;
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO agent_plugins
      (id, tenant_id, plugin_key, name, type, config_json, agents_json, enabled, installed_at, updated_at)
    VALUES (@id, @tenant_id, @plugin_key, @name, @type, @config_json, @agents_json, 1, @installed_at, @updated_at)
  `).run({
    id,
    tenant_id: tenantId,
    plugin_key: pluginKey,
    name: def.name,
    type: def.type,
    config_json: JSON.stringify(def.defaultConfig),
    agents_json: JSON.stringify(agents ?? def.compatibleAgents ?? []),
    installed_at: now,
    updated_at: now,
  });
  return getPlugin(id);
}

export function updatePlugin(id: string, updates: { enabled?: boolean; config?: Record<string, unknown>; agents?: string[] }) {
  const plugin = getPlugin(id);
  if (!plugin) return null;

  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (updates.enabled !== undefined) {
    fields.push("enabled = @enabled");
    values.enabled = updates.enabled ? 1 : 0;
  }
  if (updates.config !== undefined) {
    fields.push("config_json = @config_json");
    values.config_json = JSON.stringify(updates.config);
  }
  if (updates.agents !== undefined) {
    fields.push("agents_json = @agents_json");
    values.agents_json = JSON.stringify(updates.agents);
  }

  if (fields.length === 0) return plugin;

  fields.push("updated_at = @updated_at");
  values.updated_at = new Date().toISOString();
  getDb().prepare(`UPDATE agent_plugins SET ${fields.join(", ")} WHERE id = @id`).run(values);
  return getPlugin(id);
}

export interface PluginInvokeResult {
  success: boolean;
  pluginId: string;
  type: PluginType;
  output: unknown;
  message: string;
}

export async function invokePlugin(
  id: string,
  payload: { agent?: string; data?: Record<string, unknown>; tenantId?: string }
): Promise<PluginInvokeResult | null> {
  const plugin = getPlugin(id);
  if (!plugin || !plugin.enabled) return null;

  const agent = payload.agent?.toUpperCase() ?? "DESK";
  if (plugin.agents.length > 0 && !plugin.agents.includes(agent)) {
    return {
      success: false,
      pluginId: id,
      type: plugin.type,
      output: null,
      message: `Plugin not assigned to agent ${agent}`,
    };
  }

  switch (plugin.type) {
    case "webhook": {
      const url = plugin.config.url as string;
      if (!url) {
        return { success: true, pluginId: id, type: plugin.type, output: { simulated: true }, message: "Webhook simulated (no URL configured)" };
      }
      try {
        const res = await fetch(url, {
          method: (plugin.config.method as string) || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent, ...payload.data }),
          signal: AbortSignal.timeout(10_000),
        });
        return { success: res.ok, pluginId: id, type: plugin.type, output: { status: res.status }, message: `Webhook ${res.status}` };
      } catch (err) {
        return { success: false, pluginId: id, type: plugin.type, output: null, message: err instanceof Error ? err.message : "Webhook failed" };
      }
    }
    case "http": {
      const url = plugin.config.url as string;
      if (!url) {
        return { success: true, pluginId: id, type: plugin.type, output: { simulated: true, data: payload.data }, message: "HTTP fetch simulated" };
      }
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        const text = await res.text();
        return { success: res.ok, pluginId: id, type: plugin.type, output: { status: res.status, body: text.slice(0, 500) }, message: "HTTP fetch complete" };
      } catch (err) {
        return { success: false, pluginId: id, type: plugin.type, output: null, message: err instanceof Error ? err.message : "HTTP failed" };
      }
    }
    case "task": {
      const taskAgent = (plugin.config.defaultAgent as string) || agent;
      const task = createTask({
        title: `Plugin task: ${plugin.name}`,
        agent: taskAgent,
        description: JSON.stringify(payload.data ?? {}).slice(0, 200),
        tenantId: payload.tenantId ?? plugin.tenantId,
      });
      return { success: true, pluginId: id, type: plugin.type, output: task, message: `Task created: ${task.id}` };
    }
    case "memory":
      return {
        success: true,
        pluginId: id,
        type: plugin.type,
        output: { stored: true, agent, source: plugin.config.source },
        message: "Memory write queued (use /api/memory for persistence)",
      };
    case "notify":
      return {
        success: true,
        pluginId: id,
        type: plugin.type,
        output: { channel: plugin.config.channel, simulated: !(plugin.config.webhookUrl as string) },
        message: `Notification sent to ${plugin.config.channel} (simulated)`,
      };
    default:
      return { success: false, pluginId: id, type: plugin.type, output: null, message: "Unknown plugin type" };
  }
}

export function getPluginsForAgent(tenantId: string, agentName: string) {
  const { installed } = listPlugins(tenantId);
  return installed.filter(
    (p) => p.enabled && (p.agents.length === 0 || p.agents.includes(agentName.toUpperCase()))
  );
}
