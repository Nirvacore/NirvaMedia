import { loadClientSettings } from "@/hooks/useSettings";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentDetail {
  name: string;
  role: string;
  tier: "self-hosted" | "hybrid" | "cloud";
  category: string;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  model: string;
  description: string;
  useCases: string[];
  status?: string;
}

export interface Task {
  id: string;
  title: string;
  agent: string;
  status: "running" | "queued" | "completed" | "failed";
  progress: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  tenantId?: string;
}

export interface ChatResponse {
  id: string;
  sessionId?: string;
  role: "assistant";
  content: string;
  agent: string;
  source: "ollama" | "mock" | "router" | "openai" | "anthropic" | "google" | "deepseek" | "mistral";
  timestamp: string;
  memoryContext?: string[];
  model?: string;
  modelRouting?: {
    recommendedTier: "free" | "low_cost" | "premium";
    model: { id: string; name: string; tier: string };
    reasoningTh: string;
    estimatedCostUsd: number;
  };
}

export interface MemoryEntry {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  qdrantPointId?: string | null;
  createdAt: string;
  updatedAt: string;
  embeddingSource?: string;
}

export interface MemorySearchResult {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  score: number;
  createdAt: string;
}

export interface MemoryStats {
  qdrant: string;
  collection: string;
  pointsCount: number;
  status: string;
}

export interface ChatHistoryResponse {
  sessionId: string | null;
  messages: { id: string; role: string; content: string; agent?: string; createdAt: string }[];
}

const API_BASE = "/api";

function tenantHeaders(): Record<string, string> {
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("nirva_tenant_id") : null;
  return tenantId ? { "X-Tenant-Id": tenantId } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...tenantHeaders(), ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || res.statusText);
  }
  return res.json();
}

export async function fetchHealth() {
  const s = loadClientSettings();
  const params = new URLSearchParams({ ollamaUrl: s.ollamaUrl, qdrantUrl: s.qdrantUrl, n8nUrl: s.n8nUrl });
  return apiFetch(`/health?${params}`);
}

export async function fetchSystemStatus(): Promise<string> {
  const s = loadClientSettings();
  const params = new URLSearchParams({ ollamaUrl: s.ollamaUrl, qdrantUrl: s.qdrantUrl, n8nUrl: s.n8nUrl });
  const res = await fetch(`${API_BASE}/system/status?${params}`);
  return res.text();
}

export async function fetchAgentDetail(name: string): Promise<AgentDetail> {
  return apiFetch(`/agents/${encodeURIComponent(name.toUpperCase())}`);
}

export async function updateAgentDetail(name: string, updates: Partial<AgentDetail>): Promise<AgentDetail> {
  return apiFetch(`/agents/${encodeURIComponent(name.toUpperCase())}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function fetchAgentStats() {
  return apiFetch<{ total: number; selfHosted: number; hybrid: number; cloud: number }>("/agents/stats");
}

export async function fetchOllamaModels() {
  const s = loadClientSettings();
  return apiFetch<{ models: { name: string; size: string; modified: string }[] }>(
    `/ollama/models?ollamaUrl=${encodeURIComponent(s.ollamaUrl)}`
  );
}

export async function fetchTasks(status?: string): Promise<{ tasks: Task[] }> {
  const q = status && status !== "all" ? `?status=${status}` : "";
  return apiFetch(`/tasks${q}`);
}

export async function createTask(data: { title: string; agent: string; description?: string }): Promise<Task> {
  return apiFetch("/tasks", { method: "POST", body: JSON.stringify(data) });
}

export async function retryTask(id: string): Promise<Task> {
  return apiFetch(`/tasks/${id}/retry`, { method: "POST" });
}

export async function pauseTask(id: string): Promise<Task> {
  return apiFetch(`/tasks/${id}/pause`, { method: "POST" });
}

export async function deleteTaskApi(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}`, { method: "DELETE" });
}

export async function fetchChatHistory(agent: string): Promise<ChatHistoryResponse> {
  return apiFetch(`/chat/history?agent=${encodeURIComponent(agent)}`);
}

