import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Puzzle, Power, Play, Download, Bot, Zap } from "lucide-react";
import {
  fetchPlugins,
  installPlugin,
  togglePlugin,
  invokePlugin,
  type AgentPlugin,
} from "@/lib/api";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export default function Plugins() {
  const { current } = useTenant();
  const [installed, setInstalled] = useState<AgentPlugin[]>([]);
  const [catalog, setCatalog] = useState<{ key: string; name: string; description: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchPlugins()
      .then((data) => {
        setInstalled(data.installed);
        setCatalog(data.catalog);
      })
      .catch(() => toast.error("Failed to load plugins"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [current?.id]);

  const handleInstall = async (key: string) => {
    try {
      await installPlugin(key);
      toast.success("Plugin installed");
      load();
    } catch {
      toast.error("Install failed — check plan limits");
    }
  };

  const handleToggle = async (plugin: AgentPlugin) => {
    try {
      await togglePlugin(plugin.id, !plugin.enabled);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleInvoke = async (plugin: AgentPlugin) => {
    try {
      const result = await invokePlugin(plugin.id, plugin.agents[0] || "DESK", { test: true });
      toast.success(result.message);
    } catch {
      toast.error("Invoke failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Puzzle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agent Plugins</h1>
              <p className="text-sm text-muted-foreground">
                Custom tools per agent — {current?.name ?? "Organization"} ({current?.plan ?? "free"} plan)
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Installed ({installed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installed.map((plugin) => (
                  <div key={plugin.id} className="bg-card rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{plugin.name}</h3>
                        <p className="text-[10px] font-mono text-muted-foreground">{plugin.pluginKey} · {plugin.type}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(plugin)}
                        className={`p-2 rounded-lg border transition-colors ${
                          plugin.enabled ? "bg-green-50 text-green-700 border-green-200" : "text-muted-foreground border-border"
                        }`}
                        title={plugin.enabled ? "Disable" : "Enable"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                    {plugin.agents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {plugin.agents.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                            <Bot className="w-2.5 h-2.5" /> {a}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleInvoke(plugin)}
                      disabled={!plugin.enabled}
                      className="flex items-center gap-2 text-xs font-medium text-primary disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" /> Test invoke
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {catalog.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Available to Install
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catalog.map((item) => (
                    <div key={item.key} className="bg-card rounded-xl border border-dashed border-border p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                      <button
                        onClick={() => handleInstall(item.key)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                      >
                        Install
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
