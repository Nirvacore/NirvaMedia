import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Server, Cloud, Leaf, Cpu, MessageSquare, Zap, Shield, Code, FileText, Brain, Users, TrendingUp, Palette, Globe, BookOpen, Pencil, Save, X, Plus, Trash2, Download, Upload } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { fetchAgentDetail, updateAgentDetail, type AgentDetail } from "@/lib/api";

type Tier = "self-hosted" | "hybrid" | "cloud";

const AGENT_ICONS: Record<string, typeof Cpu> = {
  DESK: Brain, FLOW: Zap, CARE: Users, TALLY: TrendingUp, COIN: TrendingUp,
  ARCH: Code, CODE: Code, SEAL: Shield, BLOOM: Palette, TEACH: BookOpen,
  REACH: MessageSquare, BRIEF: FileText, SAGE: Globe,
};

function getAgentIcon(name: string) {
  return AGENT_ICONS[name] || Cpu;
}

const tierConfig = {
  "self-hosted": { label: "Self-Hosted", color: "bg-primary/10 text-primary border-primary/20", icon: Server, dot: "bg-primary" },
  "hybrid": { label: "Hybrid", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Cloud, dot: "bg-amber-500" },
  "cloud": { label: "Cloud", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Leaf, dot: "bg-violet-500" },
};

