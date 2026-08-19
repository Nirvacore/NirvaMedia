/**
 * Enterprise — v1.0 private AI, ERP, billing, audit (Brain OS Phase 5)
 */

import { NIRVA_ECOSYSTEM } from "./ecosystem.ts";
import { PRICING_PLANS } from "./brains.ts";
import { PLAN_LIMITS, type TenantPlan } from "./tenants.ts";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  action: string;
  actor: string;
  resource: string;
  detail: string;
  severity: AuditSeverity;
  createdAt: string;
}

export interface ErpConnector {
  id: string;
  name: string;
  tagline: string;
  agents: string[];
  url: string;
  status: "online" | "offline" | "unconfigured";
  envKey?: string;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  target: "manus" | "contabo" | "docker";
  path: string;
  command: string;
}

export interface BillingSummary {
  plan: TenantPlan;
  planLabel: string;
  maxAgents: number;
  maxPlugins: number;
  todayCostUsd: number;
  todayRequests: number;
  premiumPercent: number;
  billingProvider: "stripe" | "manual" | "none";
  stripeConfigured: boolean;
}

export interface SsoStatus {
  enabled: boolean;
  provider: "oauth" | "demo";
  portalUrl?: string;
  ssoReady: boolean;
}

export interface EnterpriseDashboard {
  generatedAt: string;
  tenantId: string;
  tenantName: string;
  plan: TenantPlan;
  sso: SsoStatus;
  billing: BillingSummary;
  connectors: ErpConnector[];
  connectorsOnline: number;
  deploymentTemplates: DeploymentTemplate[];
  recentAudit: AuditLogEntry[];
  features: {
    privateAi: boolean;
    erpConnectors: boolean;
    auditLogs: boolean;
    billing: boolean;
    sso: boolean;
  };
}

export const DEPLOYMENT_TEMPLATES: DeploymentTemplate[] = [
  {
    id: "manus",
    name: "Manus Space (ai.nirva.one)",
    nameTh: "Manus Space",
    description: "Publish บน Manus — OAuth + managed hosting",
    target: "manus",
    path: "deploy/manus/",
    command: "pnpm manus:config && bash deploy/manus/start.sh",
  },
  {
    id: "contabo",
    name: "Contabo VPS",
    nameTh: "Contabo VPS",
    description: "Self-hosted production บน Contabo — nginx + Docker",
    target: "contabo",
    path: "deploy/contabo/",
    command: "bash deploy/contabo/deploy.sh",
  },
  {
    id: "docker-local",
    name: "Docker Local",
    nameTh: "Docker ท้องถิ่น",
    description: "Development / private AI on-premises",
    target: "docker",
    path: "docker-compose.yml",
    command: "pnpm go",
  },
];

export const ERP_CONNECTOR_IDS = ["nirvaprocure", "nirvasell", "nirvamedia", "mutea", "mahasunyataland"] as const;

export function getErpConnectorCatalog(): Omit<ErpConnector, "url" | "status">[] {
  return NIRVA_ECOSYSTEM.filter((app) => ERP_CONNECTOR_IDS.includes(app.id as typeof ERP_CONNECTOR_IDS[number])).map(
    (app) => ({
      id: app.id,
      name: app.name,
      tagline: app.tagline,
      agents: app.agents,
      envKey: app.envKey,
    })
  );
}

export function getPlanPricing(plan: TenantPlan) {
  const brainPlan = PRICING_PLANS.find((p) => p.id === plan) ?? PRICING_PLANS[0];
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  return { brainPlan, limits };
}

export const AUDIT_ACTIONS = {
  WORKSPACE_EXECUTE: "workspace.execute",
  MORNING_EXECUTE: "morning.execute",
  WORKFLOW_RUN: "workflow.run",
  PLUGIN_INSTALL: "plugin.install",
  PROVIDER_TEST: "provider.test",
  TENANT_SWITCH: "tenant.switch",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
} as const;
