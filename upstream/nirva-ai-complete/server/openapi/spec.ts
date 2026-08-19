import { INTENT_PIPELINES } from "../../shared/organization.ts";
import { BUILTIN_PLUGINS } from "../../shared/plugins.ts";
import { SEED_TENANTS } from "../../shared/tenants.ts";

const API_VERSION = "0.11.0";

const pipelineIds = INTENT_PIPELINES.map((p) => p.id);

export function getOpenApiSpec(baseUrl = "/api") {
  return {
    openapi: "3.1.0",
    info: {
      title: "Nirva AI Core Dashboard API",
      version: API_VERSION,
      description:
        "REST API for the Nirva AI Company Operating System — 109 agents, multi-tenant organizations, agent router, plugins, and ecosystem integrations.",
      contact: { name: "Nirvacore", url: "https://github.com/Nirvacore/nirva-AI" },
    },
    servers: [{ url: baseUrl, description: "API base path" }],
    tags: [
      { name: "Health", description: "Service health and metrics" },
      { name: "Auth", description: "OAuth and session management" },
      { name: "Tenants", description: "Multi-tenant organizations" },
      { name: "Plugins", description: "Agent plugin system" },
      { name: "Organization", description: "AI Organization Blueprint" },
      { name: "Router", description: "Intent analysis and pipeline routing" },
      { name: "Agents", description: "109-agent registry" },
      { name: "Tasks", description: "Task queue" },
      { name: "Chat", description: "Ollama chat and Control Tower" },
      { name: "Memory", description: "Qdrant vector memory" },
      { name: "Marketplace", description: "Agent configuration packs" },
      { name: "Workflows", description: "n8n workflow orchestration" },
      { name: "Ecosystem", description: "Nirva product ecosystem" },
    ],
    components: {
      securitySchemes: {
        sessionCookie: { type: "apiKey", in: "cookie", name: "nirva_session" },
        tenantHeader: { type: "apiKey", in: "header", name: "X-Tenant-Id" },
      },
      parameters: {
        TenantId: {
          name: "X-Tenant-Id",
          in: "header",
          schema: { type: "string" },
          description: "Organization tenant ID (also via cookie or ?tenantId=)",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        Health: {
          type: "object",
          properties: {
            status: { type: "string", example: "healthy" },
            version: { type: "string", example: API_VERSION },
            timestamp: { type: "string", format: "date-time" },
            services: { type: "object" },
          },
        },
        RouteAnalysis: {
          type: "object",
          properties: {
            intent: { type: "string", enum: pipelineIds },
            intentLabel: { type: "string" },
            intentLabelTh: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            classifierMethod: { type: "string", enum: ["keyword", "llm"] },
            classifierReasoning: { type: "string" },
            companyId: { type: "string" },
            companyName: { type: "string" },
            agents: { type: "array", items: { type: "string" } },
            workflowId: { type: "string" },
            description: { type: "string" },
            blockedAgents: {
              type: "array",
              items: {
                type: "object",
                properties: { agent: { type: "string" }, reason: { type: "string" } },
              },
            },
          },
        },
        Tenant: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            plan: { type: "string", enum: ["free", "pro", "enterprise"] },
            agentCount: { type: "integer" },
          },
        },
        Plugin: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            type: { type: "string" },
            enabled: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            "200": {
              description: "Service health",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } },
            },
          },
        },
      },
      "/metrics": {
        get: {
          tags: ["Health"],
          summary: "Request metrics and uptime",
          responses: { "200": { description: "Metrics payload" } },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current session",
          responses: { "200": { description: "Auth state" } },
        },
      },
      "/auth/login": {
        get: { tags: ["Auth"], summary: "Start OAuth login", responses: { "302": { description: "Redirect to OAuth portal" } } },
      },
      "/auth/demo-login": {
        post: { tags: ["Auth"], summary: "Demo login (dev only)", responses: { "200": { description: "Session created" } } },
      },
      "/auth/logout": {
        post: { tags: ["Auth"], summary: "End session", responses: { "200": { description: "Logged out" } } },
      },
      "/tenants": {
        get: {
          tags: ["Tenants"],
          summary: "List organizations",
          responses: {
            "200": {
              description: "Tenant list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { tenants: { type: "array", items: { $ref: "#/components/schemas/Tenant" } } },
                  },
                },
              },
            },
          },
        },
        post: { tags: ["Tenants"], summary: "Create organization", responses: { "201": { description: "Tenant created" } } },
      },
      "/tenants/current": {
        get: {
          tags: ["Tenants"],
          summary: "Resolve current tenant",
          parameters: [{ $ref: "#/components/parameters/TenantId" }],
          responses: { "200": { description: "Current tenant" } },
        },
      },
      "/plugins": {
        get: {
          tags: ["Plugins"],
          summary: "List installed plugins",
          parameters: [{ $ref: "#/components/parameters/TenantId" }],
          responses: { "200": { description: "Plugin catalog" } },
        },
      },
      "/plugins/install": {
        post: {
          tags: ["Plugins"],
          summary: "Install a built-in plugin",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pluginId"],
                  properties: { pluginId: { type: "string", enum: BUILTIN_PLUGINS.map((p) => p.key) } },
                },
              },
            },
          },
          responses: { "201": { description: "Plugin installed" } },
        },
      },
      "/plugins/{id}/invoke": {
        post: {
          tags: ["Plugins"],
          summary: "Invoke plugin action",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Invocation result" } },
        },
      },
      "/organization": {
        get: { tags: ["Organization"], summary: "Organization blueprint summary", responses: { "200": { description: "8 AI companies" } } },
      },
      "/router/analyze": {
        post: {
          tags: ["Router"],
          summary: "Analyze user intent and select pipeline",
          parameters: [{ $ref: "#/components/parameters/TenantId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string", example: "สร้างระบบขายออนไลน์" },
                    useLLM: { type: "boolean", default: false, description: "Use Ollama LLM classifier (falls back to keywords)" },
                    ollamaUrl: { type: "string" },
                    model: { type: "string", example: "llama3.1:8b" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Route analysis",
              content: { "application/json": { schema: { $ref: "#/components/schemas/RouteAnalysis" } } },
            },
          },
        },
      },
      "/router/execute": {
        post: {
          tags: ["Router"],
          summary: "Execute pipeline and create tasks",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string" },
                    createTasks: { type: "boolean", default: true },
                    useLLM: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Execution result with tasks" } },
        },
      },
      "/router/classifier": {
        get: {
          tags: ["Router"],
          summary: "Classifier capabilities and pipeline list",
          responses: { "200": { description: "Classifier info" } },
        },
      },
      "/agents": {
        get: {
          tags: ["Agents"],
          summary: "List agents (tenant-scoped)",
          parameters: [
            { $ref: "#/components/parameters/TenantId" },
            { name: "tier", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Agent list" } },
        },
      },
      "/agents/stats": {
        get: { tags: ["Agents"], summary: "Agent count by tier", responses: { "200": { description: "Stats" } } },
      },
      "/agents/{name}": {
        get: {
          tags: ["Agents"],
          summary: "Agent detail",
          parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Full agent profile" } },
        },
      },
      "/tasks": {
        get: { tags: ["Tasks"], summary: "List tasks", responses: { "200": { description: "Task queue" } } },
        post: { tags: ["Tasks"], summary: "Create task", responses: { "201": { description: "Task created" } } },
      },
      "/chat": {
        post: {
          tags: ["Chat"],
          summary: "Chat with agent via Ollama",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string" },
                    agent: { type: "string", default: "DESK" },
                    model: { type: "string" },
                    useMemory: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Chat response" } },
        },
      },
      "/chat/tower": {
        post: { tags: ["Chat"], summary: "Control Tower routing chat", responses: { "200": { description: "Tower response" } } },
      },
      "/memory": {
        get: { tags: ["Memory"], summary: "List memories", responses: { "200": { description: "Memory entries" } } },
        post: { tags: ["Memory"], summary: "Store memory", responses: { "201": { description: "Memory stored" } } },
      },
      "/memory/search": {
        post: { tags: ["Memory"], summary: "Semantic search", responses: { "200": { description: "Search results" } } },
      },
      "/marketplace": {
        get: { tags: ["Marketplace"], summary: "Browse agent packs", responses: { "200": { description: "Listings" } } },
        post: { tags: ["Marketplace"], summary: "Publish pack", responses: { "201": { description: "Published" } } },
      },
      "/workflows/templates": {
        get: { tags: ["Workflows"], summary: "Workflow templates", responses: { "200": { description: "Templates" } } },
      },
      "/workflows/{id}/run": {
        post: {
          tags: ["Workflows"],
          summary: "Trigger workflow",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Workflow run" } },
        },
      },
      "/ecosystem": {
        get: { tags: ["Ecosystem"], summary: "Ecosystem overview", responses: { "200": { description: "Products and health" } } },
      },
      "/reports": {
        get: { tags: ["Organization"], summary: "Organization reports", responses: { "200": { description: "Report dashboard data" } } },
      },
      "/ollama/models": {
        get: { tags: ["Chat"], summary: "List Ollama models", responses: { "200": { description: "Model tags" } } },
      },
    },
    "x-tenant-seeds": SEED_TENANTS.map((t) => ({ id: t.id, name: t.name, plan: t.plan })),
  };
}

export const OPENAPI_VERSION = API_VERSION;
