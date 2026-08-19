import { describe, it, expect, beforeAll } from "vitest";
import { SEED_TENANTS, PLAN_LIMITS, isAgentAllowedForTenant } from "../tenants.ts";
import { BUILTIN_PLUGINS, getPluginDefinition } from "../plugins.ts";

describe("multi-tenant", () => {
  it("has seed tenants with plan limits", () => {
    expect(SEED_TENANTS.length).toBeGreaterThanOrEqual(3);
    expect(PLAN_LIMITS.free.maxAgents).toBe(8);
    expect(PLAN_LIMITS.enterprise.maxAgents).toBe(109);
  });

  it("filters agents by allowlist", () => {
    const startup = SEED_TENANTS.find((t) => t.slug === "startup-demo");
    expect(startup?.agentAllowlist).toContain("CODE");
    expect(isAgentAllowedForTenant("SHIP", startup?.agentAllowlist)).toBe(true);
    expect(isAgentAllowedForTenant("BLOOM", startup?.agentAllowlist)).toBe(false);
  });

  it("lists and filters tenants", async () => {
    const { listTenants, filterAgentsForTenant, getDefaultTenantId } = await import("../../server/tenants/index.ts");
    const tenants = listTenants();
    expect(tenants.length).toBeGreaterThanOrEqual(3);
    const free = tenants.find((t) => t.slug === "free-sandbox");
    expect(free?.agentCount).toBe(8);
    const { AGENTS } = await import("../agents.ts");
    const filtered = filterAgentsForTenant(free!.id, AGENTS);
    expect(filtered.length).toBe(8);
    expect(getDefaultTenantId()).toBeTruthy();
  });
});

describe("plugin system", () => {
  it("has builtin plugins", () => {
    expect(BUILTIN_PLUGINS.length).toBeGreaterThanOrEqual(5);
    expect(getPluginDefinition("webhook-trigger")?.type).toBe("webhook");
  });

  it("lists plugins per tenant", async () => {
    const { listPlugins } = await import("../../server/plugins/index.ts");
    const { getDefaultTenantId } = await import("../../server/tenants/index.ts");
    const data = listPlugins(getDefaultTenantId());
    expect(data.installed.length).toBeGreaterThan(0);
  });

  it("invokes task plugin", async () => {
    const { listPlugins, invokePlugin } = await import("../../server/plugins/index.ts");
    const { getDefaultTenantId } = await import("../../server/tenants/index.ts");
    const tenantId = getDefaultTenantId();
    const { installed } = listPlugins(tenantId);
    const taskPlugin = installed.find((p) => p.pluginKey === "task-creator");
    expect(taskPlugin).toBeTruthy();
    const result = await invokePlugin(taskPlugin!.id, { agent: "DESK", tenantId });
    expect(result?.success).toBe(true);
    expect(result?.type).toBe("task");
  });
});
