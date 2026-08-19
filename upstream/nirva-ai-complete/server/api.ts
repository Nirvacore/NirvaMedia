import { Router, type Request } from "express";
import { AGENTS, AGENT_STATS } from "../shared/agents.ts";
import {
  getAgentFromDb,
  updateAgentInDb,
  listTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getChatHistory,
  getOrCreateChatSession,
  saveChatMessage,
  getDb,
} from "./db/index.ts";
import {
  addMemory,
  searchMemory,
  listAgentMemory,
  removeMemory,
  getMemoryStats,
  buildRagContext,
  storeConversationMemory,
} from "./memory/index.ts";
import { getEcosystemStatus, getAppStatus } from "./ecosystem/index.ts";
import {
  listN8nWorkflows,
  isN8nAvailable,
  triggerWorkflow,
  getWorkflowTemplates,
  WORKFLOW_TEMPLATES,
} from "./n8n/index.ts";
import { NIRVA_ECOSYSTEM } from "../shared/ecosystem.ts";
import { getMetrics } from "./middleware/logger.ts";
import { broadcastTaskUpdate } from "./ws/index.ts";
import {
  isOAuthConfigured,
  buildLoginUrl,
  getSessionFromRequest,
  handleOAuthCallback,
  handleDemoLogin,
  handleLogout,
  parseCookies,
} from "./auth/index.ts";
import {
  listMarketplaceListings,
  getMarketplaceListing,
  publishMarketplaceListing,
  importMarketplaceListing,
  rateMarketplaceListing,
  exportAgentPack,
  importAgentPackFromJson,
  getMarketplaceStats,
} from "./marketplace/index.ts";
import { getOrganizationSummary } from "../shared/organization.ts";
import {
  AI_BRAINS,
  BRAIN_CATEGORIES,
  GLOBAL_PROVIDERS,
  PRICING_PLANS,
  planBrainTeam,
  getBrainStats,
  getBrainsForPlan,
} from "../shared/brains.ts";
import { getRoleMatrix, DEFAULT_USER_ROLE, type UserRole } from "../shared/permissions.ts";
import { createIdentityRouter } from "./identity/index.ts";
import { createLanguageRouter } from "./language/index.ts";
import { createMediaRouter } from "./media/index.ts";
import { analyzeIntent, analyzeIntentAsync, executeRoute, getRouterStatus } from "./router/index.ts";
import { getClassifierInfo } from "./router/classifier.ts";
import {
  getOrchestrationSummary,
  routeModelForAgent,
  routePipelineModels,
  getCostStats,
  routeAndRecord,
  planPipelineAndRecord,
  resolveOllamaModel,
  getRecentRouting,
  type OrchestrationPrefs,
} from "./orchestration/index.ts";
import { getOpenApiSpec } from "./openapi/spec.ts";
import { getSwaggerHtml } from "./openapi/docs.ts";
import { buildOrganizationReport } from "./reports/index.ts";
import {
  listTenants,
  getTenant,
  createTenant,
  resolveTenantId,
  filterAgentsForTenant,
  isAgentEnabledForTenant,
} from "./tenants/index.ts";
import {
  listPlugins,
  installPlugin,
  updatePlugin,
  invokePlugin,
  getPluginsForAgent,
} from "./plugins/index.ts";
import { TENANT_COOKIE_NAME } from "../shared/const.ts";
import { completeChat, getProviderHub, testProvider, type ProviderKeys, type CompletionResult } from "./providers/index.ts";
import type { CloudProviderId } from "../shared/providers.ts";
import type { ModelRouteDecision } from "../shared/model-orchestration.ts";

function providerKeysFromBody(body: Record<string, unknown> | undefined): ProviderKeys {
  const keys = body?.providerKeys as ProviderKeys | undefined;
  return {
    openai: (body?.openaiApiKey as string) || keys?.openai,
    anthropic: (body?.anthropicApiKey as string) || keys?.anthropic,
    google: (body?.googleApiKey as string) || keys?.google,
    deepseek: (body?.deepseekApiKey as string) || keys?.deepseek,
    mistral: (body?.mistralApiKey as string) || keys?.mistral,
  };
}

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const DEFAULT_QDRANT_URL = process.env.VITE_QDRANT_URL || "http://localhost:6333";
const DEFAULT_N8N_URL = process.env.VITE_N8N_URL || "http://localhost:5678";
const DEFAULT_MODEL = process.env.VITE_DEFAULT_MODEL || "llama3.1:8b";

async function completeOllamaOnly(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  model: string,
  ollamaUrl: string
): Promise<CompletionResult> {
  const res = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { message: { content: string } };
  return { content: data.message.content, source: "ollama", model, provider: "ollama" };
}

function buildChatResponse(
  saved: { id: string; createdAt: string },
  sid: string,
  agentName: string,
  result: CompletionResult,
  memoryContext: string[],
  modelRouting: ModelRouteDecision | undefined,
  model: string
) {
  return {
    id: saved.id,
    sessionId: sid,
    role: "assistant" as const,
    content: result.content,
    agent: agentName,
    source: result.source,
    timestamp: saved.createdAt,
    memoryContext,
    modelRouting,
    model,
  };
}

function resolveChatModel(opts: {
  message: string;
  agent: string;
  explicitModel?: string;
  useOrchestration?: boolean;
  tenantId?: string;
  dbAgentModel?: string;
  prefs?: OrchestrationPrefs;
}) {
  if (opts.explicitModel) {
    return { targetModel: opts.explicitModel, modelRouting: undefined };
  }
  if (opts.useOrchestration === false) {
    return {
      targetModel: opts.dbAgentModel || DEFAULT_MODEL,
      modelRouting: undefined,
    };
  }
  const decision = routeAndRecord(opts.message, opts.agent, opts.tenantId, opts.prefs);
  return {
    targetModel: resolveOllamaModel(decision, opts.dbAgentModel || DEFAULT_MODEL),
    modelRouting: decision,
  };
}

