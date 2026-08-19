import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import {
  Building2, Shield, CreditCard, Plug, Server, ScrollText,
  CheckCircle2, XCircle, AlertCircle, ExternalLink, RefreshCw, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { fetchEnterpriseDashboard, type EnterpriseDashboard } from "@/lib/api";

const planBadge: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-700",
  enterprise: "bg-primary/10 text-primary",
  impact: "bg-violet-100 text-violet-700",
};

export default function Enterprise() {
  const [data, setData] = useState<EnterpriseDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await fetchEnterpriseDashboard();
      setData(d);
    } catch {
      toast.error("โหลด Enterprise Dashboard ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Enterprise</h1>
              <p className="text-sm text-muted-foreground">
                Private AI · ERP · SSO · Audit · Billing — v1.0
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </header>

        {loading && !data ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังโหลด...
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-2xl border border-border p-5">
                <p className="text-xs text-muted-foreground mb-1">Organization</p>
                <p className="font-semibold text-foreground">{data.tenantName}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${planBadge[data.plan] ?? planBadge.free}`}>
                  {data.billing.planLabel}
                </span>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">SSO</p>
                </div>
                <p className="font-semibold text-foreground">
                  {data.sso.enabled ? "OAuth" : "Demo Auth"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.sso.ssoReady ? "พร้อมใช้งาน" : "ตั้งค่า VITE_OAUTH_PORTAL_URL + VITE_APP_ID"}
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Usage วันนี้</p>
                </div>
                <p className="font-semibold text-foreground">${data.billing.todayCostUsd.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.billing.todayRequests} requests · premium {data.billing.premiumPercent}%</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Plug className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">ERP Connectors</p>
                </div>
                <p className="font-semibold text-foreground">{data.connectorsOnline} / {data.connectors.length} online</p>
                <Link href="/ecosystem" className="text-xs text-primary hover:underline mt-1 inline-block">ดู Ecosystem →</Link>
              </div>
            </div>

            {/* ERP Connectors */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plug className="w-4 h-4" />
                ERP Connectors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.connectors.map((c) => (
                  <div key={c.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                    {c.status === "online" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    ) : c.status === "unconfigured" ? (
                      <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">{c.tagline}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.agents.slice(0, 4).map((a) => (
                          <span key={a} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">{a}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                        {c.envKey ? `${c.envKey}=` : ""}{c.url || "not configured"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Deployment templates */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Private Deployment Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.deploymentTemplates.map((t) => (
                  <div key={t.id} className="bg-card rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-sm mb-1">{t.nameTh}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
                    <code className="block text-[10px] font-mono bg-muted rounded-lg p-2 text-muted-foreground break-all">
                      {t.command}
                    </code>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">{t.path}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Billing */}
            <section className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing & Limits
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Max Agents</p>
                  <p className="font-semibold">{data.billing.maxAgents}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Max Plugins</p>
                  <p className="font-semibold">{data.billing.maxPlugins}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Billing</p>
                  <p className="font-semibold capitalize">{data.billing.billingProvider}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Stripe</p>
                  <p className="font-semibold">{data.billing.stripeConfigured ? "Configured" : "Not set"}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Link href="/brains" className="text-sm text-primary hover:underline">ดู Pricing Plans →</Link>
                <Link href="/orchestration" className="text-sm text-primary hover:underline">Usage / ROUTER →</Link>
              </div>
            </section>

            {/* Audit log */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                Audit Log
              </h2>
              {data.recentAudit.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มี audit events — ลอง Execute Workspace หรือ Morning Briefing</p>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">เวลา</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Action</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actor</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAudit.map((log) => (
                        <tr key={log.id} className="border-b border-border last:border-0">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="p-3 font-mono text-xs">{log.action}</td>
                          <td className="p-3 text-xs">{log.actor}</td>
                          <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-xs">{log.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Production: <a href="https://ai.nirva.one" className="text-primary hover:underline" target="_blank" rel="noreferrer">https://ai.nirva.one</a>
              · Repo: <a href="https://github.com/Nirvacore/nirva-AI" className="text-primary hover:underline" target="_blank" rel="noreferrer">github.com/Nirvacore/nirva-AI</a>
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