export async function sendChatMessage(
  message: string,
  agent: string,
  history: ChatMessage[] = [],
  sessionId?: string | null
): Promise<ChatResponse> {
  const s = loadClientSettings();
  const body: Record<string, unknown> = {
    message,
    agent,
    sessionId,
    ollamaUrl: s.ollamaUrl,
    qdrantUrl: s.qdrantUrl,
    history: history.filter((m) => m.role !== "system").slice(-10),
    useMemory: true,
    useOrchestration: s.useOrchestration,
    maxPremiumPercent: s.maxPremiumPercent,
    preferSelfHosted: s.preferSelfHosted,
  };
  if (!s.useOrchestration) {
    body.model = s.defaultModel;
  }
  if (s.openaiApiKey) body.openaiApiKey = s.openaiApiKey;
  if (s.anthropicApiKey) body.anthropicApiKey = s.anthropicApiKey;
  if (s.googleApiKey) body.googleApiKey = s.googleApiKey;
  if (s.deepseekApiKey) body.deepseekApiKey = s.deepseekApiKey;
  if (s.mistralApiKey) body.mistralApiKey = s.mistralApiKey;
  return apiFetch("/chat", { method: "POST", body: JSON.stringify(body) });
}

export async function fetchMemoryStats(): Promise<MemoryStats> {
  const s = loadClientSettings();
  return apiFetch(`/memory/stats?qdrantUrl=${encodeURIComponent(s.qdrantUrl)}`);
}

export async function fetchMemories(agent?: string): Promise<{ memories: MemoryEntry[] }> {
  const q = agent ? `?agent=${encodeURIComponent(agent)}` : "";
  return apiFetch(`/memory${q}`);
}

export async function addMemoryEntry(data: {
  agent: string;
  content: string;
  title?: string;
  source?: string;
}): Promise<MemoryEntry> {
  const s = loadClientSettings();
  return apiFetch("/memory", {
    method: "POST",
    body: JSON.stringify({ ...data, qdrantUrl: s.qdrantUrl, ollamaUrl: s.ollamaUrl }),
  });
}

export async function searchMemoryApi(
  agent: string,
  query: string,
  limit = 5
): Promise<{ results: MemorySearchResult[] }> {
  const s = loadClientSettings();
  return apiFetch("/memory/search", {
    method: "POST",
    body: JSON.stringify({ agent, query, limit, qdrantUrl: s.qdrantUrl, ollamaUrl: s.ollamaUrl }),
  });
}

export async function deleteMemoryEntry(id: string): Promise<void> {
  const s = loadClientSettings();
  await apiFetch(`/memory/${id}?qdrantUrl=${encodeURIComponent(s.qdrantUrl)}`, { method: "DELETE" });
}

export interface EcosystemAppStatus {
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

export interface EcosystemResponse {
  apps: EcosystemAppStatus[];
  infrastructure: { id: string; name: string; desc: string; status: "online" | "offline"; url: string }[];
  summary: { total: number; online: number; products: number };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  agents: string[];
  steps: { agent: string; action: string; duration: string }[];
  category: string;
}

export interface WorkflowsResponse {
  n8n: string;
  workflows: { id: string; name: string; active: boolean; createdAt: string; updatedAt: string; tags: string[] }[];
  templates: WorkflowTemplate[];
}

export async function fetchEcosystem(): Promise<EcosystemResponse> {
  return apiFetch("/ecosystem");
}

export async function fetchWorkflows(): Promise<WorkflowsResponse> {
  const s = loadClientSettings();
  return apiFetch(`/workflows?n8nUrl=${encodeURIComponent(s.n8nUrl)}`);
}

export interface MarketplaceListing {
  id: string;
  agentName: string;
  title: string;
  description: string;
  author: string;
  authorId: string | null;
  tags: string[];
  config: {
    name: string;
    role: string;
    tier: string;
    category: string;
    systemPrompt: string;
    capabilities: string[];
    tools: string[];
    model: string;
    description: string;
    useCases: string[];
  };
  downloads: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceResponse {
  listings: MarketplaceListing[];
  stats: { total: number; totalDownloads: number; featuredCount: number };
}

export async function fetchMarketplace(params?: { search?: string; tag?: string; featured?: boolean }): Promise<MarketplaceResponse> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.tag) q.set("tag", params.tag);
  if (params?.featured) q.set("featured", "true");
  const query = q.toString();
  return apiFetch(`/marketplace${query ? `?${query}` : ""}`);
}

export async function importMarketplacePack(id: string) {
  return apiFetch<{ agent: AgentDetail; listing: MarketplaceListing }>(`/marketplace/${id}/import`, { method: "POST" });
}

export async function rateMarketplacePack(id: string, stars: number) {
  return apiFetch<MarketplaceListing>(`/marketplace/${id}/rate`, {
    method: "POST",
    body: JSON.stringify({ stars }),
  });
}

