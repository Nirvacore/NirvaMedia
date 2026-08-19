/**
 * Plugin system — custom tools and integrations per agent.
 */

export type PluginType = "webhook" | "http" | "task" | "memory" | "notify";

export interface PluginDefinition {
  key: string;
  name: string;
  description: string;
  type: PluginType;
  icon: string;
  defaultConfig: Record<string, unknown>;
  /** Agents this plugin can attach to; empty = any */
  compatibleAgents?: string[];
}

export const BUILTIN_PLUGINS: PluginDefinition[] = [
  {
    key: "webhook-trigger",
    name: "Webhook Trigger",
    description: "POST events to an external webhook URL when agent completes a task",
    type: "webhook",
    icon: "webhook",
    defaultConfig: { url: "", method: "POST", headers: {} },
    compatibleAgents: ["FLOW", "DESK", "SHIP"],
  },
  {
    key: "http-fetch",
    name: "HTTP Fetch",
    description: "Fetch data from external APIs and inject into agent context",
    type: "http",
    icon: "globe",
    defaultConfig: { url: "", method: "GET" },
    compatibleAgents: ["NET", "CODE", "DEEP"],
  },
  {
    key: "task-creator",
    name: "Task Creator",
    description: "Automatically create follow-up tasks in the Nirva task queue",
    type: "task",
    icon: "list",
    defaultConfig: { defaultAgent: "DESK" },
    compatibleAgents: ["DESK", "FLOW"],
  },
  {
    key: "memory-writer",
    name: "Memory Writer",
    description: "Store agent outputs into Qdrant/SQLite memory automatically",
    type: "memory",
    icon: "brain",
    defaultConfig: { source: "plugin" },
    compatibleAgents: ["GATHER", "RAG-BUILDER", "DESK"],
  },
  {
    key: "slack-notify",
    name: "Slack Notify",
    description: "Send notifications to Slack channel (simulated when offline)",
    type: "notify",
    icon: "message",
    defaultConfig: { channel: "#nirva-alerts", webhookUrl: "" },
    compatibleAgents: ["DESK", "FLOW", "BRIEF"],
  },
  {
    key: "n8n-bridge",
    name: "n8n Bridge",
    description: "Trigger n8n workflows from agent actions",
    type: "webhook",
    icon: "git-branch",
    defaultConfig: { workflowId: "", n8nUrl: "http://localhost:5678" },
    compatibleAgents: ["FLOW"],
  },
];

export function getPluginDefinition(key: string): PluginDefinition | undefined {
  return BUILTIN_PLUGINS.find((p) => p.key === key);
}

export function validatePluginConfig(key: string, config: unknown): boolean {
  const def = getPluginDefinition(key);
  if (!def || !config || typeof config !== "object") return false;
  return true;
}
