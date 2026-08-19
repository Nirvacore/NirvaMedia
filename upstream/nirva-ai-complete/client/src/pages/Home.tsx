import Sidebar from "@/components/Sidebar";
import { Bot, CheckCircle2, Clock, Server, Cloud, Leaf, Globe, GitBranch, Cpu } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { fetchEcosystem, fetchAgentStats, fetchOrchestrationCost, type OrchestrationCost } from "@/lib/api";
import { useLive } from "@/contexts/LiveContext";
import MorningBriefingPanel from "@/components/MorningBriefing";

const sprints = [
  { id: 1, title: "Pipeline ทำงานจริง", status: "complete", tasks: 5, completed: 5 },
  { id: 2, title: "Database & Persistence", status: "complete", tasks: 5, completed: 5 },
  { id: 3, title: "Memory System", status: "complete", tasks: 3, completed: 3 },
  { id: 4, title: "Ecosystem & n8n", status: "complete", tasks: 3, completed: 3 },
  { id: 5, title: "Production Hardening", status: "complete", tasks: 6, completed: 6 },
];

const recentAgents = [
  { name: "DESK", role: "Chief of Staff", tier: "self-hosted" as const },
  { name: "FLOW", role: "Operations Manager", tier: "self-hosted" as const },
  { name: "ARCH", role: "System Architect", tier: "hybrid" as const },
  { name: "CODE", role: "Code Generator", tier: "hybrid" as const },
  { name: "COIN", role: "Group CFO", tier: "self-hosted" as const },
];

const tierDot = {
  "self-hosted": "bg-primary",
  "hybrid": "bg-amber-500",
  "cloud": "bg-gray-400",
};

export default function Home() {
  const { infrastructure: liveInfra, connected, agentStats: liveStats } = useLive();
  const [ecosystem, setEcosystem] = useState<Awaited<ReturnType<typeof fetchEcosystem>> | null>(null);
  const [stats, setStats] = useState({ total: "109", selfHosted: "28", hybrid: "45", cloud: "36" });
  const [orchestrationCost, setOrchestrationCost] = useState<OrchestrationCost | null>(null);

  useEffect(() => {
    fetchEcosystem().then(setEcosystem).catch(() => {});
    fetchAgentStats().then((s) => setStats({
      total: String(s.total),
      selfHosted: String(s.selfHosted),
      hybrid: String(s.hybrid),
      cloud: String(s.cloud),
    })).catch(() => {});
    fetchOrchestrationCost().then(setOrchestrationCost).catch(() => {});
  }, []);

  const statCards = [
    { label: "Total Agents", value: liveStats ? String(liveStats.total) : stats.total, icon: Bot, accent: "bg-primary/10 text-primary" },
    { label: "Self-Hosted", value: stats.selfHosted, icon: Server, accent: "bg-green-50 text-green-700" },
    { label: "Hybrid", value: stats.hybrid, icon: Cloud, accent: "bg-amber-50 text-amber-700" },
    { label: "Cloud", value: stats.cloud, icon: Leaf, accent: "bg-gray-100 text-gray-600" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-6xl">
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              Nirva Workspace v1.0 {connected && "· Live"}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3">
            109 Agents. One Garden.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            ระบบจัดการ Nirva Ecosystem — 6 ผลิตภัณฑ์, 109 agents, ควบคุมทุกอย่างจากที่เดียว
          </p>
          <Link href="/demo" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline">
            ดูตัวอย่างทุกฟีเจอร์ → Demo Hub
          </Link>
        </header>

        <MorningBriefingPanel
          infrastructure={liveInfra ? {
            ollama: liveInfra.ollama,
            qdrant: liveInfra.qdrant,
            n8n: liveInfra.n8n,
          } : null}
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.accent} flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        {orchestrationCost && (
          <section className="bg-card rounded-2xl border border-border p-7 mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Model ROUTER — วันนี้</h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  ประหยัด {orchestrationCost.savingsPercent}%
                </span>
              </div>
              <Link href="/orchestration">
                <span className="text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10">
                  ดู ROUTER →
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-green-50/80 border border-green-100">
                <p className="text-2xl font-bold text-green-700">{orchestrationCost.freePercent}%</p>
                <p className="text-xs text-green-800/70">Free tier</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">{orchestrationCost.lowCostPercent}%</p>
                <p className="text-xs text-amber-800/70">Low cost</p>
              </div>
              <div className="p-4 rounded-xl bg-violet-50/80 border border-violet-100">
                <p className="text-2xl font-bold text-violet-700">{orchestrationCost.premiumPercent}%</p>
                <p className="text-xs text-violet-800/70">Premium</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <p className="text-2xl font-bold text-foreground">{orchestrationCost.totalCalls}</p>
                <p className="text-xs text-muted-foreground">routing calls</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ต้นทุนโดยประมาณวันนี้ ${orchestrationCost.totalCostUsd.toFixed(4)} — Chat และ Control Tower ใช้ ROUTER อัตโนมัติ
            </p>
          </section>
        )}

        {/* Nirva Ecosystem */}
        {ecosystem && (
          <section className="bg-card rounded-2xl border border-border p-7 mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Nirva Ecosystem</h2>
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                  {ecosystem.summary.online}/{ecosystem.summary.total} online
                </span>
              </div>
              <Link href="/ecosystem">
                <span className="text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10">
                  ดูทั้งหมด →
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ecosystem.apps.map((app) => (
                <div key={app.id} className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${
                    app.status === "online" ? "bg-green-500" : "bg-amber-400"
                  }`} />
                  <p className="text-xs font-bold text-foreground truncate">{app.name}</p>
                  <p className="text-[10px] text-muted-foreground">{app.productStatus}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-7">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Sprint Progress</h2>
            </div>
            <div className="space-y-5">
              {sprints.map((sprint) => (
                <div key={sprint.id} className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                    sprint.status === "in-progress"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : sprint.status === "complete"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {sprint.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{sprint.title}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {sprint.completed}/{sprint.tasks}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${sprint.tasks > 0 ? (sprint.completed / sprint.tasks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {sprint.status === "in-progress" && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                      Active
                    </span>
                  )}
                  {sprint.status === "complete" && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Top Agents</h2>
              </div>
              <Link href="/agents">
                <span className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10">
                  ดูทั้งหมด →
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {recentAgents.map((agent) => (
                <Link key={agent.name} href={`/agents/${agent.name}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary font-mono">{agent.name.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${tierDot[agent.tier]}`} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-7">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-foreground">Infrastructure</h2>
            <Link href="/workflows" className="ml-auto">
              <span className="flex items-center gap-1 text-xs text-primary hover:underline">
                <GitBranch className="w-3 h-3" />
                Workflows
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(liveInfra
              ? [
                  { id: "ollama", name: "Ollama", desc: "AI Models", status: liveInfra.ollama },
                  { id: "qdrant", name: "Qdrant", desc: "Vector DB", status: liveInfra.qdrant },
                  { id: "n8n", name: "n8n", desc: "Orchestrator", status: liveInfra.n8n },
                ]
              : ecosystem?.infrastructure || [
                  { id: "ollama", name: "Ollama", desc: "AI Models", status: "offline" as const },
                  { id: "qdrant", name: "Qdrant", desc: "Vector DB", status: "offline" as const },
                  { id: "n8n", name: "n8n", desc: "Orchestrator", status: "offline" as const },
                ]
            ).map((service) => (
              <div key={service.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 transition-all duration-200 hover:border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    service.status === "online" ? "bg-green-500" : "bg-amber-500 animate-pulse"
                  }`} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {service.status}
                  </span>
                </div>
                <p className="text-base font-bold text-foreground">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
