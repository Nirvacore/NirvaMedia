import { NIRVA_ECOSYSTEM, ECOSYSTEM_INFRASTRUCTURE, type EcosystemApp } from "../../shared/ecosystem.ts";

export interface AppHealthStatus {
  id: string;
  name: string;
  status: "online" | "offline" | "unknown";
  url: string;
  latencyMs?: number;
  role: string;
  tagline: string;
  agents: string[];
  repo: string;
  stack: string[];
  productStatus: string;
  color: string;
  icon: string;
}

async function checkUrl(url: string, healthPath = "/"): Promise<{ status: "online" | "offline"; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${url.replace(/\/$/, "")}${healthPath}`, { signal: controller.signal });
    clearTimeout(timeout);
    return { status: res.ok ? "online" : "offline", latencyMs: Date.now() - start };
  } catch {
    return { status: "offline", latencyMs: Date.now() - start };
  }
}

function resolveAppUrl(app: EcosystemApp): string {
  if (app.envKey && process.env[app.envKey]) return process.env[app.envKey]!;
  if (app.id === "nirva-ai") {
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  return app.defaultUrl || "";
}

export async function getEcosystemStatus(): Promise<{
  apps: AppHealthStatus[];
  infrastructure: { id: string; name: string; desc: string; status: "online" | "offline"; url: string }[];
  summary: { total: number; online: number; products: number };
}> {
  const appChecks = await Promise.all(
    NIRVA_ECOSYSTEM.map(async (app) => {
      const url = resolveAppUrl(app);
      const check = url
        ? await checkUrl(url, app.healthPath || "/")
        : { status: "offline" as const, latencyMs: 0 };

      return {
        id: app.id,
        name: app.name,
        status: check.status,
        url,
        latencyMs: check.latencyMs,
        role: app.role,
        tagline: app.tagline,
        agents: app.agents,
        repo: app.repo,
        stack: app.stack,
        productStatus: app.status,
        color: app.color,
        icon: app.icon,
      };
    })
  );

  const infraChecks = await Promise.all(
    ECOSYSTEM_INFRASTRUCTURE.map(async (infra) => {
      const url = process.env[infra.envKey] || `http://localhost:${infra.port}`;
      const path = infra.id === "ollama" ? "/api/tags" : infra.id === "qdrant" ? "/collections" : "/healthz";
      const check = await checkUrl(url, path);
      return { id: infra.id, name: infra.name, desc: infra.desc, status: check.status, url };
    })
  );

  const online = appChecks.filter((a) => a.status === "online").length;

  return {
    apps: appChecks,
    infrastructure: infraChecks,
    summary: {
      total: appChecks.length,
      online,
      products: appChecks.filter((a) => a.role === "product").length,
    },
  };
}

export async function getAppStatus(id: string): Promise<AppHealthStatus | null> {
  const ecosystem = await getEcosystemStatus();
  return ecosystem.apps.find((a) => a.id === id) ?? null;
}