export default function AgentDetail() {
  const params = useParams<{ name: string }>();
  const [, navigate] = useLocation();
  const agentName = params.name?.toUpperCase() || "";

  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCapabilities, setEditCapabilities] = useState<string[]>([]);
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editUseCases, setEditUseCases] = useState<string[]>([]);
  const [editModel, setEditModel] = useState("");
  const [newCapability, setNewCapability] = useState("");
  const [newTool, setNewTool] = useState("");
  const [newUseCase, setNewUseCase] = useState("");
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentName) return;
    setLoading(true);
    fetchAgentDetail(agentName)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [agentName]);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 ml-[72px] p-10 flex items-center justify-center">
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 ml-[72px] p-10 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">ไม่พบ Agent</h1>
            <p className="text-muted-foreground mb-6">ไม่พบข้อมูลของ Agent "{agentName}"</p>
            <button onClick={() => navigate("/agents")} className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity">
              กลับไปหน้า Agent Directory
            </button>
          </div>
        </main>
      </div>
    );
  }

  const config = tierConfig[detail.tier as Tier];
  const IconComponent = getAgentIcon(detail.name);

  function startEditing() {
    setEditPrompt(detail!.systemPrompt);
    setEditDescription(detail!.description);
    setEditCapabilities([...detail!.capabilities]);
    setEditTools([...detail!.tools]);
    setEditUseCases([...detail!.useCases]);
    setEditModel(detail!.model);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setNewCapability("");
    setNewTool("");
    setNewUseCase("");
  }

  function saveEditing() {
    const updatedData = {
      systemPrompt: editPrompt,
      description: editDescription,
      capabilities: editCapabilities,
      tools: editTools,
      useCases: editUseCases,
      model: editModel,
    };
    updateAgentDetail(agentName, updatedData)
      .then((updated) => {
        setDetail(updated);
        setIsEditing(false);
        toast.success("บันทึกการเปลี่ยนแปลงเรียบร้อย", { description: `อัปเดตข้อมูล ${detail!.name} สำเร็จ` });
      })
      .catch(() => toast.error("บันทึกไม่สำเร็จ"));
    setNewCapability("");
    setNewTool("");
    setNewUseCase("");
  }

  function addCapability() {
    if (newCapability.trim()) {
      setEditCapabilities([...editCapabilities, newCapability.trim()]);
      setNewCapability("");
    }
  }

  function removeCapability(index: number) {
    setEditCapabilities(editCapabilities.filter((_, i) => i !== index));
  }

  function addTool() {
    if (newTool.trim()) {
      setEditTools([...editTools, newTool.trim()]);
      setNewTool("");
    }
  }

  function removeTool(index: number) {
    setEditTools(editTools.filter((_, i) => i !== index));
  }

  function addUseCase() {
    if (newUseCase.trim()) {
      setEditUseCases([...editUseCases, newUseCase.trim()]);
      setNewUseCase("");
    }
  }

  function removeUseCase(index: number) {
    setEditUseCases(editUseCases.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-5xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/agents")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          กลับไปหน้า Agent Directory
        </button>

        {/* Agent Header */}
        <header className="mb-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/8 border-2 border-primary/15 flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-9 h-9 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground font-mono tracking-tight">{detail.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-lg text-muted-foreground mb-1">{detail.role}</p>
              <p className="text-sm text-muted-foreground/70">{detail.category}</p>
            </div>
            {/* Edit / Save / Cancel Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={saveEditing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-97"
                  >
                    <Save className="w-4 h-4" />
                    บันทึก
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-all duration-200 active:scale-97"
                  >
                    <X className="w-4 h-4" />
                    ยกเลิก
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const exportData = {
                        name: detail.name,
                        role: detail.role,
                        tier: detail.tier,
                        category: detail.category,
                        systemPrompt: detail.systemPrompt,
                        capabilities: detail.capabilities,
                        tools: detail.tools,
                        model: detail.model,
                        description: detail.description,
                        useCases: detail.useCases,
                      };
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `agent-${detail.name.toLowerCase()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Export สำเร็จ");
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/60 hover:text-foreground transition-all duration-200 active:scale-97 border border-border"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <label
                    className="flex items-center gap-2 px-3 py-2.5 text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/60 hover:text-foreground transition-all duration-200 active:scale-97 border border-border cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const data = JSON.parse(ev.target?.result as string);
                            if (data.systemPrompt) {
                              localStorage.setItem(`agent-edit-${detail.name}`, JSON.stringify(data));
                              toast.success("Import สำเร็จ — กรุณา refresh หน้า");
                            } else {
                              toast.error("ไฟล์ไม่ถูกต้อง");
                            }
                          } catch {
                            toast.error("ไม่สามารถอ่านไฟล์ JSON ได้");
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/15 transition-all duration-200 active:scale-97 border border-primary/20"
                  >
                    <Pencil className="w-4 h-4" />
                    แก้ไข
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Description */}
        <section className="mb-8 p-6 rounded-2xl bg-card border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">คำอธิบาย</h2>
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-4 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              rows={3}
            />
          ) : (
            <p className="text-foreground leading-relaxed">{detail.description}</p>
          )}
        </section>

        {/* System Prompt */}
        <section className="mb-8 p-6 rounded-2xl bg-card border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Prompt</h2>
          {isEditing ? (
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="w-full p-5 rounded-xl border border-border bg-muted/20 text-foreground text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              rows={8}
            />
          ) : (
            <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{detail.systemPrompt}</pre>
            </div>
          )}
        </section>

        {/* Capabilities & Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Capabilities */}
          <section className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">ความสามารถ</h2>
            {isEditing ? (
              <div className="space-y-2">
                {editCapabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-foreground flex-1">{cap}</span>
                    <button
                      onClick={() => removeCapability(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <input
                    type="text"
                    value={newCapability}
                    onChange={(e) => setNewCapability(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCapability()}
                    placeholder="เพิ่มความสามารถใหม่..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={addCapability}
                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {detail.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-foreground">{cap}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tools */}
          <section className="p-6 rounded-2xl bg-card border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">เครื่องมือที่ใช้</h2>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editTools.map((tool, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-xs font-medium text-foreground group">
                      {tool}
                      <button
                        onClick={() => removeTool(i)}
                        className="opacity-50 hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <input
                    type="text"
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTool()}
                    placeholder="เพิ่มเครื่องมือใหม่..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={addTool}
                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.tools.map((tool, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-xs font-medium text-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">โมเดลที่ใช้</h3>
              {isEditing ? (
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                />
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15 text-xs font-mono font-semibold text-primary">
                  {detail.model}
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Use Cases */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">ตัวอย่างการใช้งาน</h2>
          {isEditing ? (
            <div className="space-y-2">
              {editUseCases.map((useCase, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/30 group">
                  <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed flex-1">{useCase}</span>
                  <button
                    onClick={() => removeUseCase(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <input
                  type="text"
                  value={newUseCase}
                  onChange={(e) => setNewUseCase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUseCase()}
                  placeholder="เพิ่มตัวอย่างการใช้งานใหม่..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={addUseCase}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.useCases.map((useCase, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
                  <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{useCase}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
