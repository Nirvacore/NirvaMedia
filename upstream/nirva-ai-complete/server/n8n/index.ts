export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  agents: string[];
  steps: { agent: string; action: string; duration: string }[];
  category: string;
  n8nWorkflowId?: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "code-arch-ship",
    name: "CODE → ARCH → SHIP",
    description: "Full development pipeline: generate code, review architecture, deploy",
    agents: ["CODE", "ARCH", "FLOW"],
    steps: [
      { agent: "DESK", action: "Receive request & route", duration: "0.5s" },
      { agent: "CODE", action: "Generate implementation", duration: "5-30s" },
      { agent: "ARCH", action: "Review system design", duration: "2-5s" },
      { agent: "FLOW", action: "Deploy via n8n pipeline", duration: "10-60s" },
    ],
    category: "development",
  },
  {
    id: "procurement-approval",
    name: "Procurement Approval Flow",
    description: "Nirvaprocure: TOR analysis → pricing → LINE approval",
    agents: ["READ", "PRICE", "REACH"],
    steps: [
      { agent: "READ", action: "Analyze TOR document", duration: "3-10s" },
      { agent: "PRICE", action: "Cost analysis & pricing", duration: "2-5s" },
      { agent: "REACH", action: "Draft proposal & send LINE", duration: "1-3s" },
    ],
    category: "nirvaprocure",
  },
  {
    id: "content-pipeline",
    name: "Content Production Pipeline",
    description: "NirvaMedia: research → write → SEO optimize → publish",
    agents: ["GATHER", "SEO-CONTENT", "PHOTON"],
    steps: [
      { agent: "GATHER", action: "Scout & organize content", duration: "2-5s" },
      { agent: "SEO-CONTENT", action: "Write SEO-optimized article", duration: "10-30s" },
      { agent: "PHOTON", action: "Generate visuals & publish", duration: "5-15s" },
    ],
    category: "nirvamedia",
  },
  {
    id: "rag-knowledge-base",
    name: "RAG Knowledge Base Builder",
    description: "RAG-BUILDER: ingest documents → embed → store in Qdrant",
    agents: ["RAG-BUILDER", "ARCH"],
    steps: [
      { agent: "RAG-BUILDER", action: "Parse & chunk documents", duration: "2-10s" },
      { agent: "RAG-BUILDER", action: "Generate embeddings via Ollama", duration: "5-20s" },
      { agent: "ARCH", action: "Store in Qdrant collection", duration: "1-3s" },
    ],
    category: "memory",
  },
  {
    id: "daily-briefing",
    name: "Daily Briefing",
    description: "DESK family: aggregate tasks, calendar, and send morning brief",
    agents: ["BRIEF", "SCHED", "DESK"],
    steps: [
      { agent: "SCHED", action: "Check calendar & deadlines", duration: "1-2s" },
      { agent: "BRIEF", action: "Summarize priorities", duration: "2-5s" },
      { agent: "DESK", action: "Deliver briefing to user", duration: "0.5s" },
    ],
    category: "operations",
  },
  {
    id: "ecosystem-health",
    name: "Ecosystem Health Check",
    description: "Monitor all Nirva ecosystem apps and infrastructure",
    agents: ["FLOW", "DESK"],
    steps: [
      { agent: "FLOW", action: "Ping all ecosystem endpoints", duration: "2-5s" },
      { agent: "DESK", action: "Report status summary", duration: "0.5s" },
    ],
    category: "ecosystem",
  },
];

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export async function listN8nWorkflows(n8nUrl: string): Promise<N8nWorkflow[]> {
  try {
    const res = await fetch(`${n8nUrl.replace(/\/$/, "")}/api/v1/workflows`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    const data = (await res.json()) as { data: { id: string; name: string; active: boolean; createdAt: string; updatedAt: string; tags?: { name: string }[] }[] };
    return data.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      tags: (w.tags || []).map((t) => t.name),
    }));
  } catch {
    return [];
  }
}

export async function isN8nAvailable(n8nUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${n8nUrl.replace(/\/$/, "")}/healthz`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerWorkflow(
  n8nUrl: string,
  workflowId: string,
  data?: Record<string, unknown>
): Promise<{ executionId: string; status: string }> {
  const res = await fetch(`${n8nUrl.replace(/\/$/, "")}/api/v1/workflows/${workflowId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowData: data || {} }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n trigger failed: ${text}`);
  }

  const result = (await res.json()) as { executionId?: string; id?: string };
  return {
    executionId: result.executionId || result.id || `exec_${Date.now()}`,
    status: "running",
  };
}

export function getWorkflowTemplates(category?: string): WorkflowTemplate[] {
  if (!category || category === "all") return WORKFLOW_TEMPLATES;
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}
