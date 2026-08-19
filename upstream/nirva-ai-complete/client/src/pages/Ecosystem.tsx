import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Leaf, ShoppingCart, Store, Film, Coffee, Mountain,
  ExternalLink, Bot, Server, CheckCircle2, XCircle, Globe,
} from "lucide-react";
import { fetchEcosystem, type EcosystemAppStatus } from "@/lib/api";

const iconMap: Record<string, typeof Leaf> = {
  leaf: Leaf,
  "shopping-cart": ShoppingCart,
  store: Store,
  film: Film,
  coffee: Coffee,
  mountain: Mountain,
};

const roleLabel: Record<string, string> = {
  "control-tower": "Control Tower",
  product: "Product",
  infrastructure: "Infrastructure",
};

export default function Ecosystem() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchEcosystem>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEcosystem()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nirva Ecosystem</h1>
              <p className="text-sm text-muted-foreground">
                ผลิตภัณฑ์ทั้งหมดของ Nirvacore — ควบคุมจาก Control Tower เดียว
              </p>
            </div>
          </div>
          {data && (
            <div className="flex gap-4 mt-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {data.summary.total} Apps
              </span>
              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                {data.summary.online} Online
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                {data.summary.products} Products
              </span>
            </div>
          )}
        </header>

        {/* Infrastructure */}
        {data && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Infrastructure
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.infrastructure.map((infra) => (
                <div key={infra.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  {infra.status === "online" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{infra.name}</p>
                    <p className="text-xs text-muted-foreground">{infra.desc}</p>
                  </div>
                  <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    infra.status === "online" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {infra.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Product grid */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Ecosystem Apps
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data?.apps || []).map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AppCard({ app }: { app: EcosystemAppStatus }) {
  const Icon = iconMap[app.icon] || Leaf;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${app.color}18`, border: `1px solid ${app.color}30` }}
        >
          <Icon className="w-6 h-6" style={{ color: app.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-foreground">{app.name}</h3>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              app.status === "online" ? "bg-green-500" : "bg-amber-400"
            }`} />
          </div>
          <p className="text-xs text-primary font-medium mb-1">{app.tagline}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
              {roleLabel[app.role] || app.role}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
              {app.productStatus}
            </span>
            {app.latencyMs !== undefined && app.status === "online" && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-[10px] text-green-700 font-mono">
                {app.latencyMs}ms
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {app.agents.slice(0, 4).map((agent) => (
              <Link key={agent} href={`/agents/${agent}`}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-[10px] text-primary font-mono hover:bg-primary/10 cursor-pointer">
                  <Bot className="w-2.5 h-2.5" />
                  {agent}
                </span>
              </Link>
            ))}
            {app.agents.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{app.agents.length - 4}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={app.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              GitHub
            </a>
            {app.id === "nirva-ai" && (
              <Link href="/">
                <span className="text-xs text-primary font-medium hover:underline cursor-pointer">Open Dashboard →</span>
              </Link>
            )}
            {app.id !== "nirva-ai" && app.url && (
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-medium hover:underline"
              >
                Open App →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
