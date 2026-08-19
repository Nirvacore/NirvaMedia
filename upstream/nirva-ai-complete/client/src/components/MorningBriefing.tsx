import { useState } from "react";
import { Link } from "wouter";
import { Sunrise, ListTodo, AlertTriangle, Building2, Mic, Zap, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchMorningBriefing, executeMorningActions, type MorningBriefing, type MorningExecuteResult } from "@/lib/api";

interface MorningBriefingPanelProps {
  infrastructure?: {
    ollama: string;
    qdrant: string;
    n8n: string;
  } | null;
}

export default function MorningBriefingPanel({ infrastructure }: MorningBriefingPanelProps) {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastExecute, setLastExecute] = useState<MorningExecuteResult | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMorningBriefing(infrastructure ?? undefined);
      setBriefing(data);
    } catch {
      toast.error("โหลด Morning Briefing ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleExecute() {
    setExecuting(true);
    try {
      const result = await executeMorningActions(infrastructure ?? undefined);
      setLastExecute(result);
      setBriefing(result.briefing);
      toast.success(result.messageTh);
    } catch {
      toast.error("จัดการให้ไม่สำเร็จ");
    } finally {
      setExecuting(false);
    }
  }

  if (!briefing && !loading) {
    return (
      <section className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-background rounded-2xl border border-amber-200/60 p-7 mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
            <Sunrise className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">AI Morning Dashboard</h2>
            <p className="text-sm text-muted-foreground">สรุปวันนี้ + สั่ง &quot;จัดการให้&quot; ด้วยเสียงหรือปุ่ม</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <Sunrise className="w-4 h-4" />
          เปิด Morning Briefing
        </button>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-background rounded-2xl border border-amber-200/60 p-7 mb-10">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
            <Sunrise className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {briefing?.greetingTh ?? "สวัสดี"} — Morning Briefing
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              {briefing?.summaryTh ?? "กำลังโหลด..."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-white/80 text-sm hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 shadow-sm"
          >
            {executing ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            จัดการให้
          </button>
          <Link href="/voice">
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-white/80 text-sm hover:bg-white cursor-pointer">
              <Mic className="w-3.5 h-3.5" />
              เสียง
            </span>
          </Link>
        </div>
      </div>

      {lastExecute && lastExecute.tasksCreated > 0 && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          สร้าง {lastExecute.tasksCreated} งานแล้ว — <Link href="/tasks" className="underline font-medium">ดู Tasks</Link>
        </div>
      )}

      {briefing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold mb-3">
              <ListTodo className="w-3.5 h-3.5" />
              วันนี้ต้องทำ
            </div>
            {briefing.todayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">ไม่มีงานค้างในคิว</p>
            ) : (
              <ul className="space-y-2">
                {briefing.todayTasks.map((t) => (
                  <li key={t.id} className="text-xs">
                    <span className="font-mono text-amber-700">{t.agent}</span>{" "}
                    <span className="text-foreground">{t.title.slice(0, 40)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white/70 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5" />
              บริษัท
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Active</span><p className="font-bold">{briefing.companyPulse.activeTasks}</p></div>
              <div><span className="text-muted-foreground">Done</span><p className="font-bold text-green-700">{briefing.companyPulse.completedTasks}</p></div>
              <div><span className="text-muted-foreground">Failed</span><p className="font-bold text-red-600">{briefing.companyPulse.failedTasks}</p></div>
              <div><span className="text-muted-foreground">Memory</span><p className="font-bold">{briefing.companyPulse.memoryEntries}</p></div>
            </div>
          </div>

          <div className="bg-white/70 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold mb-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              ปัญหา / สำคัญ
            </div>
            {briefing.issues.length === 0 && briefing.priorities.length === 0 ? (
              <p className="text-xs text-green-700">ไม่มีปัญหาเร่งด่วน ✓</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {briefing.issues.map((i) => (
                  <li key={i.id} className="text-red-700">⚠ {i.title.slice(0, 45)}</li>
                ))}
                {briefing.priorities.slice(0, 3).map((p) => (
                  <li key={p.id} className="text-foreground">→ {p.action.slice(0, 45)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
