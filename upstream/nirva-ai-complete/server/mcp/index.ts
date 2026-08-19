/**
 * Nirva MCP stdio server.
 * Run: npx tsx server/mcp/index.ts
 * Exposes Nirva's core capabilities as MCP tools for Cursor / Claude Code.
 */

import * as readline from "readline";
import { AGENTS } from "../../shared/agents.ts";

const SERVER_INFO = {
  name: "nirva-ai",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "chat_with_agent",
    description: "Send a message to any Nirva AI agent (DESK, CODE, ARCH, etc.) and get a response via Ollama",
    inputSchema: {
      type: "object",
      properties: {
        agent:   { type: "string", description: "Agent name (e.g. DESK, CODE, ARCH)" },
        message: { type: "string", description: "Message to send" },
        ollamaUrl: { type: "string", description: "Ollama base URL (default: http://localhost:11434)" },
      },
      required: ["agent", "message"],
    },
  },
  {
    name: "search_memory",
    description: "Semantic search in Nirva's Qdrant vector memory for a specific agent",
    inputSchema: {
      type: "object",
      properties: {
        agent:    { type: "string", description: "Agent name" },
        query:    { type: "string", description: "Search query" },
        qdrantUrl: { type: "string", description: "Qdrant URL (default: http://localhost:6333)" },
      },
      required: ["agent", "query"],
    },
  },
  {
    name: "list_tasks",
    description: "List current tasks in the Nirva task queue",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["all", "running", "queued", "completed", "failed"], description: "Filter by status" },
      },
    },
  },
  {
    name: "list_agents",
    description: "List Nirva AI agents, optionally filtered by department",
    inputSchema: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description: "Category filter (e.g. Core Control Tower, Software Company)",
        },
      },
    },
  },
  {
    name: "check_infrastructure",
    description: "Check status of Nirva infrastructure services (Ollama, Qdrant, n8n)",
    inputSchema: {
      type: "object",
      properties: {
        ollamaUrl: { type: "string" },
        qdrantUrl: { type: "string" },
        n8nUrl:    { type: "string" },
      },
    },
  },
  {
    name: "search_obsidian",
    description: "Search notes in Obsidian vault via Local REST API plugin",
    inputSchema: {
      type: "object",
      properties: {
        query:      { type: "string", description: "Search query" },
        obsidianUrl: { type: "string", description: "Obsidian API URL (default: http://localhost:27124)" },
        apiKey:     { type: "string", description: "Obsidian Local REST API key" },
      },
      required: ["query"],
    },
  },
];

async function callTool(name: string, args: Record<string, string>): Promise<string> {
  const nirvaBase = process.env.NIRVA_URL || "http://localhost:3000";

  try {
    if (name === "chat_with_agent") {
      const res = await fetch(`${nirvaBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: args.message,
          agent: args.agent?.toUpperCase() || "DESK",
          ollamaUrl: args.ollamaUrl,
          useMemory: true,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Chat API ${res.status}`);
      const data = await res.json() as { content: string; agent: string; model: string };
      return `[${data.agent}] ${data.content}`;
    }

    if (name === "search_memory") {
      const res = await fetch(`${nirvaBase}/api/memory/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: args.agent, query: args.query, qdrantUrl: args.qdrantUrl }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json() as { results: Array<{ title: string; content: string; score: number }> };
      if (!data.results?.length) return "No memories found.";
      return data.results.map((r, i) => `${i + 1}. [${r.score.toFixed(2)}] ${r.title}\n   ${r.content.slice(0, 200)}`).join("\n\n");
    }

    if (name === "list_tasks") {
      const status = args.status || "all";
      const res = await fetch(`${nirvaBase}/api/tasks?status=${status}`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json() as { tasks: Array<{ id: string; title: string; agent: string; status: string; progress: number }> };
      if (!data.tasks?.length) return "No tasks found.";
      return data.tasks.map((t) => `• [${t.status.toUpperCase()}] ${t.title} (${t.agent}) — ${t.progress}%`).join("\n");
    }

    if (name === "list_agents") {
      const filtered = args.department
        ? AGENTS.filter((a) => a.category.toLowerCase().includes(args.department.toLowerCase()))
        : AGENTS;
      return filtered.map((a) => `${a.name} — ${a.role} [${a.tier}]`).join("\n");
    }

    if (name === "check_infrastructure") {
      const ollamaUrl = args.ollamaUrl || "http://localhost:11434";
      const qdrantUrl = args.qdrantUrl || "http://localhost:6333";
      const n8nUrl    = args.n8nUrl    || "http://localhost:5678";

      const pingService = async (url: string, path: string, label: string) => {
        try {
          const r = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(3000) });
          return `${label}: ${r.ok ? "✓ online" : "✗ error " + r.status}`;
        } catch {
          return `${label}: ✗ offline`;
        }
      };

      const results = await Promise.all([
        pingService(ollamaUrl, "/api/tags", "Ollama"),
        pingService(qdrantUrl, "/collections", "Qdrant"),
        pingService(n8nUrl, "/healthz", "n8n"),
      ]);
      return results.join("\n");
    }

    if (name === "search_obsidian") {
      const obsidianUrl = args.obsidianUrl || process.env.OBSIDIAN_URL || "http://localhost:27124";
      const apiKey = args.apiKey || process.env.OBSIDIAN_API_KEY || "";
      const res = await fetch(`${nirvaBase}/api/obsidian/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: args.query, url: obsidianUrl, apiKey }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await res.json() as { results: Array<{ path: string; score: number; excerpt: string }> };
      if (!data.results?.length) return "No notes found matching the query.";
      return data.results.map((r, i) => `${i + 1}. ${r.path} (score: ${r.score.toFixed(2)})\n   ${r.excerpt}`).join("\n\n");
    }

    return `Unknown tool: ${name}`;
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}

// ── MCP stdio JSON-RPC 2.0 handler ───────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin });

function send(obj: unknown) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req: { jsonrpc: string; id: number | string | null; method: string; params?: Record<string, unknown> };
  try {
    req = JSON.parse(line) as typeof req;
  } catch {
    return;
  }

  const { id, method, params } = req;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }

  if (method === "initialized") return;

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params as { name: string; arguments: Record<string, string> };
    const text = await callTool(name, args || {});
    send({
      jsonrpc: "2.0", id,
      result: { content: [{ type: "text", text }] },
    });
    return;
  }

  send({
    jsonrpc: "2.0", id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});
