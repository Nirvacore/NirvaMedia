import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { Save, Server, Key, Volume2, Bell, Info, ExternalLink, Brain, BookOpen, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { loadClientSettings, saveSettings, type NirvaSettings } from "@/hooks/useSettings";
import { fetchOllamaModels, fetchObsidianStatus, syncObsidianVault, testProviderApi } from "@/lib/api";

interface SettingsSection {
  id: string;
  label: string;
  icon: typeof Server;
}

const sections: SettingsSection[] = [
  { id: "llm", label: "LLM / Models", icon: Server },
  { id: "api", label: "API Keys", icon: Key },
  { id: "integrations", label: "Integrations", icon: Brain },
  { id: "voice", label: "Voice / TTS", icon: Volume2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "about", label: "About", icon: Info },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("llm");
  const [settings, setSettings] = useState<NirvaSettings>(loadClientSettings);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  function updateSetting<K extends keyof NirvaSettings>(key: K, value: NirvaSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    saveSettings(settings);
    toast.success("บันทึกการตั้งค่าแล้ว");
    try {
      const data = await fetchOllamaModels();
      setAvailableModels(data.models.map((m) => m.name));
    } catch {
      /* Ollama may be offline */
    }
  }

  async function testOllamaConnection() {
    try {
      const data = await fetchOllamaModels();
      setAvailableModels(data.models.map((m) => m.name));
      toast.success(`เชื่อมต่อ Ollama สำเร็จ — ${data.models.length} models`);
    } catch {
      toast.error("เชื่อมต่อ Ollama ไม่ได้", { description: "ตรวจสอบ URL และว่า Ollama กำลังทำงาน" });
    }
  }

  const modelOptions = availableModels.length > 0
    ? availableModels
    : ["llama3.1:8b", "codellama:13b", "mistral:7b", "qwen2:7b"];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">ตั้งค่าระบบ Nirva AI Core</p>
        </header>

        <div className="flex gap-8">
          <nav className="w-52 flex-shrink-0">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      activeSection === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 max-w-2xl">
            {activeSection === "llm" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">LLM Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Ollama Endpoint</label>
                      <input
                        type="text"
                        value={settings.ollamaUrl}
                        onChange={(e) => updateSetting("ollamaUrl", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">URL ของ Ollama server</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Default Model</label>
                      <select
                        value={settings.defaultModel}
                        onChange={(e) => updateSetting("defaultModel", e.target.value)}
                        disabled={settings.useOrchestration}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        {modelOptions.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={testOllamaConnection}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        ทดสอบการเชื่อมต่อ Ollama
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Model ROUTER</h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-foreground">ใช้ ROUTER เลือก model อัตโนมัติ</p>
                        <p className="text-xs text-muted-foreground">Chat และ Control Tower จะใช้ tier ตามความยากของงาน</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.useOrchestration}
                        onChange={(e) => updateSetting("useOrchestration", e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary/30"
                      />
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        งบ Premium สูงสุดต่อวัน ({settings.maxPremiumPercent}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={settings.maxPremiumPercent}
                        onChange={(e) => updateSetting("maxPremiumPercent", Number(e.target.value))}
                        disabled={!settings.useOrchestration}
                        className="w-full disabled:opacity-50"
                      />
                    </div>
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-foreground">เน้น self-hosted (Ollama)</p>
                        <p className="text-xs text-muted-foreground">งานที่มีความเป็นส่วนตัวสูงจะใช้ model ในเครื่อง</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.preferSelfHosted}
                        onChange={(e) => updateSetting("preferSelfHosted", e.target.checked)}
                        disabled={!settings.useOrchestration}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary/30 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Vector Database</h2>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Qdrant Endpoint</label>
                    <input
                      type="text"
                      value={settings.qdrantUrl}
                      onChange={(e) => updateSetting("qdrantUrl", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Workflow Engine</h2>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">n8n Endpoint</label>
                    <input
                      type="text"
                      value={settings.n8nUrl}
                      onChange={(e) => updateSetting("n8nUrl", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "api" && (
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-2">Cloud LLM API Keys</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  เก็บใน localStorage — ROUTER เรียก cloud เมื่อ tier premium/low_cost (fallback → Ollama)
                </p>
                <div className="space-y-4">
                  {([
                    { key: "openaiApiKey" as const, provider: "openai", label: "OpenAI", placeholder: "sk-...", hint: "GPT-4o, GPT-4o-mini" },
                    { key: "anthropicApiKey" as const, provider: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", hint: "Claude Sonnet / Opus" },
                    { key: "googleApiKey" as const, provider: "google", label: "Google Gemini", placeholder: "AIza...", hint: "Gemini 2.0 Flash / Pro" },
                    { key: "deepseekApiKey" as const, provider: "deepseek", label: "DeepSeek", placeholder: "sk-...", hint: "deepseek-chat, deepseek-coder" },
                    { key: "mistralApiKey" as const, provider: "mistral", label: "Mistral AI", placeholder: "...", hint: "mistral-large (coming soon)" },
                  ]).map((item) => (
                    <div key={item.key}>
                      <label className="block text-sm font-medium text-foreground mb-1.5">{item.label}</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={settings[item.key]}
                          onChange={(e) => updateSetting(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          disabled={!settings[item.key]}
                          onClick={async () => {
                            const toastId = toast.loading(`ทดสอบ ${item.label}...`);
                            try {
                              const data = await testProviderApi(item.provider, settings[item.key]);
                              toast.dismiss(toastId);
                              if (data.ok) toast.success(`${item.label} เชื่อมต่อได้ ✓`, { description: data.message });
                              else toast.error(`${item.label} ล้มเหลว`, { description: data.message });
                            } catch {
                              toast.dismiss(toastId);
                              toast.error("ทดสอบไม่ได้");
                            }
                          }}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          ทดสอบ
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  หรือตั้งใน server env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, DEEPSEEK_API_KEY
                </p>
              </div>
            )}

            {activeSection === "integrations" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Obsidian Vault</h2>
                      <p className="text-xs text-muted-foreground">Sync Obsidian notes → Qdrant RAG memory</p>
                    </div>
                    <div className="ml-auto">
                      <button
                        onClick={() => updateSetting("useObsidian", !settings.useObsidian)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings.useObsidian ? "bg-violet-500" : "bg-muted"}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow ${settings.useObsidian ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Obsidian REST API URL</label>
                      <input
                        type="text"
                        value={settings.obsidianUrl}
                        onChange={(e) => updateSetting("obsidianUrl", e.target.value)}
                        placeholder="http://localhost:27124"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Install &quot;Local REST API&quot; plugin in Obsidian → enable → copy API key
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Obsidian API Key</label>
                      <input
                        type="password"
                        value={settings.obsidianApiKey}
                        onChange={(e) => updateSetting("obsidianApiKey", e.target.value)}
                        placeholder="your-obsidian-api-key"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          try {
                            const data = await fetchObsidianStatus(settings.obsidianUrl, settings.obsidianApiKey);
                            if (data.running) toast.success("Obsidian เชื่อมต่อได้แล้ว ✓");
                            else toast.error("Obsidian ไม่ตอบสนอง — ตรวจสอบ plugin");
                          } catch {
                            toast.error("ทดสอบไม่ได้");
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        ทดสอบ
                      </button>
                      <button
                        onClick={async () => {
                          const toastId = toast.loading("กำลัง sync vault...");
                          try {
                            const data = await syncObsidianVault({
                              url: settings.obsidianUrl,
                              apiKey: settings.obsidianApiKey,
                              agent: "GATHER",
                            });
                            toast.dismiss(toastId);
                            toast.success(`Sync เสร็จ — ${data.indexed} notes indexed, ${data.skipped} skipped`);
                          } catch {
                            toast.dismiss(toastId);
                            toast.error("Sync ไม่ได้");
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Sync Vault → RAG
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "voice" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Text-to-Speech</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">เปิดใช้ TTS</p>
                        <p className="text-xs text-muted-foreground">AI จะพูดตอบกลับ</p>
                      </div>
                      <button
                        onClick={() => updateSetting("ttsEnabled", !settings.ttsEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? "bg-primary" : "bg-muted"}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? "translate-x-5.5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">ความเร็วเสียง: {settings.ttsSpeed}x</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.ttsSpeed}
                        onChange={(e) => updateSetting("ttsSpeed", parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Wake Word</h2>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">คำปลุก</label>
                    <input
                      type="text"
                      value={settings.wakeWord}
                      onChange={(e) => updateSetting("wakeWord", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">แจ้งเตือนเมื่องานเสร็จ</p>
                    </div>
                    <button
                      onClick={() => updateSetting("notifyOnComplete", !settings.notifyOnComplete)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyOnComplete ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.notifyOnComplete ? "translate-x-5.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">แจ้งเตือนเมื่อเกิดข้อผิดพลาด</p>
                    </div>
                    <button
                      onClick={() => updateSetting("notifyOnError", !settings.notifyOnError)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifyOnError ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.notifyOnError ? "translate-x-5.5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "about" && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Nirva AI Core</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="text-foreground font-medium">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agents</span>
                      <span className="text-foreground font-medium">109 registered</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ollama</span>
                      <span className="text-foreground font-mono text-xs">{settings.ollamaUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stack</span>
                      <span className="text-foreground">React + Express + Ollama</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Links</h2>
                  <div className="space-y-2">
                    {[
                      { label: "GitHub Repository", url: "https://github.com/Nirvacore/nirva-AI" },
                      { label: "Documentation", url: "https://github.com/Nirvacore/nirva-AI/blob/main/README.md" },
                    ].map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-muted/40 transition-colors group"
                      >
                        <span className="text-sm text-foreground">{link.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection !== "about" && (
              <div className="mt-8">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all active:scale-97"
                >
                  <Save className="w-4 h-4" />
                  บันทึกการตั้งค่า
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