export async function publishMarketplacePack(data: { agentName: string; title: string; description?: string; tags?: string[] }) {
  return apiFetch<MarketplaceListing>("/marketplace", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function exportAgentPack(agentName: string) {
  return apiFetch<{ pack: MarketplaceListing["config"] }>(`/marketplace/export/${encodeURIComponent(agentName)}`);
}

export async function importAgentPackJson(pack: unknown) {
  return apiFetch<{ agent: AgentDetail }>("/marketplace/import-json", {
    method: "POST",
    body: JSON.stringify({ pack }),
  });
}

export interface OrgCompany {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  departments: {
    id: string;
    name: string;
    description: string;
    agents: { blueprintRole: string; agent: string; skills: string[]; modelTier: string; model: string }[];
  }[];
}

export interface OrganizationResponse {
  controlTower: { agent: string; blueprintRole: string; responsibilities: string[] }[];
  companies: OrgCompany[];
  pipelines: { id: string; label: string; labelTh: string; keywords: string[]; agents: string[]; companyId: string }[];
  modelStrategy: { opensource: { label: string; models: string[]; useFor: string[] }; premium: { label: string; models: string[]; useFor: string[] }; principle: string };
  businessTiers: { id: string; name: string; description: string }[];
  summary: {
    totalCompanies: number;
    totalDepartments: number;
    uniqueOrgAgents: number;
    registryAgents: number;
    intentPipelines: number;
  };
}

export interface RouteAnalysis {
  intent: string;
  intentLabel: string;
  intentLabelTh: string;
  confidence: number;
  companyId: string;
  companyName: string;
  agents: string[];
  workflowId?: string;
  description: string;
  blockedAgents: { agent: string; reason: string }[];
}

export interface OrganizationReport {
  generatedAt: string;
  summary: {
    totalAgents: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    memoryEntries: number;
    routedPipelineTasks: number;
  };
  tasks: {
    completed: number;
    running: number;
    queued: number;
    failed: number;
    recent: Task[];
  };
  issues: { id: string; title: string; agent: string; description: string; severity: string }[];
  nextSteps: { id: string; action: string; agent: string; status: string }[];
  topAgents: { agent: string; taskCount: number }[];
}

export async function fetchOrganization(): Promise<OrganizationResponse> {
  return apiFetch("/organization");
}

export async function analyzeRoute(message: string): Promise<RouteAnalysis & { userRole: string }> {
  return apiFetch("/router/analyze", { method: "POST", body: JSON.stringify({ message }) });
}

export async function executeRoute(message: string): Promise<{
  runId: string;
  analysis: RouteAnalysis;
  tasks: Task[];
  status: string;
  message: string;
}> {
  return apiFetch("/router/execute", { method: "POST", body: JSON.stringify({ message }) });
}

export async function sendTowerMessage(message: string, sessionId?: string | null) {
  const s = loadClientSettings();
  const body: Record<string, unknown> = {
    message,
    sessionId,
    ollamaUrl: s.ollamaUrl,
    qdrantUrl: s.qdrantUrl,
    useOrchestration: s.useOrchestration,
    maxPremiumPercent: s.maxPremiumPercent,
    preferSelfHosted: s.preferSelfHosted,
  };
  if (!s.useOrchestration) {
    body.model = s.defaultModel;
  }
  if (s.openaiApiKey) body.openaiApiKey = s.openaiApiKey;
  if (s.anthropicApiKey) body.anthropicApiKey = s.anthropicApiKey;
  if (s.googleApiKey) body.googleApiKey = s.googleApiKey;
  if (s.deepseekApiKey) body.deepseekApiKey = s.deepseekApiKey;
  if (s.mistralApiKey) body.mistralApiKey = s.mistralApiKey;
  return apiFetch<ChatResponse & {
    routing?: RouteAnalysis;
    tasks?: Task[];
    runId?: string;
  }>("/chat/tower", { method: "POST", body: JSON.stringify(body) });
}

export interface OrchestrationCost {
  period: string;
  freePercent: number;
  lowCostPercent: number;
  premiumPercent: number;
  totalCostUsd: number;
  totalCalls: number;
  savingsPercent: number;
}

export async function fetchOrchestrationCost(): Promise<OrchestrationCost> {
  return apiFetch("/orchestration/cost");
}

export async function fetchReports(): Promise<OrganizationReport> {
  return apiFetch("/reports");
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise" | "impact";
  description: string;
  maxAgents: number;
  agentCount?: number;
  agents?: string[];
  limits?: { maxAgents: number; plugins: number; label: string };
}

export interface AgentPlugin {
  id: string;
  tenantId: string;
  pluginKey: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  agents: string[];
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
}

export async function fetchTenants(): Promise<{ tenants: Tenant[] }> {
  return apiFetch("/tenants");
}

export async function fetchCurrentTenant(tenantId?: string): Promise<Tenant> {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  return apiFetch(`/tenants/current${q}`);
}

export async function fetchPlugins(): Promise<{
  installed: AgentPlugin[];
  catalog: { key: string; name: string; description: string; type: string; icon: string }[];
  builtin: { key: string; name: string; description: string; type: string }[];
}> {
  return apiFetch("/plugins");
}

export async function installPlugin(pluginKey: string, agents?: string[]) {
  return apiFetch<AgentPlugin>("/plugins/install", {
    method: "POST",
    body: JSON.stringify({ pluginKey, agents }),
  });
}

export async function togglePlugin(id: string, enabled: boolean) {
  return apiFetch<AgentPlugin>(`/plugins/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function invokePlugin(id: string, agent?: string, data?: Record<string, unknown>) {
  return apiFetch<{ success: boolean; message: string; output: unknown }>(`/plugins/${id}/invoke`, {
    method: "POST",
    body: JSON.stringify({ agent, data }),
  });
}

export async function runWorkflow(templateId: string, data?: Record<string, unknown>) {
  const s = loadClientSettings();
  return apiFetch(`/workflows/${templateId}/run`, {
    method: "POST",
    body: JSON.stringify({ n8nUrl: s.n8nUrl, data }),
  });
}

// ── Obsidian ────────────────────────────────────────────────────────────────

export interface ObsidianSearchResult {
  path: string;
  score: number;
  excerpt: string;
}

export interface ObsidianSyncResult {
  indexed: number;
  skipped: number;
  errors?: string[];
}

function obsidianCreds(url?: string, apiKey?: string) {
  const s = loadClientSettings();
  return { url: url ?? s.obsidianUrl, apiKey: apiKey ?? s.obsidianApiKey };
}

export async function fetchObsidianStatus(url?: string, apiKey?: string) {
  const { url: u, apiKey: k } = obsidianCreds(url, apiKey);
  const params = new URLSearchParams({ url: u, apiKey: k });
  return apiFetch<{ running: boolean; url: string }>(`/obsidian/status?${params}`);
}

export async function fetchObsidianNotes(url?: string, apiKey?: string) {
  const { url: u, apiKey: k } = obsidianCreds(url, apiKey);
  const params = new URLSearchParams({ url: u, apiKey: k });
  return apiFetch<{ files: string[]; total: number }>(`/obsidian/notes?${params}`);
}

export async function searchObsidianVault(query: string, url?: string, apiKey?: string) {
  const { url: u, apiKey: k } = obsidianCreds(url, apiKey);
  return apiFetch<{ results: ObsidianSearchResult[]; total: number }>("/obsidian/search", {
    method: "POST",
    body: JSON.stringify({ query, url: u, apiKey: k }),
  });
}

export async function syncObsidianVault(opts?: { agent?: string; maxFiles?: number; url?: string; apiKey?: string }) {
  const { url: u, apiKey: k } = obsidianCreds(opts?.url, opts?.apiKey);
  return apiFetch<ObsidianSyncResult>("/obsidian/sync", {
    method: "POST",
    body: JSON.stringify({ url: u, apiKey: k, agent: opts?.agent ?? "GATHER", maxFiles: opts?.maxFiles ?? 100 }),
  });
}

// ── Morning Briefing (v0.16) ──────────────────────────────────────────────────

export interface MorningBriefing {
  generatedAt: string;
  greeting: string;
  greetingTh: string;
  todayTasks: { id: string; title: string; agent: string; status: string; progress: number }[];
  priorities: { id: string; action: string; agent: string; status: string }[];
  issues: { id: string; title: string; agent: string; severity: string }[];
  companyPulse: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    memoryEntries: number;
    totalAgents: number;
  };
  infrastructure: { ollama: string; qdrant: string; n8n: string };
  brainTeam: {
    intent: string;
    intentTh: string;
    agents: string[];
    categories: string[];
  };
  summaryTh: string;
  summaryEn: string;
}

export interface MorningExecuteResult {
  ok: boolean;
  message: string;
  messageTh: string;
  briefing: MorningBriefing;
  tasksCreated: number;
  tasks: { id: string; title: string; agent: string; status: string }[];
  runId?: string;
}

export async function fetchMorningBriefing(infra?: { ollama: string; qdrant: string; n8n: string }) {
  const s = loadClientSettings();
  const params = new URLSearchParams({
    ollamaUrl: infra?.ollama ?? s.ollamaUrl,
    qdrantUrl: infra?.qdrant ?? s.qdrantUrl,
    n8nUrl: infra?.n8n ?? s.n8nUrl,
  });
  return apiFetch<MorningBriefing>(`/morning/briefing?${params}`);
}

export async function executeMorningActions(infra?: { ollama: string; qdrant: string; n8n: string }) {
  const s = loadClientSettings();
  return apiFetch<MorningExecuteResult>("/morning/execute", {
    method: "POST",
    body: JSON.stringify({
      ollamaUrl: infra?.ollama ?? s.ollamaUrl,
      qdrantUrl: infra?.qdrant ?? s.qdrantUrl,
      n8nUrl: infra?.n8n ?? s.n8nUrl,
    }),
  });
}

// ── Provider Hub (v0.17) ──────────────────────────────────────────────────────

export interface ProviderHubEntry {
  id: string;
  name: string;
  region: string;
  models: string[];
  configured: boolean;
  status: "online" | "offline" | "unconfigured";
  envKey: string;
}

export async function fetchProviderHub() {
  const s = loadClientSettings();
  const params = new URLSearchParams({ ollamaUrl: s.ollamaUrl });
  if (s.openaiApiKey) params.set("openaiApiKey", s.openaiApiKey);
  if (s.anthropicApiKey) params.set("anthropicApiKey", s.anthropicApiKey);
  if (s.googleApiKey) params.set("googleApiKey", s.googleApiKey);
  if (s.deepseekApiKey) params.set("deepseekApiKey", s.deepseekApiKey);
  if (s.mistralApiKey) params.set("mistralApiKey", s.mistralApiKey);
  return apiFetch<{ providers: ProviderHubEntry[]; configured: number }>(`/providers/hub?${params}`);
}

export async function testProviderApi(provider: string, apiKey: string) {
  return apiFetch<{ ok: boolean; message: string }>("/providers/test", {
    method: "POST",
    body: JSON.stringify({ provider, apiKey }),
  });
}

// ── Coding Workspace (v0.18) ──────────────────────────────────────────────────

export interface WorkspaceStage {
  id: string;
  label: string;
  labelTh: string;
  agents: string[];
  action: string;
  actionTh: string;
  duration: string;
  status: string;
}

export interface WorkspacePipeline {
  idea: string;
  generatedAt: string;
  workflowId: string;
  stages: WorkspaceStage[];
  brainTeam: {
    intent: string;
    intentTh: string;
    agents: string[];
    categories: string[];
  };
  summaryTh: string;
  summaryEn: string;
}

export interface WorkspaceExecuteResult {
  ok: boolean;
  message: string;
  messageTh: string;
  pipeline: WorkspacePipeline;
  tasksCreated: number;
  tasks: { id: string; title: string; agent: string; status: string; stageId: string }[];
  workflowStatus: string;
  executionId?: string;
  runId: string;
}

export async function planWorkspacePipeline(idea: string) {
  return apiFetch<WorkspacePipeline>("/workspace/plan", {
    method: "POST",
    body: JSON.stringify({ idea }),
  });
}

export async function executeWorkspacePipeline(idea: string) {
  const s = loadClientSettings();
  return apiFetch<WorkspaceExecuteResult>("/workspace/execute", {
    method: "POST",
    body: JSON.stringify({ idea, n8nUrl: s.n8nUrl }),
  });
}

// ── Enterprise (v1.0) ───────────────────────────────────────────────────────

export interface EnterpriseDashboard {
  generatedAt: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  sso: { enabled: boolean; provider: string; ssoReady: boolean; portalUrl?: string };
  billing: {
    plan: string;
    planLabel: string;
    maxAgents: number;
    maxPlugins: number;
    todayCostUsd: number;
    todayRequests: number;
    premiumPercent: number;
    billingProvider: string;
    stripeConfigured: boolean;
  };
  connectors: { id: string; name: string; tagline: string; agents: string[]; url: string; status: string; envKey?: string }[];
  connectorsOnline: number;
  deploymentTemplates: { id: string; name: string; nameTh: string; description: string; target: string; path: string; command: string }[];
  recentAudit: { id: string; action: string; actor: string; resource: string; detail: string; severity: string; createdAt: string }[];
  features: Record<string, boolean>;
}

export async function fetchEnterpriseDashboard() {
  return apiFetch<EnterpriseDashboard>("/enterprise/dashboard");
}

export async function fetchEnterpriseAudit(limit = 50) {
  return apiFetch<{ logs: EnterpriseDashboard["recentAudit"] }>(`/enterprise/audit?limit=${limit}`);
}
