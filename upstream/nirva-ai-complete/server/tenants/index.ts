import {
  DEFAULT_TENANT_ID,
  SEED_TENANTS,
  PLAN_LIMITS,
  isAgentAllowedForTenant,
  type TenantPlan,
} from "../../shared/tenants.ts";
import { AGENTS } from "../../shared/agents.ts";
import { getDb } from "../db/index.ts";

interface DbTenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  description: string;
  max_agents: number;
  created_at: string;
}

interface DbTenantAgentRow {
  tenant_id: string;
  agent_name: string;
  enabled: number;
}

function rowToTenant(row: DbTenantRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan as TenantPlan,
    description: row.description,
    maxAgents: row.max_agents,
    createdAt: row.created_at,
    limits: PLAN_LIMITS[row.plan as TenantPlan],
  };
}

export function seedTenantsIfEmpty() {
  const count = getDb().prepare("SELECT COUNT(*) as c FROM tenants").get() as { c: number };
  if (count.c > 0) return;

  const insertTenant = getDb().prepare(`
    INSERT INTO tenants (id, name, slug, plan, description, max_agents, created_at)
    VALUES (@id, @name, @slug, @plan, @description, @max_agents, @created_at)
  `);
  const insertAgent = getDb().prepare(`
    INSERT INTO tenant_agents (tenant_id, agent_name, enabled)
    VALUES (@tenant_id, @agent_name, 1)
  `);

  const now = new Date().toISOString();
  const seed = getDb().transaction(() => {
    for (const t of SEED_TENANTS) {
      insertTenant.run({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        description: t.description,
        max_agents: t.maxAgents,
        created_at: now,
      });
      const agents = t.agentAllowlist ?? AGENTS.map((a) => a.name);
      for (const agent of agents) {
        insertAgent.run({ tenant_id: t.id, agent_name: agent });
      }
    }
  });
  seed();
}

export function listTenants() {
  seedTenantsIfEmpty();
  const rows = getDb().prepare("SELECT * FROM tenants ORDER BY name").all() as DbTenantRow[];
  return rows.map((row) => {
    const tenant = rowToTenant(row);
    const agentCount = getTenantAgentCount(row.id);
    return { ...tenant, agentCount };
  });
}

export function getTenant(id: string) {
  seedTenantsIfEmpty();
  const row = getDb().prepare("SELECT * FROM tenants WHERE id = ?").get(id) as DbTenantRow | undefined;
  if (!row) return null;
  const agents = getTenantAgents(id);
  return { ...rowToTenant(row), agents, agentCount: agents.length };
}

export function getTenantBySlug(slug: string) {
  seedTenantsIfEmpty();
  const row = getDb().prepare("SELECT * FROM tenants WHERE slug = ?").get(slug) as DbTenantRow | undefined;
  return row ? getTenant(row.id) : null;
}

function getTenantAgentCount(tenantId: string) {
  const row = getDb().prepare(
    "SELECT COUNT(*) as c FROM tenant_agents WHERE tenant_id = ? AND enabled = 1"
  ).get(tenantId) as { c: number };
  return row.c;
}

export function getTenantAgents(tenantId: string) {
  seedTenantsIfEmpty();
  const rows = getDb().prepare(`
    SELECT agent_name FROM tenant_agents WHERE tenant_id = ? AND enabled = 1 ORDER BY agent_name
  `).all(tenantId) as { agent_name: string }[];
  return rows.map((r) => r.agent_name);
}

export function getTenantAllowlist(tenantId: string): string[] | undefined {
  const tenant = getTenant(tenantId);
  if (!tenant) return undefined;
  const seed = SEED_TENANTS.find((t) => t.id === tenantId);
  if (seed && !seed.agentAllowlist) return undefined; // all agents
  return tenant.agents;
}

export function isAgentEnabledForTenant(tenantId: string, agentName: string): boolean {
  seedTenantsIfEmpty();
  const row = getDb().prepare(`
    SELECT enabled FROM tenant_agents WHERE tenant_id = ? AND agent_name = ?
  `).get(tenantId, agentName.toUpperCase()) as DbTenantAgentRow | undefined;
  if (!row) return tenantId === DEFAULT_TENANT_ID;
  return row.enabled === 1;
}

export function filterAgentsForTenant<T extends { name: string }>(tenantId: string, agents: T[]): T[] {
  const allowlist = getTenantAllowlist(tenantId);
  if (!allowlist) return agents;
  const set = new Set(allowlist);
  return agents.filter((a) => set.has(a.name));
}

export function createTenant(data: {
  name: string;
  slug: string;
  plan: TenantPlan;
  description?: string;
  agentNames?: string[];
}) {
  seedTenantsIfEmpty();
  const limits = PLAN_LIMITS[data.plan];
  const agents = (data.agentNames ?? ["DESK", "FLOW", "CODE", "ARCH"]).slice(0, limits.maxAgents);
  const id = `tenant_${Date.now()}`;
  const now = new Date().toISOString();

  getDb().prepare(`
    INSERT INTO tenants (id, name, slug, plan, description, max_agents, created_at)
    VALUES (@id, @name, @slug, @plan, @description, @max_agents, @created_at)
  `).run({
    id,
    name: data.name,
    slug: data.slug,
    plan: data.plan,
    description: data.description || "",
    max_agents: limits.maxAgents,
    created_at: now,
  });

  const insertAgent = getDb().prepare(`
    INSERT INTO tenant_agents (tenant_id, agent_name, enabled) VALUES (@tenant_id, @agent_name, 1)
  `);
  for (const agent of agents) {
    if (isAgentAllowedForTenant(agent, undefined)) {
      insertAgent.run({ tenant_id: id, agent_name: agent.toUpperCase() });
    }
  }

  return getTenant(id);
}

export function resolveTenantId(headerOrCookie?: string | null): string {
  if (headerOrCookie && headerOrCookie.length > 0) {
    const tenant = getTenant(headerOrCookie);
    if (tenant) return tenant.id;
    const bySlug = getTenantBySlug(headerOrCookie);
    if (bySlug) return bySlug.id;
  }
  return DEFAULT_TENANT_ID;
}

export function getDefaultTenantId() {
  return DEFAULT_TENANT_ID;
}