const startTime = Date.now();

async function checkService(url: string, path = ""): Promise<"running" | "unavailable"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok ? "running" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function createApiRouter(): Router {
  const router = Router();

  // Initialize database on first request
  router.use((_req, _res, next) => {
    getDb();
    next();
  });

  // --- NID Identity Platform (Phase 1) — docs/NID_IDENTITY_ARCHITECTURE.md ---
  router.use("/v1/identity", createIdentityRouter());

  // --- NLE Language Engine (Phase 2) — docs/NLE_LANGUAGE_ENGINE_ARCHITECTURE.md ---
  router.use("/v1/language", createLanguageRouter());

  // --- NMD Nirva Media (Phase 4 core) — docs/NMD_MEDIA_ARCHITECTURE.md ---
  router.use("/v1/media", createMediaRouter());

  router.get("/health", async (req, res) => {
    const ollamaUrl = (req.query.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const qdrantUrl = (req.query.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const n8nUrl = (req.query.n8nUrl as string) || DEFAULT_N8N_URL;

    const [ollama, qdrant, n8n] = await Promise.all([
      checkService(ollamaUrl, "/api/tags"),
      checkService(qdrantUrl, "/collections"),
      checkService(n8nUrl, "/healthz"),
    ]);

    res.json({
      status: "healthy",
      version: "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: "sqlite",
      memory: "qdrant",
      ecosystem: "nirva",
      websocket: "enabled",
      auth: isOAuthConfigured() ? "oauth" : "demo",
      services: {
        ollama: { status: ollama, url: ollamaUrl },
        qdrant: { status: qdrant, url: qdrantUrl },
        n8n: { status: n8n, url: n8nUrl },
        dashboard: { status: "running", url: `http://localhost:${process.env.PORT || 3000}` },
      },
    });
  });

  router.get("/metrics", (_req, res) => {
    res.json({
      ...getMetrics(),
      version: "1.0.0",
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });
  });

  // --- Auth / OAuth ---
  router.get("/auth/me", (req, res) => {
    const user = getSessionFromRequest(req);
    res.json({
      authenticated: Boolean(user),
      user,
      mode: isOAuthConfigured() ? "oauth" : "demo",
    });
  });

  router.get("/auth/login", (req, res) => {
    if (!isOAuthConfigured()) {
      res.json({ mode: "demo", message: "OAuth not configured — use POST /api/auth/demo-login" });
      return;
    }
    const origin = `${req.protocol}://${req.get("host")}`;
    res.redirect(buildLoginUrl(origin));
  });

  router.get("/oauth/callback", (req, res) => {
    handleOAuthCallback(req, res).catch(() => res.redirect("/?auth_error=server_error"));
  });

  router.post("/auth/demo-login", (req, res) => {
    if (isOAuthConfigured() && process.env.ALLOW_DEMO_AUTH !== "true") {
      res.status(403).json({ error: { code: "OAUTH_REQUIRED", message: "Use OAuth login" } });
      return;
    }
    handleDemoLogin(req, res);
  });

  router.post("/auth/logout", (req, res) => {
    handleLogout(req, res);
  });

  function resolveUserRole(req: Request): UserRole {
    const user = getSessionFromRequest(req);
    if (!user) return DEFAULT_USER_ROLE;
    if (user.provider === "oauth" && user.email.includes("admin")) return "admin";
    return user ? "operator" : DEFAULT_USER_ROLE;
  }

  function resolveTenant(req: Request): string {
    const header = req.headers["x-tenant-id"];
    const fromHeader = typeof header === "string" ? header : Array.isArray(header) ? header[0] : null;
    const fromCookie = parseCookies(req)[TENANT_COOKIE_NAME];
    const fromQuery = req.query.tenantId as string | undefined;
    return resolveTenantId(fromQuery || fromHeader || fromCookie);
  }

  router.get("/openapi.json", (_req, res) => {
    res.json(getOpenApiSpec("/api"));
  });

  router.get("/docs", (_req, res) => {
    res.type("html").send(getSwaggerHtml("/api/openapi.json"));
  });

  // --- Multi-tenant ---
  router.get("/tenants", (_req, res) => {
    res.json({ tenants: listTenants() });
  });

  router.get("/tenants/current", (req, res) => {
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    if (!tenant) {
      res.status(404).json({ error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" } });
      return;
    }
    res.json(tenant);
  });

  router.get("/tenants/:id", (req, res) => {
    const tenant = getTenant(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" } });
      return;
    }
    res.json(tenant);
  });

  router.post("/tenants", (req, res) => {
    const { name, slug, plan, description, agentNames } = req.body ?? {};
    if (!name || !slug || !plan) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "name, slug, plan required" } });
      return;
    }
    const tenant = createTenant({ name, slug, plan, description, agentNames });
    if (!tenant) {
      res.status(400).json({ error: { code: "CREATE_FAILED", message: "Could not create tenant" } });
      return;
    }
    res.status(201).json(tenant);
  });

  // --- Plugin system ---
  router.get("/plugins", (req, res) => {
    const tenantId = resolveTenant(req);
    res.json(listPlugins(tenantId));
  });

  router.get("/plugins/agent/:agentName", (req, res) => {
    const tenantId = resolveTenant(req);
    res.json({ plugins: getPluginsForAgent(tenantId, req.params.agentName) });
  });

  router.post("/plugins/install", async (req, res) => {
    const tenantId = resolveTenant(req);
    const { pluginKey, agents } = req.body ?? {};
    if (!pluginKey) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "pluginKey required" } });
      return;
    }
    const plugin = installPlugin(tenantId, pluginKey, agents);
    if (!plugin) {
      res.status(400).json({ error: { code: "INSTALL_FAILED", message: "Plugin install failed or plan limit reached" } });
      return;
    }
    const { recordAuditEvent } = await import("./enterprise/index.ts");
    const { AUDIT_ACTIONS } = await import("../shared/enterprise.ts");
    const user = getSessionFromRequest(req);
    recordAuditEvent({
      tenantId,
      action: AUDIT_ACTIONS.PLUGIN_INSTALL,
      actor: user?.email || "anonymous",
      resource: pluginKey,
      detail: `Plugin installed for agents: ${(agents || []).join(", ") || "default"}`,
    });
    res.status(201).json(plugin);
  });

  router.patch("/plugins/:id", (req, res) => {
    const updated = updatePlugin(req.params.id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: { code: "PLUGIN_NOT_FOUND", message: "Plugin not found" } });
      return;
    }
    res.json(updated);
  });

  router.post("/plugins/:id/invoke", async (req, res) => {
    const tenantId = resolveTenant(req);
    const result = await invokePlugin(req.params.id, {
      agent: req.body?.agent,
      data: req.body?.data,
      tenantId,
    });
    if (!result) {
      res.status(404).json({ error: { code: "PLUGIN_NOT_FOUND", message: "Plugin not found or disabled" } });
      return;
    }
    res.json(result);
  });

  // --- Organization & Agent Router (AI Company OS) ---
  router.get("/organization", (_req, res) => {
    res.json(getOrganizationSummary());
  });

  router.get("/organization/router", (_req, res) => {
    res.json(getRouterStatus());
  });

  router.get("/permissions", (_req, res) => {
    res.json(getRoleMatrix());
  });

  router.get("/router/classifier", (_req, res) => {
    res.json(getClassifierInfo());
  });

  router.get("/orchestration", (_req, res) => {
    res.json(getOrchestrationSummary());
  });

  router.get("/orchestration/cost", (req, res) => {
    const tenantId = resolveTenant(req);
    res.json(getCostStats(tenantId));
  });

  router.get("/orchestration/recent", (req, res) => {
    const tenantId = resolveTenant(req);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    res.json({ recent: getRecentRouting(tenantId, limit), tenantId });
  });

  router.post("/orchestration/route", (req, res) => {
    const { message, agent = "DESK" } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }
    const tenantId = resolveTenant(req);
    const decision = routeAndRecord(message, String(agent), tenantId);
    res.json({ ...decision, tenantId });
  });

  router.post("/orchestration/route-pipeline", (req, res) => {
    const { message, agents } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }
    const agentList = Array.isArray(agents) ? agents.map(String) : ["DESK", "FLOW", "BRIEF"];
    const tenantId = resolveTenant(req);
    const plan = planPipelineAndRecord(message, agentList, tenantId);
    res.json({ ...plan, tenantId });
  });

  router.post("/router/analyze", async (req, res) => {
    const { message, useLLM = false, ollamaUrl, model } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }
    const role = resolveUserRole(req);
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    const analysis = useLLM
      ? await analyzeIntentAsync(message, role, tenant?.agents, { useLLM: true, ollamaUrl, model })
      : analyzeIntent(message, role, tenant?.agents);
    res.json({ ...analysis, userRole: role, tenantId });
  });

  router.post("/router/execute", async (req, res) => {
    const { message, createTasks = true, useLLM = false, ollamaUrl, model } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }
    const role = resolveUserRole(req);
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    const analysis = useLLM
      ? await analyzeIntentAsync(message, role, tenant?.agents, { useLLM: true, ollamaUrl, model })
      : analyzeIntent(message, role, tenant?.agents);
    const result = executeRoute(message, role, {
      createTasks,
      tenantId,
      tenantAllowlist: tenant?.agents,
      analysis,
    });
    for (const task of result.tasks) broadcastTaskUpdate(task);
    res.json({ ...result, userRole: role, tenantId });
  });

  router.get("/reports", (req, res) => {
    const tenantId = resolveTenant(req);
    res.json(buildOrganizationReport(tenantId));
  });

  // Control Tower chat — DESK routes then responds with pipeline plan
  router.post("/chat/tower", async (req, res) => {
    const {
      message,
      ollamaUrl,
      qdrantUrl,
      model,
      useMemory = true,
      useOrchestration = true,
      maxPremiumPercent,
      preferSelfHosted,
    } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }

    const role = resolveUserRole(req);
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    const route = executeRoute(message, role, { tenantId, tenantAllowlist: tenant?.agents });
    for (const task of route.tasks) broadcastTaskUpdate(task);

    const sid = getOrCreateChatSession("DESK", req.body?.sessionId);
    saveChatMessage(sid, "user", message);

    const routeContext = route.message;
    let systemPrompt = getAgentFromDb("DESK")?.systemPrompt || "You are DESK, Chief of Staff.";
    systemPrompt += `\n\n## Current Routing Analysis\n${routeContext}\n\nSummarize the plan for the user in their language. Be concise and actionable.`;

    const targetUrl = (ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const targetQdrant = (qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const deskAgent = getAgentFromDb("DESK");
    const prefs: OrchestrationPrefs = {
      maxPremiumPercent: typeof maxPremiumPercent === "number" ? maxPremiumPercent : undefined,
      preferSelfHosted: preferSelfHosted !== false,
    };
    const { targetModel, modelRouting } = resolveChatModel({
      message,
      agent: "DESK",
      explicitModel: model as string | undefined,
      useOrchestration: useOrchestration !== false,
      tenantId,
      dbAgentModel: deskAgent?.model,
      prefs,
    });

    if (useMemory !== false) {
      try {
        const memories = await searchMemory("DESK", message, 3, { qdrantUrl: targetQdrant, ollamaUrl: targetUrl });
        const ragContext = buildRagContext(memories);
        if (ragContext) systemPrompt += ragContext;
      } catch { /* best-effort */ }
    }

    try {
      const keys = providerKeysFromBody(req.body);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: message },
      ];

      let content: string;
      let source: CompletionResult["source"] = "ollama";

      if (modelRouting) {
        const result = await completeChat({
          decision: modelRouting,
          messages,
          keys,
          ollamaUrl: targetUrl,
          fallbackModel: deskAgent?.model || DEFAULT_MODEL,
        });
        content = result.content;
        source = result.source;
      } else {
        const result = await completeOllamaOnly(messages, targetModel, targetUrl);
        content = result.content;
        source = result.source;
      }

      const saved = saveChatMessage(sid, "assistant", content, "DESK");

      res.json({
        id: saved.id,
        sessionId: sid,
        role: "assistant",
        content,
        agent: "DESK",
        source,
        timestamp: saved.createdAt,
        routing: route.analysis,
        tasks: route.tasks,
        runId: route.runId,
        modelRouting,
      });
    } catch {
      const fallback = route.message;
      const saved = saveChatMessage(sid, "assistant", fallback, "DESK");
      res.json({
        id: saved.id,
        sessionId: sid,
        role: "assistant",
        content: fallback,
        agent: "DESK",
        source: "router",
        timestamp: saved.createdAt,
        routing: route.analysis,
        tasks: route.tasks,
        runId: route.runId,
        modelRouting,
        fallback: true,
      });
    }
  });

  // --- Agent Marketplace ---
  router.get("/marketplace", (req, res) => {
    const { search, tag, featured, agent } = req.query;
    const listings = listMarketplaceListings({
      search: typeof search === "string" ? search : undefined,
      tag: typeof tag === "string" ? tag : undefined,
      featured: featured === "true",
      agentName: typeof agent === "string" ? agent : undefined,
    });
    res.json({ listings, stats: getMarketplaceStats() });
  });

  router.get("/marketplace/stats", (_req, res) => {
    res.json(getMarketplaceStats());
  });

  router.get("/marketplace/export/:agentName", (req, res) => {
    const pack = exportAgentPack(req.params.agentName);
    if (!pack) {
      res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
      return;
    }
    res.json({ pack });
  });

  router.get("/marketplace/:id", (req, res) => {
    const listing = getMarketplaceListing(req.params.id);
    if (!listing) {
      res.status(404).json({ error: { code: "LISTING_NOT_FOUND", message: "Listing not found" } });
      return;
    }
    res.json(listing);
  });

  router.post("/marketplace", (req, res) => {
    const { agentName, title, description, tags } = req.body ?? {};
    if (!agentName || !title) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "agentName and title are required" } });
      return;
    }
    const user = getSessionFromRequest(req);
    const listing = publishMarketplaceListing({
      agentName,
      title,
      description,
      tags,
      author: user?.name || "Anonymous",
      authorId: user?.id || null,
    });
    if (!listing) {
      res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: "Agent not found" } });
      return;
    }
    res.status(201).json(listing);
  });

  router.post("/marketplace/import-json", (req, res) => {
    const { pack } = req.body ?? {};
    const updated = importAgentPackFromJson(pack);
    if (!updated) {
      res.status(400).json({ error: { code: "INVALID_PACK", message: "Invalid agent pack JSON" } });
      return;
    }
    res.json({ agent: updated });
  });

  router.post("/marketplace/:id/import", (req, res) => {
    const result = importMarketplaceListing(req.params.id);
    if (!result) {
      res.status(404).json({ error: { code: "LISTING_NOT_FOUND", message: "Listing not found or import failed" } });
      return;
    }
    res.json(result);
  });

  router.post("/marketplace/:id/rate", (req, res) => {
    const stars = Number(req.body?.stars);
    const listing = rateMarketplaceListing(req.params.id, stars);
    if (!listing) {
      res.status(400).json({ error: { code: "INVALID_RATING", message: "Invalid rating (1-5) or listing not found" } });
      return;
    }
    res.json(listing);
  });

  router.get("/agents/stats", (req, res) => {
    const tenantId = resolveTenant(req);
    const filtered = filterAgentsForTenant(tenantId, AGENTS);
    const selfHosted = filtered.filter((a) => a.tier === "self-hosted").length;
    const hybrid = filtered.filter((a) => a.tier === "hybrid").length;
    const cloud = filtered.filter((a) => a.tier === "cloud").length;
    res.json({
      total: filtered.length,
      selfHosted,
      hybrid,
      cloud,
      active: 0,
      idle: filtered.length,
      running: 0,
      tenantId,
    });
  });

  router.get("/agents", (req, res) => {
    const { tier, category, search } = req.query;
    const tenantId = resolveTenant(req);
    let results = filterAgentsForTenant(tenantId, [...AGENTS]);

    if (tier && typeof tier === "string") results = results.filter((a) => a.tier === tier);
    if (category && typeof category === "string") results = results.filter((a) => a.category === category);
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      results = results.filter((a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
    }

    res.json({ agents: results, total: results.length, tenantId });
  });

  router.get("/agents/:name", (req, res) => {
    const tenantId = resolveTenant(req);
    if (!isAgentEnabledForTenant(tenantId, req.params.name)) {
      res.status(403).json({ error: { code: "AGENT_NOT_IN_TENANT", message: "Agent not enabled for this organization" } });
      return;
    }
    const detail = getAgentFromDb(req.params.name);
    if (!detail) {
      res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent '${req.params.name}' not found` } });
      return;
    }
    res.json({ ...detail, status: "idle" });
  });

  router.patch("/agents/:name", (req, res) => {
    const updated = updateAgentInDb(req.params.name, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: { code: "AGENT_NOT_FOUND", message: `Agent '${req.params.name}' not found` } });
      return;
    }
    res.json(updated);
  });

  // --- Tasks ---
  router.get("/tasks", (req, res) => {
    const status = req.query.status as string | undefined;
    const tenantId = resolveTenant(req);
    res.json({ tasks: listTasks(status, tenantId), tenantId });
  });

  router.post("/tasks", (req, res) => {
    const { title, agent, description } = req.body ?? {};
    if (!title || !agent) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "title and agent are required" } });
      return;
    }
    const tenantId = resolveTenant(req);
    if (!isAgentEnabledForTenant(tenantId, agent)) {
      res.status(403).json({ error: { code: "AGENT_NOT_IN_TENANT", message: "Agent not enabled for this organization" } });
      return;
    }
    const task = createTask({ title, agent, description, tenantId });
    broadcastTaskUpdate(task);
    res.status(201).json(task);
  });

  router.patch("/tasks/:id", (req, res) => {
    const { status, progress } = req.body ?? {};
    const task = updateTaskStatus(req.params.id, status, progress);
    if (!task) {
      res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
      return;
    }
    broadcastTaskUpdate(task);
    res.json(task);
  });

  router.post("/tasks/:id/retry", (req, res) => {
    const task = updateTaskStatus(req.params.id, "queued", 0);
    if (!task) { res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } }); return; }
    broadcastTaskUpdate(task);
    res.json(task);
  });

  router.post("/tasks/:id/pause", (req, res) => {
    const task = updateTaskStatus(req.params.id, "queued");
    if (!task) { res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } }); return; }
    broadcastTaskUpdate(task);
    res.json(task);
  });

  router.delete("/tasks/:id", (req, res) => {
    deleteTask(req.params.id);
    res.json({ ok: true });
  });

  // --- Memory (Qdrant + RAG) ---
  router.get("/memory/stats", async (req, res) => {
    const qdrantUrl = (req.query.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    try {
      const stats = await getMemoryStats(qdrantUrl);
      res.json(stats);
    } catch (err) {
      res.status(503).json({
        error: { code: "MEMORY_UNAVAILABLE", message: err instanceof Error ? err.message : "Memory service unavailable" },
      });
    }
  });

  router.get("/memory", (req, res) => {
    const agent = req.query.agent as string | undefined;
    res.json({ memories: listAgentMemory(agent) });
  });

  router.post("/memory", async (req, res) => {
    const { agent, content, title, source, qdrantUrl, ollamaUrl } = req.body ?? {};
    if (!agent || !content) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "agent and content are required" } });
      return;
    }
    try {
      const entry = await addMemory(
        { agent, content, title, source },
        { qdrantUrl, ollamaUrl }
      );
      res.status(201).json(entry);
    } catch (err) {
      res.status(503).json({
        error: { code: "MEMORY_STORE_FAILED", message: err instanceof Error ? err.message : "Failed to store memory" },
      });
    }
  });

  router.post("/memory/search", async (req, res) => {
    const { agent, query, limit = 5, qdrantUrl, ollamaUrl } = req.body ?? {};
    if (!agent || !query) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "agent and query are required" } });
      return;
    }
    try {
      const results = await searchMemory(agent, query, limit, { qdrantUrl, ollamaUrl });
      res.json({ results });
    } catch (err) {
      res.status(503).json({
        error: { code: "MEMORY_SEARCH_FAILED", message: err instanceof Error ? err.message : "Search failed" },
      });
    }
  });

  router.delete("/memory/:id", async (req, res) => {
    const qdrantUrl = (req.query.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const ok = await removeMemory(req.params.id, qdrantUrl);
    if (!ok) {
      res.status(404).json({ error: { code: "MEMORY_NOT_FOUND", message: "Memory entry not found" } });
      return;
    }
    res.json({ ok: true });
  });

  // --- Chat history ---
  router.get("/chat/history", (req, res) => {
    const agent = (req.query.agent as string) || "CODE";
    res.json(getChatHistory(agent.toUpperCase()));
  });

  router.post("/chat", async (req, res) => {
    const {
      message,
      agent = "DESK",
      model,
      ollamaUrl,
      qdrantUrl,
      history = [],
      sessionId,
      useMemory = true,
      useOrchestration = true,
      maxPremiumPercent,
      preferSelfHosted,
    } = req.body ?? {};

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "message is required" } });
      return;
    }

    const agentName = agent.toUpperCase();
    const sid = getOrCreateChatSession(agentName, sessionId);
    saveChatMessage(sid, "user", message);

    const dbAgent = getAgentFromDb(agentName);
    let systemPrompt = dbAgent?.systemPrompt || `You are ${agentName}, a Nirva AI agent.`;
    const targetUrl = (ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const targetQdrant = (qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const tenantId = resolveTenant(req);
    const prefs: OrchestrationPrefs = {
      maxPremiumPercent: typeof maxPremiumPercent === "number" ? maxPremiumPercent : undefined,
      preferSelfHosted: preferSelfHosted !== false,
    };
    const { targetModel, modelRouting } = resolveChatModel({
      message,
      agent: agentName,
      explicitModel: model as string | undefined,
      useOrchestration: useOrchestration !== false,
      tenantId,
      dbAgentModel: dbAgent?.model,
      prefs,
    });

    let memoryContext: string[] = [];
    if (useMemory !== false) {
      try {
        const memories = await searchMemory(agentName, message, 3, {
          qdrantUrl: targetQdrant,
          ollamaUrl: targetUrl,
        });
        const ragContext = buildRagContext(memories);
        if (ragContext) {
          systemPrompt += ragContext;
          memoryContext = memories.map((m) => m.title);
        }
      } catch {
        // RAG is best-effort; continue without memory context
      }
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: "user" as const, content: message },
    ];

    const keys = providerKeysFromBody(req.body);

    try {
      if (!modelRouting) {
        const result = await completeOllamaOnly(messages, targetModel, targetUrl);
        const saved = saveChatMessage(sid, "assistant", result.content, agentName);
        res.json(buildChatResponse(saved, sid, agentName, result, memoryContext, undefined, targetModel));
        return;
      }

      const result = await completeChat({
        decision: modelRouting,
        messages,
        keys,
        ollamaUrl: targetUrl,
        fallbackModel: dbAgent?.model || DEFAULT_MODEL,
      });
      const saved = saveChatMessage(sid, "assistant", result.content, agentName);

      storeConversationMemory(agentName, message, result.content, {
        qdrantUrl: targetQdrant,
        ollamaUrl: targetUrl,
      }).catch(() => {});

      res.json(buildChatResponse(saved, sid, agentName, result, memoryContext, modelRouting, result.model));
    } catch (err) {
      res.status(503).json({
        error: {
          code: "OLLAMA_UNAVAILABLE",
          message: err instanceof Error ? err.message : "Failed to reach Ollama",
        },
        sessionId: sid,
        fallback: true,
        memoryContext,
      });
    }
  });

  // --- Nirva Ecosystem ---
  router.get("/ecosystem", async (_req, res) => {
    const status = await getEcosystemStatus();
    res.json(status);
  });

  router.get("/ecosystem/apps", (_req, res) => {
    res.json({ apps: NIRVA_ECOSYSTEM });
  });

  router.get("/ecosystem/:id", async (req, res) => {
    const app = await getAppStatus(req.params.id);
    if (!app) {
      res.status(404).json({ error: { code: "APP_NOT_FOUND", message: `Ecosystem app '${req.params.id}' not found` } });
      return;
    }
    res.json(app);
  });

  // --- n8n Workflows ---
  router.get("/workflows/templates", (req, res) => {
    const category = req.query.category as string | undefined;
    res.json({ templates: getWorkflowTemplates(category) });
  });

  router.get("/workflows", async (req, res) => {
    const n8nUrl = (req.query.n8nUrl as string) || DEFAULT_N8N_URL;
    const available = await isN8nAvailable(n8nUrl);
    const workflows = available ? await listN8nWorkflows(n8nUrl) : [];
    res.json({
      n8n: available ? "running" : "unavailable",
      workflows,
      templates: WORKFLOW_TEMPLATES,
    });
  });

  router.post("/workflows/:id/run", async (req, res) => {
    const tenantId = resolveTenant(req);
    const n8nUrl = (req.body?.n8nUrl as string) || DEFAULT_N8N_URL;
    const templateId = req.params.id;

    const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      res.status(404).json({ error: { code: "WORKFLOW_NOT_FOUND", message: `Workflow template '${templateId}' not found` } });
      return;
    }

    const logWorkflowAudit = async (status: string) => {
      const { recordAuditEvent } = await import("./enterprise/index.ts");
      const { AUDIT_ACTIONS } = await import("../shared/enterprise.ts");
      const user = getSessionFromRequest(req);
      recordAuditEvent({
        tenantId,
        action: AUDIT_ACTIONS.WORKFLOW_RUN,
        actor: user?.email || "anonymous",
        resource: templateId,
        detail: `${template.name} — ${status}`,
      });
    };

    const available = await isN8nAvailable(n8nUrl);
    if (!available) {
      // Simulate workflow execution when n8n is offline
      const task = createTask({
        title: template.name,
        agent: template.agents[0] || "FLOW",
        description: `Workflow: ${template.description} (simulated — n8n offline)`,
      });
      updateTaskStatus(task.id, "running", 10);
      await logWorkflowAudit("simulated");

      res.json({
        executionId: `sim_${Date.now()}`,
        status: "simulated",
        template,
        task,
        message: "n8n unavailable — workflow queued as task",
      });
      return;
    }

    try {
      const result = await triggerWorkflow(n8nUrl, template.n8nWorkflowId || templateId, req.body?.data);
      const task = createTask({
        title: template.name,
        agent: "FLOW",
        description: template.description,
      });
      await logWorkflowAudit("triggered");
      res.json({ ...result, template, task });
    } catch (err) {
      res.status(503).json({
        error: { code: "WORKFLOW_TRIGGER_FAILED", message: err instanceof Error ? err.message : "Failed to trigger workflow" },
      });
    }
  });

  router.get("/ollama/models", async (req, res) => {
    const ollamaUrl = (req.query.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    try {
      const response = await fetch(`${ollamaUrl.replace(/\/$/, "")}/api/tags`);
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = (await response.json()) as { models: { name: string; size: number; modified_at: string }[] };
      res.json({
        models: data.models.map((m) => ({
          name: m.name,
          size: `${(m.size / 1e9).toFixed(1)} GB`,
          modified: m.modified_at,
        })),
      });
    } catch (err) {
      res.status(503).json({
        error: { code: "OLLAMA_UNAVAILABLE", message: err instanceof Error ? err.message : "Ollama unavailable" },
      });
    }
  });

  router.get("/system/status", async (req, res) => {
    const ollamaUrl = (req.query.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const qdrantUrl = (req.query.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const n8nUrl = (req.query.n8nUrl as string) || DEFAULT_N8N_URL;

    const [ollama, qdrant, n8n] = await Promise.all([
      checkService(ollamaUrl, "/api/tags"),
      checkService(qdrantUrl, "/collections"),
      checkService(n8nUrl, "/healthz"),
    ]);

    const dot = (s: string) => (s === "running" ? "●" : "○");

    res.type("text").send([
      "╭─────────────────────────────────────╮",
      "│  Nirva Ecosystem v0.11 — Status     │",
      "├─────────────────────────────────────┤",
      `│  WebSocket: ● Live (/ws)`.padEnd(38) + "│",
      `│  Database:  ● SQLite (persistent)`.padEnd(38) + "│",
      `│  Memory:    ● Qdrant (vector RAG)`.padEnd(38) + "│",
      `│  Ecosystem: ● Nirva (6 products)`.padEnd(38) + "│",
      `│  Ollama:    ${dot(ollama)} ${ollama === "running" ? "Running" : "Unavailable"}`.padEnd(38) + "│",
      `│  Qdrant:    ${dot(qdrant)} ${qdrant === "running" ? "Running" : "Unavailable"}`.padEnd(38) + "│",
      `│  n8n:       ${dot(n8n)} ${n8n === "running" ? "Running" : "Unavailable"}`.padEnd(38) + "│",
      `│  Agents:    ${AGENT_STATS.total} registered`.padEnd(38) + "│",
      "╰─────────────────────────────────────╯",
    ].join("\n"));
  });

  // ── AI Brain OS (v0.15 foundation) ───────────────────────────────────────
  router.get("/brains", (req, res) => {
    const plan = (req.query.plan as string) || "free";
    const brains = plan === "free" || plan === "pro" || plan === "enterprise"
      ? getBrainsForPlan(plan)
      : AI_BRAINS;
    res.json({ brains, stats: getBrainStats(), plan });
  });

  router.get("/brains/categories", (_req, res) => {
    res.json({ categories: Object.values(BRAIN_CATEGORIES) });
  });

  router.get("/brains/providers", (req, res) => {
    const region = req.query.region as string | undefined;
    const providers = region
      ? GLOBAL_PROVIDERS.filter((p) => p.region === region)
      : GLOBAL_PROVIDERS;
    res.json({ providers, total: providers.length });
  });

  router.get("/brains/pricing", (_req, res) => {
    res.json({ plans: PRICING_PLANS });
  });

  router.post("/brains/plan", (req, res) => {
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "message required" } });
      return;
    }
    res.json(planBrainTeam(message.trim()));
  });

  // ── Provider Hub (v0.17) ───────────────────────────────────────────────────
  router.get("/providers/hub", async (req, res) => {
    const keys = providerKeysFromBody(req.query as Record<string, unknown>);
    const ollamaUrl = (req.query.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const providers = await getProviderHub(keys, ollamaUrl);
    res.json({ providers, configured: providers.filter((p) => p.configured).length });
  });

  router.post("/providers/test", async (req, res) => {
    const { provider, apiKey } = req.body ?? {};
    if (!provider || !apiKey) {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "provider and apiKey required" } });
      return;
    }
    const result = await testProvider(provider as CloudProviderId, apiKey);
    res.json(result);
  });

  // ── Morning Briefing (v0.16) ───────────────────────────────────────────────
  router.get("/morning/briefing", async (req, res) => {
    const { generateMorningBriefing } = await import("./morning/index.ts");
    const tenantId = resolveTenant(req);
    const ollamaUrl = (req.query.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const qdrantUrl = (req.query.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const n8nUrl = (req.query.n8nUrl as string) || DEFAULT_N8N_URL;

    const ping = async (url: string, path: string) => {
      try {
        const r = await fetch(`${url.replace(/\/$/, "")}${path}`, { signal: AbortSignal.timeout(2000) });
        return r.ok ? "online" as const : "offline" as const;
      } catch {
        return "offline" as const;
      }
    };

    const [ollama, qdrant, n8n] = await Promise.all([
      ping(ollamaUrl, "/api/tags"),
      ping(qdrantUrl, "/collections"),
      ping(n8nUrl, "/healthz"),
    ]);

    res.json(generateMorningBriefing({
      tenantId,
      infrastructure: { ollama, qdrant, n8n },
    }));
  });

  router.post("/morning/execute", async (req, res) => {
    const { executeMorningActions } = await import("./morning/index.ts");
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    const role = resolveUserRole(req);
    const ollamaUrl = (req.body?.ollamaUrl as string) || DEFAULT_OLLAMA_URL;
    const qdrantUrl = (req.body?.qdrantUrl as string) || DEFAULT_QDRANT_URL;
    const n8nUrl = (req.body?.n8nUrl as string) || DEFAULT_N8N_URL;

    const ping = async (url: string, path: string) => {
      try {
        const r = await fetch(`${url.replace(/\/$/, "")}${path}`, { signal: AbortSignal.timeout(2000) });
        return r.ok ? "online" as const : "offline" as const;
      } catch {
        return "offline" as const;
      }
    };

    const [ollama, qdrant, n8n] = await Promise.all([
      ping(ollamaUrl, "/api/tags"),
      ping(qdrantUrl, "/collections"),
      ping(n8nUrl, "/healthz"),
    ]);

    const result = executeMorningActions({
      tenantId,
      userRole: role,
      tenantAllowlist: tenant?.agents,
      infrastructure: { ollama, qdrant, n8n },
    });

    const { recordAuditEvent } = await import("./enterprise/index.ts");
    const { AUDIT_ACTIONS } = await import("../shared/enterprise.ts");
    const user = getSessionFromRequest(req);
    recordAuditEvent({
      tenantId,
      action: AUDIT_ACTIONS.MORNING_EXECUTE,
      actor: user?.email || "anonymous",
      resource: "morning",
      detail: `${result.tasksCreated} tasks created`,
    });

    const { broadcastTasksSummary } = await import("./ws/index.ts");
    broadcastTasksSummary();

    res.json(result);
  });

  // ── Coding Workspace (v0.18) ─────────────────────────────────────────────
  router.get("/workspace/pipeline", async (req, res) => {
    const { planWorkspace } = await import("./workspace/index.ts");
    const idea = (req.query.idea as string) || "";
    res.json(planWorkspace(idea));
  });

  router.post("/workspace/plan", async (req, res) => {
    const { planWorkspace } = await import("./workspace/index.ts");
    const { idea } = req.body ?? {};
    if (!idea || typeof idea !== "string") {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "idea required" } });
      return;
    }
    res.json(planWorkspace(idea));
  });

  router.post("/workspace/execute", async (req, res) => {
    const { executeWorkspacePipeline } = await import("./workspace/index.ts");
    const tenantId = resolveTenant(req);
    const { idea, n8nUrl } = req.body ?? {};
    if (!idea || typeof idea !== "string") {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "idea required" } });
      return;
    }
    const result = await executeWorkspacePipeline({
      idea,
      tenantId,
      n8nUrl: (n8nUrl as string) || DEFAULT_N8N_URL,
      userRole: resolveUserRole(req),
    });
    const { recordAuditEvent } = await import("./enterprise/index.ts");
    const { AUDIT_ACTIONS } = await import("../shared/enterprise.ts");
    const user = getSessionFromRequest(req);
    recordAuditEvent({
      tenantId,
      action: AUDIT_ACTIONS.WORKSPACE_EXECUTE,
      actor: user?.email || "anonymous",
      resource: "workspace",
      detail: `Idea: ${idea.slice(0, 120)} — ${result.tasksCreated} tasks`,
    });
    const { broadcastTasksSummary } = await import("./ws/index.ts");
    broadcastTasksSummary();
    res.json(result);
  });

  // ── Enterprise (v1.0) ─────────────────────────────────────────────────────
  router.get("/enterprise/dashboard", async (req, res) => {
    const { getEnterpriseDashboard } = await import("./enterprise/index.ts");
    const tenantId = resolveTenant(req);
    res.json(await getEnterpriseDashboard(tenantId));
  });

  router.get("/enterprise/audit", async (req, res) => {
    const { listAuditLogs } = await import("./enterprise/index.ts");
    const tenantId = resolveTenant(req);
    const limit = parseInt(req.query.limit as string, 10) || 50;
    res.json({ logs: listAuditLogs({ tenantId, limit }) });
  });

  router.get("/enterprise/connectors", async (req, res) => {
    const { getErpConnectors } = await import("./enterprise/index.ts");
    const connectors = await getErpConnectors();
    res.json({ connectors, online: connectors.filter((c) => c.status === "online").length });
  });

  router.get("/enterprise/billing", async (req, res) => {
    const { getBillingSummary } = await import("./enterprise/index.ts");
    const tenantId = resolveTenant(req);
    const tenant = getTenant(tenantId);
    res.json(getBillingSummary(tenantId, tenant?.plan ?? "free"));
  });

  router.get("/enterprise/deploy-templates", async (_req, res) => {
    const { DEPLOYMENT_TEMPLATES } = await import("../shared/enterprise.ts");
    res.json({ templates: DEPLOYMENT_TEMPLATES });
  });

  // ── Obsidian Local REST API integration ────────────────────────────
  router.get("/obsidian/status", async (req, res) => {
    const { isObsidianRunning } = await import("./obsidian/index.ts");
    const baseUrl = (req.query.url as string) || process.env.OBSIDIAN_URL || "http://localhost:27124";
    const apiKey = (req.query.apiKey as string) || process.env.OBSIDIAN_API_KEY || "";
    const running = await isObsidianRunning(baseUrl, apiKey);
    res.json({ running, url: baseUrl });
  });

  router.get("/obsidian/notes", async (req, res) => {
    const { listVaultFiles } = await import("./obsidian/index.ts");
    const baseUrl = (req.query.url as string) || process.env.OBSIDIAN_URL || "http://localhost:27124";
    const apiKey = (req.query.apiKey as string) || process.env.OBSIDIAN_API_KEY || "";
    try {
      const files = await listVaultFiles(baseUrl, apiKey);
      res.json({ files, total: files.length });
    } catch (e) {
      res.status(503).json({ error: { code: "OBSIDIAN_UNAVAILABLE", message: (e as Error).message } });
    }
  });

  router.post("/obsidian/sync", async (req, res) => {
    const { syncVaultToMemory } = await import("./obsidian/index.ts");
    const { url, apiKey, agent, maxFiles } = req.body ?? {};
    const qdrantUrl = DEFAULT_QDRANT_URL;
    const ollamaUrl = DEFAULT_OLLAMA_URL;
    try {
      const result = await syncVaultToMemory({
        baseUrl: url || process.env.OBSIDIAN_URL || "http://localhost:27124",
        apiKey: apiKey || process.env.OBSIDIAN_API_KEY || "",
        agent: agent || "GATHER",
        qdrantUrl,
        ollamaUrl,
        maxFiles: maxFiles ?? 100,
      });
      res.json(result);
    } catch (e) {
      res.status(503).json({ error: { code: "OBSIDIAN_SYNC_FAILED", message: (e as Error).message } });
    }
  });

  router.post("/obsidian/search", async (req, res) => {
    const { searchVault } = await import("./obsidian/index.ts");
    const { query, url, apiKey } = req.body ?? {};
    if (!query) {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "query required" } });
      return;
    }
    try {
      const results = await searchVault(
        query,
        url || process.env.OBSIDIAN_URL || "http://localhost:27124",
        apiKey || process.env.OBSIDIAN_API_KEY || ""
      );
      res.json({ results, total: results.length });
    } catch (e) {
      res.status(503).json({ error: { code: "OBSIDIAN_SEARCH_FAILED", message: (e as Error).message } });
    }
  });

  router.post("/obsidian/write", async (req, res) => {
    const { writeNote } = await import("./obsidian/index.ts");
    const { path, content, url, apiKey } = req.body ?? {};
    if (!path || !content) {
      res.status(400).json({ error: { code: "MISSING_PARAMS", message: "path and content required" } });
      return;
    }
    try {
      await writeNote(
        path,
        content,
        url || process.env.OBSIDIAN_URL || "http://localhost:27124",
        apiKey || process.env.OBSIDIAN_API_KEY || ""
      );
      res.json({ ok: true, path });
    } catch (e) {
      res.status(503).json({ error: { code: "OBSIDIAN_WRITE_FAILED", message: (e as Error).message } });
    }
  });

  return router;
}
