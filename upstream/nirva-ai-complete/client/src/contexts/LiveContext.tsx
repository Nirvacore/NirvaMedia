import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface LiveInfrastructure {
  ollama: "online" | "offline";
  qdrant: "online" | "offline";
  n8n: "online" | "offline";
}

export interface LiveAgentStats {
  total: number;
  selfHosted: number;
  hybrid: number;
  cloud: number;
  active: number;
  idle: number;
  running: number;
}

export interface LiveTasksSummary {
  running: number;
  queued: number;
  tasks: { id: string; title: string; agent: string; status: string; progress: number }[];
}

interface LiveContextValue {
  connected: boolean;
  agentStats: LiveAgentStats | null;
  infrastructure: LiveInfrastructure | null;
  tasksSummary: LiveTasksSummary | null;
  lastAlert: { level: string; message: string } | null;
}

const LiveContext = createContext<LiveContextValue>({
  connected: false,
  agentStats: null,
  infrastructure: null,
  tasksSummary: null,
  lastAlert: null,
});

export function useLive() {
  return useContext(LiveContext);
}

function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [agentStats, setAgentStats] = useState<LiveAgentStats | null>(null);
  const [infrastructure, setInfrastructure] = useState<LiveInfrastructure | null>(null);
  const [tasksSummary, setTasksSummary] = useState<LiveTasksSummary | null>(null);
  const [lastAlert, setLastAlert] = useState<{ level: string; message: string } | null>(null);

  const handleMessage = useCallback((raw: string) => {
    try {
      const event = JSON.parse(raw) as { type: string; payload: unknown };
      switch (event.type) {
        case "connected":
          setConnected(true);
          break;
        case "agent_stats":
          setAgentStats(event.payload as LiveAgentStats);
          break;
        case "infrastructure":
          setInfrastructure(event.payload as LiveInfrastructure);
          break;
        case "tasks":
          setTasksSummary(event.payload as LiveTasksSummary);
          break;
        case "task_update":
          setLastAlert({ level: "info", message: `Task updated: ${(event.payload as { title?: string }).title || "unknown"}` });
          break;
        case "system_alert":
          setLastAlert(event.payload as { level: string; message: string });
          break;
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      socket = new WebSocket(wsUrl());

      socket.onopen = () => setConnected(true);

      socket.onmessage = (e) => handleMessage(e.data as string);

      socket.onclose = () => {
        setConnected(false);
        if (!closed) reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [handleMessage]);

  return (
    <LiveContext.Provider value={{ connected, agentStats, infrastructure, tasksSummary, lastAlert }}>
      {children}
    </LiveContext.Provider>
  );
}
