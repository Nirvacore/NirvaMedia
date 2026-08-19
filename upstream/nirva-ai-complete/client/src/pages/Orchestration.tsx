import Sidebar from "@/components/Sidebar";
import { Cpu, Zap, Crown, Leaf, DollarSign, Shield } from "lucide-react";
import { useEffect, useState } from "react";

type OrchestrationSummary = {
  routerAgent: string;
  roleTh: string;
  tiers: Record<string, { label: string; labelTh: string; description: string }>;
  flow: string[];
};

type CostStats = {
  freePercent: number;
  lowCostPercent: number;
  premiumPercent: number;
  totalCostUsd: number;
  savingsPercent: number;
  totalCalls: number;
};

type RouteResult = {
  agent: string;
  recommendedTier: string;
  model: { name: string; tier: string };
  reasoningTh: string;
  ruleHits: string[];
};

const tierIcon = {
  free: Leaf,
  low_cost: DollarSign,
  premium: Crown,
};

const tierColor = {
  free: "text-green-600 bg-green-50 border-green-200",
  low_cost: "text-amber-600 bg-amber-50 border-amber-200",
  premium: "text-violet-600 bg-violet-50 border-violet-200",
};

export default function Orchestration() {
  const [summary, setSummary] = useState<OrchestrationSummary | null>(null);
  const [cost, setCost] = useState<CostStats | null>(null);
  const [task, setTask] = useState("สร้างระบบ ERP ใหม่");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/orchestration").then((r) => r.json()).then(setSummary).catch(() => {});
    fetch("/api/orchestration/cost").then((r) => r.json()).then(setCost).catch(() => {});
  }, []);

  async function tryRoute() {
    setLoading(true);
    try {
      const res = await fetch("/api/orchestration/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: task, agent: "ARCH" }),
      });
      setResult(await res.json());
      const costRes = await fetch("/api/orchestration/cost");
      setCost(await costRes.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-5xl">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">v0.14 Model Orchestration Live</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">ROUTER — AI Resource Manager</h1>
          <p className="text-muted-foreground max-w-2xl">
            เลือก Model ให้เหมาะกับงาน — ไม่ใช้ AI ราคาแพงทุกงาน เหมือนบริษัทจริง: ไม่เอา CEO ไปทำเอกสาร
          </p>
        </header>

        {cost && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Free วันนี้</p>
              <p className="text-2xl font-bold text-green-600">{cost.freePercent}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Paid วันนี้</p>
              <p className="text-2xl font-bold text-amber-600">{cost.lowCostPercent + cost.premiumPercent}%</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">Cost วันนี้</p>
              <p className="text-2xl font-bold">${cost.totalCostUsd.toFixed(4)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground mb-1">ประหยัดได้</p>
              <p className="text-2xl font-bold text-primary">{cost.savingsPercent}%</p>
            </div>
          </section>
        )}

        {summary && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Model Tiers</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(summary.tiers).map(([key, tier]) => {
                const Icon = tierIcon[key as keyof typeof tierIcon] || Cpu;
                return (
                  <div key={key} className={`rounded-2xl border p-5 ${tierColor[key as keyof typeof tierColor] || ""}`}>
                    <Icon className="w-5 h-5 mb-2" />
                    <h3 className="font-semibold">{tier.labelTh}</h3>
                    <p className="text-xs mt-1 opacity-80">{tier.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">ทดลอง ROUTER</h2>
          </div>
          <textarea
            className="w-full rounded-xl border border-border bg-background p-3 text-sm mb-3 min-h-[80px]"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="พิมพ์งาน เช่น สร้างระบบ ERP ใหม่"
          />
          <button
            type="button"
            onClick={tryRoute}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {loading ? "กำลังวิเคราะห์..." : "ROUTER → เลือก Model สำหรับ ARCH"}
          </button>
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-muted/50 text-sm">
              <p><strong>Model:</strong> {result.model.name} ({result.recommendedTier})</p>
              <p className="text-muted-foreground mt-1">{result.reasoningTh}</p>
              {result.ruleHits?.length > 0 && (
                <p className="text-xs mt-2">Rules: {result.ruleHits.join(", ")}</p>
              )}
            </div>
          )}
        </section>

        {summary && (
          <section className="rounded-2xl border border-dashed border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Flow</h2>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{summary.flow.join(" → ")}</p>
          </section>
        )}
      </main>
    </div>
  );
}
