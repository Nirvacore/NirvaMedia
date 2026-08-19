import Sidebar from "@/components/Sidebar";
import { useState, useEffect, useCallback } from "react";
import { GitBranch, Play, Bot, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWorkflows, runWorkflow, type WorkflowTemplate } from "@/lib/api";
import { Link } from "wouter";

const categoryLabel: Record<string, string> = {
  development: "Development",
  nirvaprocure: "Nirvaprocure",
  nirvamedia: "NirvaMedia",
  memory: "Memory / RAG",
  operations: "Operations",
  ecosystem: "Ecosystem",
};

export default function Workflows() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [n8nStatus, setN8nStatus] = useState<string>("unknown");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await fetchWorkflows();
      setTemplates(data.templates);
      setN8nStatus(data.n8n);
    } catch {
      toast.error("โหลด workflows ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  async function handleRun(templateId: string) {
    setRunning(templateId);
    try {
      const result = await runWorkflow(templateId) as { status: string; message?: string; task?: { id: string } };
      if (result.status === "simulated") {
        toast.info(result.message || "Workflow queued (n8n offline)");
      } else {
        toast.success("Workflow triggered successfully");
      }
      if (result.task) {
        toast.info(`Task #${result.task.id} created — check Tasks page`);
      }
    } catch {
      toast.error("Trigger workflow ไม่สำเร็จ");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
              <p className="text-sm text-muted-foreground">
                n8n orchestration — FLOW agent จัดการ multi-agent pipelines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              n8nStatus === "running"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              n8n: {n8nStatus === "running" ? "Online" : "Offline (simulated mode)"}
            </span>
            <Link href="/tasks">
              <span className="text-xs text-primary hover:underline cursor-pointer">ดู Tasks →</span>
            </Link>
          </div>
        </header>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All" : categoryLabel[cat] || cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((template) => (
              <div key={template.id} className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-foreground">{template.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                        {categoryLabel[template.category] || template.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <button
                    onClick={() => handleRun(template.id)}
                    disabled={running === template.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    {running === template.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run
                  </button>
                </div>

                {/* Steps */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.agents.map((agent) => (
                    <Link key={agent} href={`/agents/${agent}`}>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/5 text-xs text-primary font-mono hover:bg-primary/10">
                        <Bot className="w-3 h-3" />
                        {agent}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="space-y-2">
                  {template.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-mono shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-mono text-primary font-semibold w-16 shrink-0">{step.agent}</span>
                      <span className="text-muted-foreground flex-1">{step.action}</span>
                      <span className="flex items-center gap-1 text-muted-foreground font-mono shrink-0">
                        <Clock className="w-3 h-3" />
                        {step.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && n8nStatus !== "running" && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Simulated mode</p>
              <p className="text-xs mt-0.5">
                n8n offline — workflows จะถูกสร้างเป็น Task ใน queue แทน ตั้งค่า n8n URL ใน Settings เพื่อเชื่อมต่อจริง
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
