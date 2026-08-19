import Sidebar from "@/components/Sidebar";
import { useState, useEffect, useCallback } from "react";
import { Play, Pause, CheckCircle2, Clock, AlertCircle, RotateCcw, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { fetchTasks, createTask, retryTask, pauseTask, deleteTaskApi, type Task } from "@/lib/api";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "running" | "queued" | "completed" | "failed">("all");
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data.tasks);
    } catch {
      toast.error("โหลดงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const statusConfig = {
    running: { icon: Play, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "กำลังทำ" },
    queued: { icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "รอคิว" },
    completed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "เสร็จแล้ว" },
    failed: { icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20", label: "ล้มเหลว" },
  };

  async function handleRetry(id: string) {
    try {
      await retryTask(id);
      await loadTasks();
      toast.success("เริ่มทำงานใหม่แล้ว");
    } catch { toast.error("ดำเนินการไม่สำเร็จ"); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTaskApi(id);
      await loadTasks();
      toast.success("ลบงานแล้ว");
    } catch { toast.error("ลบไม่สำเร็จ"); }
  }

  async function handlePause(id: string) {
    try {
      await pauseTask(id);
      await loadTasks();
      toast.success("หยุดชั่วคราว");
    } catch { toast.error("ดำเนินการไม่สำเร็จ"); }
  }

  async function addDemoTask() {
    try {
      await createTask({
        title: `งานใหม่ #${tasks.length + 1}`,
        agent: "DESK",
        description: "งานที่เพิ่มจาก dashboard",
      });
      await loadTasks();
      toast.success("เพิ่มงานใหม่แล้ว");
    } catch { toast.error("เพิ่มงานไม่สำเร็จ"); }
  }

  const counts = {
    all: tasks.length,
    running: tasks.filter((t) => t.status === "running").length,
    queued: tasks.filter((t) => t.status === "queued").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Task Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">จัดการและติดตามงานที่ AI กำลังทำ — บันทึกใน database</p>
          </div>
          <button
            onClick={addDemoTask}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all active:scale-97"
          >
            <Plus className="w-4 h-4" />
            เพิ่มงาน
          </button>
        </header>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {(["all", "running", "queued", "completed", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                filter === f
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/60"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : statusConfig[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-16">กำลังโหลด...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => {
              const config = statusConfig[task.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2.5 rounded-xl border ${config.color} flex-shrink-0`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                          <span className="px-2 py-0.5 rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground border border-border/50">
                            {task.agent}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{task.description}</p>
                        {(task.status === "running" || task.progress > 0) && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  task.status === "completed" ? "bg-emerald-500" :
                                  task.status === "failed" ? "bg-red-500" : "bg-primary"
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{task.progress}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {task.status === "running" && (
                        <button onClick={() => handlePause(task.id)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {task.status === "failed" && (
                        <button onClick={() => handleRetry(task.id)} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">ไม่มีงานในหมวดนี้</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
