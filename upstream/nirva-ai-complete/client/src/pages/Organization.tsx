import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Building2, Bot, ChevronRight, Crown, GitBranch, Cpu, Brain,
  ShoppingCart, Film, Calendar, Users, Coins, GraduationCap,
} from "lucide-react";
import { fetchOrganization, type OrganizationResponse } from "@/lib/api";

const companyIcons: Record<string, typeof Building2> = {
  code: Cpu,
  brain: Brain,
  cart: ShoppingCart,
  film: Film,
  calendar: Calendar,
  users: Users,
  coins: Coins,
  graduation: GraduationCap,
};

export default function Organization() {
  const [data, setData] = useState<OrganizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization()
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
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Organization</h1>
              <p className="text-sm text-muted-foreground">
                NIRVA Organization Blueprint V1 — 109 agents จัดเป็น AI Companies
              </p>
            </div>
          </div>
          {data && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {data.summary.totalCompanies} Companies
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                {data.summary.uniqueOrgAgents} Org Agents
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                {data.summary.registryAgents} Registry Total
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                {data.summary.intentPipelines} Intent Pipelines
              </span>
            </div>
          )}
        </header>

        {/* Flow diagram */}
        <section className="mb-8 p-5 rounded-2xl border border-border bg-card">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Control Flow</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
            {["User", "Control Tower", "DESK + FLOW", "AI Companies", "Specialist Agents", "Tools", "Report"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold">{step}</span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
              </span>
            ))}
          </div>
        </section>

        {/* Control Tower */}
        {data && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Control Tower
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.controlTower.map((ct) => (
                <div key={ct.agent} className="bg-card rounded-2xl border border-primary/15 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <Link href={`/agents/${ct.agent}`}>
                      <span className="font-bold text-foreground hover:text-primary">{ct.agent}</span>
                    </Link>
                    {ct.agent === "SAGE" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">ORACLE</span>
                    )}
                  </div>
                  <p className="text-xs text-primary font-medium mb-2">{ct.blueprintRole}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {ct.responsibilities.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Companies */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            AI Companies
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : (
            <div className="space-y-4">
              {(data?.companies || []).map((company) => {
                const Icon = companyIcons[company.icon] || Building2;
                const isOpen = expanded === company.id;
                return (
                  <div key={company.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : company.id)}
                      className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{company.name}</h3>
                        <p className="text-xs text-muted-foreground">{company.tagline}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                        <p className="text-sm text-muted-foreground">{company.description}</p>
                        {company.departments.map((dept) => (
                          <div key={dept.id}>
                            <h4 className="text-xs font-semibold text-foreground mb-2">{dept.name}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dept.agents.map((a) => (
                                <Link key={`${dept.id}-${a.agent}`} href={`/agents/${a.agent}`}>
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary/30 transition-colors">
                                    <span className="font-mono text-xs font-bold text-primary">{a.agent}</span>
                                    <span className="text-[10px] text-muted-foreground truncate">{a.blueprintRole}</span>
                                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${
                                      a.modelTier === "premium" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                                    }`}>
                                      {a.modelTier}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Intent Pipelines */}
        {data && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Agent Router Pipelines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.pipelines.map((p) => (
                <div key={p.id} className="bg-card rounded-xl border border-border p-4">
                  <p className="font-semibold text-sm text-foreground">{p.labelTh}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{p.agents.join(" → ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
