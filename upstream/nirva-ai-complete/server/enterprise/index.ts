/**
 * Enterprise dashboard — audit, billing, ERP connectors, deploy templates (v1.0)
 */

import { appendAuditLog, listAuditLogs } from "../db/index.ts";
import { getTenant } from "../tenants/index.ts";
import { getTodayUsage } from "../orchestration/index.ts";
import { isOAuthConfigured } from "../auth/index.ts";
import { getEcosystemStatus } from "../ecosystem/index.ts";
import {
  DEPLOYMENT_TEMPLATES,
  getErpConnectorCatalog,
  getPlanPricing,
  type EnterpriseDashboard,
  type ErpConnector,
  type BillingSummary,
  type SsoStatus,
} from "../../shared/enterprise.ts";
import type { TenantPlan } from "../../shared/tenants.ts";

export { appendAuditLog, listAuditLogs };

export function recordAuditEvent(opts: Parameters<typeof appendAuditLog>[0]) {
  return appendAuditLog(opts);
}

export function getSsoStatus(): SsoStatus {
  const oauth = isOAuthConfigured();
  const portalUrl = process.env.VITE_OAUTH_PORTAL_URL || undefined;
  return {
    enabled: oauth,
    provider: oauth ? "oauth" : "demo",
    portalUrl,
    ssoReady: oauth && Boolean(portalUrl && process.env.VITE_APP_ID),
  };
}

export function getBillingSummary(tenantId: string, plan: TenantPlan): BillingSummary {
  const usage = getTodayUsage(tenantId);
  const { limits } = getPlanPricing(plan);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY);

  return {
    plan,
    planLabel: limits.label,
    maxAgents: limits.maxAgents,
    maxPlugins: limits.plugins,
    todayCostUsd: usage.totalCostUsd,
    todayRequests: usage.totalCalls,
    premiumPercent: usage.premiumPercent,
    billingProvider: stripeConfigured ? "stripe" : plan === "enterprise" ? "manual" : "none",
    stripeConfigured,
  };
}

export async function getErpConnectors(): Promise<ErpConnector[]> {
  const catalog = getErpConnectorCatalog();
  const ecosystem = await getEcosystemStatus();
  return catalog.map((c) => {
    const app = ecosystem.apps.find((a) => a.id === c.id);
    const url = app?.url || (c.envKey ? process.env[c.envKey] || "" : "");
    const status = !url ? ("unconfigured" as const) : app?.status === "online" ? ("online" as const) : ("offline" as const);
    return { ...c, url, status };
  });
}

export async function getEnterpriseDashboard(tenantId: string): Promise<EnterpriseDashboard> {
  const tenant = getTenant(tenantId);
  const plan = tenant?.plan ?? "free";
  const sso = getSsoStatus();
  const billing = getBillingSummary(tenantId, plan);
  const connectors = await getErpConnectors();
  const recentAudit = listAuditLogs({ tenantId, limit: 20 });

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    tenantName: tenant?.name ?? "Unknown",
    plan,
    sso,
    billing,
    connectors,
    connectorsOnline: connectors.filter((c) => c.status === "online").length,
    deploymentTemplates: DEPLOYMENT_TEMPLATES,
    recentAudit,
    features: {
      privateAi: plan === "enterprise" || plan === "impact",
      erpConnectors: plan !== "free",
      auditLogs: true,
      billing: plan !== "free",
      sso: sso.enabled,
    },
  };
}
