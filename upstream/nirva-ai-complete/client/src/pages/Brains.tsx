import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Brain, Globe, Sparkles, Target, Code, BarChart3, Mic, Eye, Megaphone, Layers, Zap } from "lucide-react";
import { toast } from "sonner";

interface BrainItem {
  id: string;
  name: string;
  nameTh: string;
  category: string;
  description: string;
  descriptionTh: string;
  agents: string[];
  minPlan: string;
  availability: string;
  color: string;
}

interface BrainTeamPlan {
  intent: string;
  intentTh: string;
  primaryCategory: string;
  categories: string[];
  agents: string[];
  brains: string[];
  workflow: string;
  reasoningTh: string;
}

interface BrainStats {
  totalBrains: number;
  totalCategories: number;
  totalProviders: number;
  freeBrains: number;
  proBrains: number;
}

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  ceo: Target,
  cto: Layers,
  developer: Code,
  marketing: Megaphone,
  data: BarChart3,
  voice: Mic,
  vision: Eye,
};

export default function Brains() {
  const [brains, setBrains] = useState<BrainItem[]>([]);
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [providers, setProviders] = useState<{ name: string; region: string; models: string[] }[]>([]);
  const [planFilter, setPlanFilter] = useState<"free" | "pro" | "enterprise">("pro");
  const [query, setQuery] = useState("");
  const [teamPlan, setTeamPlan] = useState<BrainTeamPlan | null>(null);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    fetch(`/api/brains?plan=${planFilter}`)
      .then((r) => r.json())
      .then((d) => {
        setBrains(d.brains || []);
        setStats(d.stats || null);
      })
      .catch(() => toast.error("โหลด Brain catalog ไม่สำเร็จ"));

    fetch("/api/brains/providers")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers || []))
      .catch(() => {});
  }, [planFilter]);

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setPlanning(true);
    try {
      const res = await fetch("/api/brains/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query.trim() }),
      });
      const data = await res.json();
      setTeamPlan(data);
    } catch {
      toast.error("วางแผนทีมไม่สำเร็จ");
    } finally {
      setPlanning(false);
    }
  }

  const regionEmoji: Record<string, string> = {
    usa: "🇺🇸", china: "🇨🇳", japan: "🇯🇵", india: "🇮🇳", europe: "🇪🇺", global: "🌍",
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Brain Marketplace</h1>
              <p className="text-sm text-muted-foreground">App Store ของสมอง AI — เลือกสมอง เลือก Agent เลือกวิธีทำงาน</p>
            </div>
          </div>
          {stats && (
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">{stats.totalBrains} Brains</span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">{stats.totalCategories} Categories</span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">{stats.totalProviders} Global Providers</span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">{stats.freeBrains} Free</span>
            </div>
          )}
        </header>

        {/* Brain Router Demo */}
        <section className="bg-card rounded-2xl border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-semibold">Nirva Brain Router</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            พิมพ์สิ่งที่ต้องการ — ระบบเลือก Brain + Agent Team ให้อัตโนมัติ
          </p>
          <form onSubmit={handlePlan} className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='เช่น "ช่วยเปิดบริษัทใหม่" หรือ "จัดการให้"'
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
            />
            <button
              type="submit"
              disabled={planning || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
            >
              {planning ? "กำลังวางแผน..." : "วางแผนทีม"}
            </button>
          </form>
          {teamPlan && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-violet-900">{teamPlan.intentTh}</p>
              <p className="text-violet-700">{teamPlan.reasoningTh}</p>
              <div className="flex flex-wrap gap-1.5">
                {teamPlan.categories.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-full bg-white text-violet-700 text-xs font-medium border border-violet-200">{c}</span>
                ))}
              </div>
              <p className="text-xs text-violet-600">
                Agents: {teamPlan.agents.join(" · ")} · Workflow: {teamPlan.workflow}
              </p>
            </div>
          )}
        </section>

        {/* Plan filter */}
        <div className="flex gap-2 mb-6">
          {(["free", "pro", "enterprise"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                planFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === "free" ? "ฟรี" : p === "pro" ? "Pro" : "Enterprise"}
            </button>
          ))}
        </div>

        {/* Brain cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {brains.map((brain) => {
            const Icon = CATEGORY_ICONS[brain.category] || Brain;
            return (
              <div key={brain.id} className="bg-card rounded-2xl border border-border p-5 hover:border-violet-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${brain.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: brain.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{brain.nameTh}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        brain.minPlan === "free" ? "bg-green-100 text-green-700" : "bg-violet-100 text-violet-700"
                      }`}>
                        {brain.minPlan}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{brain.descriptionTh}</p>
                    <div className="flex flex-wrap gap-1">
                      {brain.agents.map((a) => (
                        <span key={a} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global providers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Global AI Providers</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.map((p) => (
              <div key={p.name} className="bg-card rounded-xl border border-border px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span>{regionEmoji[p.region] || "🌍"}</span>
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{p.models.slice(0, 3).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-8 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          v0.15 Foundation — ดู docs/NIRVA_BRAIN_OS.md สำหรับ roadmap เต็ม
        </p>
      </main>
    </div>
  );
}
