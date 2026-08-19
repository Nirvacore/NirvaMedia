import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { Globe, Key, CheckCircle2, XCircle, Cpu, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { fetchProviderHub, type ProviderHubEntry } from "@/lib/api";
import { loadClientSettings } from "@/hooks/useSettings";

export default function Providers() {
  const [providers, setProviders] = useState<ProviderHubEntry[]>([]);
  const [configured, setConfigured] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderHub()
      .then((d) => {
        setProviders(d.providers);
        setConfigured(d.configured);
      })
      .catch(() => toast.error("โหลด Provider Hub ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const s = loadClientSettings();
  const hasCloudKey = Boolean(s.openaiApiKey || s.anthropicApiKey || s.googleApiKey || s.deepseekApiKey);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">LLM Provider Hub</h1>
              <p className="text-sm text-muted-foreground">
                GPT · Claude · Gemini · DeepSeek — ROUTER เลือก provider อัตโนมัติ
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {configured} configured
            </span>
            {!hasCloudKey && (
              <Link href="/settings" className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium hover:bg-amber-200">
                → ใส่ API keys ใน Settings
              </Link>
            )}
          </div>
        </header>

        {loading ? (
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {providers.map((p) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{p.region}</span>
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{p.envKey}</p>
                  </div>
                  {p.status === "online" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : p.status === "unconfigured" ? (
                    <Key className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.models.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">{m}</span>
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  p.status === "online" ? "text-green-700" : p.status === "unconfigured" ? "text-muted-foreground" : "text-amber-700"
                }`}>
                  {p.status === "online" ? "พร้อมใช้งาน" : p.status === "unconfigured" ? "ยังไม่ได้ตั้งค่า API key" : "offline"}
                </p>
              </div>
            ))}
          </div>
        )}

        <section className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Smart Brain Routing</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            เมื่อ ROUTER เลือก tier premium/low_cost ระบบจะเรียก cloud API อัตโนมัติ (ถ้ามี key)
            หาก cloud ล้มเหลว → fallback ไป Ollama
          </p>
          <div className="flex gap-3">
            <Link href="/orchestration" className="text-sm text-primary hover:underline">ดู ROUTER →</Link>
            <Link href="/brains" className="text-sm text-primary hover:underline">Brain Marketplace →</Link>
            <Link href="/settings" className="text-sm text-primary hover:underline">API Keys →</Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          v0.17 Provider Hub — keys เก็บใน localStorage (Settings)
        </p>
      </main>
    </div>
  );
}
