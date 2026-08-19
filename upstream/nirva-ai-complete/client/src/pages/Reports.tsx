import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  BarChart3, CheckCircle2, AlertTriangle, Clock, ListTodo, Bot, ArrowRight,
} from "lucide-react";
import { fetchReports, type OrganizationReport } from "@/lib/api";

export default function Reports() {
  const [report, setReport] = useState<OrganizationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports()
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const summary = report?.summary;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Organization Reports</h1>
              <p className="text-sm text-muted-foreground">
                งานที่เสร็จ · ปัญหา · ขั้นตอนถัดไป — Control Tower Dashboard
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลดรายงาน...</p>
        ) : report ? (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Completed", value: summary?.completedTasks ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                { label: "Active", value: summary?.activeTasks ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                { label: "Failed", value: summary?.failedTasks ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
                { label: "Pipeline Tasks", value: summary?.routedPipelineTasks ?? 0, icon: ListTodo, color: "text-primary bg-primary/10" },
              ].map((card) => (
                <div key={card.label} className="bg-card rounded-2xl border border-border p-5">
                  <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Next Steps */}
              <section className="bg-card rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  ขั้นตอนถัดไป
                </h2>
                {report.nextSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ไม่มีงานค้างใน pipeline</p>
                ) : (
                  <ul className="space-y-2">
                    {report.nextSteps.map((step) => (
                      <li key={step.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                        <span className="font-mono text-xs font-bold text-primary">{step.agent}</span>
                        <span className="text-sm text-foreground flex-1 truncate">{step.action}</span>
                        <Link href="/tasks">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{step.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Issues */}
              <section className="bg-card rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  ปัญหา
                </h2>
                {report.issues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ไม่มีปัญหา — ระบบทำงานปกติ ✓</p>
                ) : (
                  <ul className="space-y-2">
                    {report.issues.map((issue) => (
                      <li key={issue.id} className="p-3 rounded-xl border border-red-100 bg-red-50/50">
                        <p className="text-sm font-medium text-foreground">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.agent} — {issue.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Top Agents */}
              <section className="bg-card rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Agent Workload
                </h2>
                <ul className="space-y-2">
                  {report.topAgents.map((a) => (
                    <li key={a.agent} className="flex items-center justify-between p-2">
                      <Link href={`/agents/${a.agent}`}>
                        <span className="font-mono text-sm font-bold text-primary hover:underline">{a.agent}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">{a.taskCount} tasks</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recent Tasks */}
              <section className="bg-card rounded-2xl border border-border p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-primary" />
                  งานล่าสุด
                </h2>
                <ul className="space-y-2">
                  {report.tasks.recent.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40">
                      <span className="font-mono text-[10px] font-bold text-primary w-14 shrink-0">{t.agent}</span>
                      <span className="text-xs text-foreground flex-1 truncate">{t.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        t.status === "completed" ? "bg-green-50 text-green-700" :
                        t.status === "running" ? "bg-amber-50 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{t.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">ไม่สามารถโหลดรายงานได้</p>
        )}
      </main>
    </div>
  );
}
