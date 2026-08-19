/**
 * Multi-tenant — organization-level agent isolation.
 */

export type TenantPlan = "free" | "pro" | "enterprise" | "impact";

export interface TenantDefinition {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  description: string;
  maxAgents: number;
  /** Subset of registry agents enabled for this tenant; empty = all */
  agentAllowlist?: string[];
}

export const DEFAULT_TENANT_ID = "tenant_nirva_default";

export const SEED_TENANTS: TenantDefinition[] = [
  {
    id: DEFAULT_TENANT_ID,
    name: "Nirvacore",
    slug: "nirvacore",
    plan: "enterprise",
    description: "Default organization — full 109-agent workforce",
    maxAgents: 109,
  },
  {
    id: "tenant_startup_demo",
    name: "Startup Demo",
    slug: "startup-demo",
    plan: "pro",
    description: "Pro tier — Software + Commerce agents",
    maxAgents: 24,
    agentAllowlist: [
      "DESK", "FLOW", "SAGE", "ARCH", "CODE", "PIXEL", "ROOT", "SHIP", "WALL",
      "SCOUT", "REACH", "PRICE", "CARE", "BRIEF", "GATHER", "RAG-BUILDER",
      "BUZZ", "COIN", "TALLY", "TEACH", "CHECK", "NET", "SPARK", "INK",
    ],
  },
  {
    id: "tenant_free_sandbox",
    name: "Free Sandbox",
    slug: "free-sandbox",
    plan: "free",
    description: "Free tier — 8 core agents only",
    maxAgents: 8,
    agentAllowlist: ["DESK", "FLOW", "CODE", "ARCH", "CARE", "BRIEF", "GATHER", "TEACH"],
  },
];

export const PLAN_LIMITS: Record<TenantPlan, { maxAgents: number; plugins: number; label: string }> = {
  free: { maxAgents: 8, plugins: 2, label: "Free" },
  pro: { maxAgents: 50, plugins: 10, label: "Pro" },
  enterprise: { maxAgents: 109, plugins: 50, label: "Enterprise" },
  impact: { maxAgents: 20, plugins: 5, label: "Impact" },
};

export function isAgentAllowedForTenant(agentName: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(agentName.toUpperCase());
}
