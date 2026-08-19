import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { AGENT_STATS } from "../../shared/agents.ts";
import { listTasks } from "../db/index.ts";

export type LiveEventType =
  | "connected"
  | "agent_stats"
  | "tasks"
  | "infrastructure"
  | "system_alert"
  | "task_update";

export interface LiveEvent {
  type: LiveEventType;
  payload: unknown;
  timestamp: string;
}

let wss: WebSocketServer | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function now() {
  return new Date().toISOString();
}

export function broadcast(event: LiveEvent) {
  if (!wss) return;
  const data = JSON.stringify(event);
  for (const client of Array.from(wss.clients)) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function broadcastTaskUpdate(task: unknown) {
  broadcast({ type: "task_update", payload: task, timestamp: now() });
}

export function broadcastTasksSummary() {
  pushLiveSnapshot().catch(() => {});
}

async function buildInfrastructureSnapshot() {
  const ollamaUrl = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
  const qdrantUrl = process.env.VITE_QDRANT_URL || "http://localhost:6333";
  const n8nUrl = process.env.VITE_N8N_URL || "http://localhost:5678";

  async function ping(url: string, path: string) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}${path}`, { signal: AbortSignal.timeout(3000) });
      return res.ok ? "online" : "offline";
    } catch {
      return "offline";
    }
  }

  const [ollama, qdrant, n8n] = await Promise.all([
    ping(ollamaUrl, "/api/tags"),
    ping(qdrantUrl, "/collections"),
    ping(n8nUrl, "/healthz"),
  ]);

  return { ollama, qdrant, n8n };
}

async function pushLiveSnapshot() {
  const tasks = listTasks();
  const running = tasks.filter((t) => t.status === "running").length;

  broadcast({
    type: "agent_stats",
    payload: { ...AGENT_STATS, active: running, idle: AGENT_STATS.total - running, running },
    timestamp: now(),
  });

  broadcast({
    type: "tasks",
    payload: { tasks, running, queued: tasks.filter((t) => t.status === "queued").length },
    timestamp: now(),
  });

  const infra = await buildInfrastructureSnapshot();
  broadcast({ type: "infrastructure", payload: infra, timestamp: now() });
}

export function initWebSocket(server: Server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({
      type: "connected",
      payload: { clients: wss!.clients.size, version: "0.6.0" },
      timestamp: now(),
    } satisfies LiveEvent));

    pushLiveSnapshot().catch(() => {});
  });

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      pushLiveSnapshot().catch(() => {});
    }, 10_000);
    heartbeatTimer.unref();
  }

  return wss;
}

export function getConnectedClients(): number {
  return wss?.clients.size ?? 0;
}
