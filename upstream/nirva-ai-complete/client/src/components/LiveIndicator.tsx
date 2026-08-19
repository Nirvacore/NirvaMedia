import { useLive } from "@/contexts/LiveContext";
import { Wifi, WifiOff } from "lucide-react";

export default function LiveIndicator() {
  const { connected, agentStats, infrastructure } = useLive();

  const onlineCount = infrastructure
    ? [infrastructure.ollama, infrastructure.qdrant, infrastructure.n8n].filter((s) => s === "online").length
    : 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-[10px]">
      {connected ? (
        <Wifi className="w-3 h-3 text-green-600" />
      ) : (
        <WifiOff className="w-3 h-3 text-amber-500 animate-pulse" />
      )}
      <span className="text-muted-foreground">
        {connected ? "Live" : "Reconnecting"}
      </span>
      {agentStats && (
        <span className="text-primary font-mono font-semibold">
          {agentStats.running} active
        </span>
      )}
      {infrastructure && (
        <span className="text-muted-foreground font-mono">
          {onlineCount}/3 infra
        </span>
      )}
    </div>
  );
}
