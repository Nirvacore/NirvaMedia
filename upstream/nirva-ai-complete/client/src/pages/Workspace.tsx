import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import {
  Code2, Lightbulb, Palette, FlaskConical, Rocket, Play, Loader2,
  CheckCircle2, Circle, ArrowRight, Terminal, GitBranch, ListTodo,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  planWorkspacePipeline,
  executeWorkspacePipeline,
  type WorkspacePipeline,
  type WorkspaceExecuteResult,
} from "@/lib/api";

const STAGE_ICONS = {
  idea: Lightbulb,
  design: Palette,
  code: Code2,
  test: FlaskConical,
  deploy: Rocket,
} as const;

export default function Workspace() {
  const [idea, setIdea] = useState("");
  const [pipeline, setPipeline] = useState<WorkspacePipeline | null>(null);
  const [planning, setPlanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastRun, setLastRun] = useState<WorkspaceExecuteResult | null>(null);

  async function handlePlan() {
    if (!idea.trim()) {
      toast.error("ใส่ไอเดียก่อน");
      return;
    }
    setPlanning(true);
    try {
      const data = await planWorkspacePipeline(idea.trim());
      setPipeline(data);
    } catch {
      toast.error("วางแผน pipeline ไม่สำเร็จ");
    } finally {
      setPlanning(false);
    }
  }

  async function handleExecute() {
    if (!idea.trim()) {
      toast.error("ใส่ไอเดียก่อน");
      return;
    }
    setExecuting(true);
    try {
      const result = await executeWorkspacePipeline(idea.trim());
      setPipeline(result.pipeline);
      setLastRun(result);
      toast.success(result.messageTh);
    } catch {
      toast.error("เริ่ม pipeline ไม่สำเร็จ");
    } finally {
      setExecuting(false);
    }
  }

  const stages = pipeline?.stages ?? [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Coding Workspace</h1>
              <p className="text-sm text-muted-foreground">
                Idea → Design → Code → Test → Deploy — ด้วยภาษาธรรมดาหรือเสียง
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
              v0.18 Pipeline
            </span>
            <Link href="/terminal" className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
              Terminal →
            </Link>
            <Link href="/workflows" className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80">
              Workflows →
            </Link>
          </div>
        </header>

        <section className="bg-card rounded-2xl border border-border p-6 mb-8">
          <label className="block text-sm font-medium text-foreground mb-2">
            ไอเดีย / Feature Request
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="เช่น สร้างหน้า login ด้วย OAuth + dashboard สรุปยอดขายรายวัน"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handlePlan}
              disabled={planning || !idea.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              วางแผน Pipeline
            </button>
            <button
              onClick={handleExecute}
              disabled={executing || !idea.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              เริ่ม Idea → Deploy
            </button>
          </div>
        </section>

        {pipeline && (
          <section className="mb-8">
            <p className="text-sm text-muted-foreground mb-4">{pipeline.summaryTh}</p>
            <div className="space-y-3">
              {stages.map((stage, i) => {
                const Icon = STAGE_ICONS[stage.id as keyof typeof STAGE_ICONS] ?? Circle;
                const isDone = stage.status === "done";
                const isRunning = stage.status === "running";
                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-4 p-4 rounded-2xl border ${
                      isRunning ? "border-violet-300 bg-violet-50/50" :
                      isDone ? "border-green-200 bg-green-50/30" :
                      "border-border bg-card"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isRunning ? "bg-violet-500/20" : isDone ? "bg-green-500/20" : "bg-muted"
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isRunning ? "text-violet-600" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">{i + 1}/5</span>
                        <h3 className="font-semibold text-foreground">{stage.labelTh}</h3>
                        <span className="text-xs text-muted-foreground">({stage.duration})</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{stage.actionTh}</p>
                      <div className="flex flex-wrap gap-1">
                        {stage.agents.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">{a}</span>
                        ))}
                      </div>
                    </div>
                    {i < stages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-3 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {lastRun && (
          <section className="bg-card rounded-2xl border border-border p-6 mb-8">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              ผลลัพธ์ล่าสุด
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{lastRun.messageTh}</p>
            <div className="flex flex-wrap gap-2 text-xs mb-4">
              <span className="px-2 py-1 rounded-full bg-muted">run: {lastRun.runId}</span>
              <span className="px-2 py-1 rounded-full bg-muted">workflow: {lastRun.workflowStatus}</span>
              <span className="px-2 py-1 rounded-full bg-muted">{lastRun.tasksCreated} tasks</span>
            </div>
            <div className="flex gap-3">
              <Link href="/tasks" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ListTodo className="w-4 h-4" />
                ดู Tasks
              </Link>
              <Link href="/workflows" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <GitBranch className="w-4 h-4" />
                Workflows
              </Link>
            </div>
          </section>
        )}

        <section className="bg-muted/30 rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Terminal shortcut</h2>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            workspace plan &quot;สร้าง API login&quot; — วางแผนใน Terminal
          </p>
        </section>
      </main>
    </div>
  );
}
