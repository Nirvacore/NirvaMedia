import Sidebar from "@/components/Sidebar";
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Brain, Plus, Search, Trash2, Database, Sparkles, BookOpen, RefreshCw, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  fetchMemories,
  fetchMemoryStats,
  addMemoryEntry,
  searchMemoryApi,
  deleteMemoryEntry,
  fetchObsidianStatus,
  fetchObsidianNotes,
  searchObsidianVault,
  syncObsidianVault,
  type MemoryEntry,
  type MemorySearchResult,
  type MemoryStats,
} from "@/lib/api";
import { loadClientSettings } from "@/hooks/useSettings";
import { AGENTS } from "@shared/agents";

interface ObsidianNote {
  path: string;
  score?: number;
  excerpt?: string;
}

const AGENT_OPTIONS = ["DESK", "CODE", "FLOW", "ARCH", "RAG-BUILDER", ...AGENTS.slice(0, 20).map((a) => a.name)].filter(
  (v, i, a) => a.indexOf(v) === i
);

export default function Memory() {
  const [selectedAgent, setSelectedAgent] = useState("DESK");
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const s = loadClientSettings();
  const [obsidianNotes, setObsidianNotes] = useState<ObsidianNote[]>([]);
  const [obsidianLoading, setObsidianLoading] = useState(false);
  const [obsidianRunning, setObsidianRunning] = useState<boolean | null>(null);
  const [syncResult, setSyncResult] = useState<{ indexed: number; skipped: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [obsidianQuery, setObsidianQuery] = useState("");
  const [obsidianSearchResults, setObsidianSearchResults] = useState<ObsidianNote[] | null>(null);
  const [obsidianSearching, setObsidianSearching] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [memData, statsData] = await Promise.all([
        fetchMemories(selectedAgent),
        fetchMemoryStats(),
      ]);
      setMemories(memData.memories);
      setStats(statsData);
    } catch {
      toast.error("โหลดข้อมูล memory ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    setLoading(true);
    setSearchResults(null);
    loadData();
  }, [loadData]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const data = await searchMemoryApi(selectedAgent, searchQuery.trim());
      setSearchResults(data.results);
    } catch {
      toast.error("ค้นหาไม่สำเร็จ");
    }
  }

  async function handleAdd() {
    if (!newContent.trim()) {
      toast.error("กรุณาใส่เนื้อหา");
      return;
    }
    try {
      await addMemoryEntry({
        agent: selectedAgent,
        content: newContent.trim(),
        title: newTitle.trim() || undefined,
        source: "manual",
      });
      setNewContent("");
      setNewTitle("");
      setShowAdd(false);
      await loadData();
      toast.success("เพิ่ม memory แล้ว");
    } catch {
      toast.error("เพิ่ม memory ไม่สำเร็จ");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMemoryEntry(id);
      await loadData();
      toast.success("ลบ memory แล้ว");
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  }

  async function loadObsidian() {
    setObsidianLoading(true);
    try {
      const statusData = await fetchObsidianStatus(s.obsidianUrl, s.obsidianApiKey);
      setObsidianRunning(statusData.running);
      if (statusData.running) {
        const notesData = await fetchObsidianNotes(s.obsidianUrl, s.obsidianApiKey);
        setObsidianNotes((notesData.files || []).map((f) => ({ path: f })));
      }
    } catch {
      setObsidianRunning(false);
    } finally {
      setObsidianLoading(false);
    }
  }

  async function handleSyncObsidian() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const data = await syncObsidianVault({
        agent: selectedAgent,
        url: s.obsidianUrl,
        apiKey: s.obsidianApiKey,
        maxFiles: 100,
      });
      setSyncResult({ indexed: data.indexed, skipped: data.skipped });
      toast.success(`Sync เสร็จ — ${data.indexed} notes → Qdrant`);
      await loadData();
    } catch {
      toast.error("Sync Obsidian ไม่สำเร็จ");
    } finally {
      setSyncing(false);
    }
  }

  async function handleObsidianSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!obsidianQuery.trim()) return;
    setObsidianSearching(true);
    try {
      const data = await searchObsidianVault(obsidianQuery.trim(), s.obsidianUrl, s.obsidianApiKey);
      setObsidianSearchResults(data.results as ObsidianNote[]);
    } catch {
      toast.error("ค้นหาใน Obsidian ไม่สำเร็จ");
    } finally {
      setObsidianSearching(false);
    }
  }

  const displayList = searchResults ?? memories;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-5xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Agent Memory</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              จัดการความจำของ agent ผ่าน Qdrant vector database — ใช้ใน RAG pipeline ตอนแชท
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Memory
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Database className="w-3.5 h-3.5" />
                Qdrant Status
              </div>
              <p className={`text-lg font-bold ${stats.qdrant === "running" ? "text-green-600" : "text-amber-600"}`}>
                {stats.qdrant === "running" ? "Online" : "Offline (SQLite fallback)"}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Vector Points
              </div>
              <p className="text-lg font-bold text-foreground">{stats.pointsCount}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="text-muted-foreground text-xs mb-1">Collection</div>
              <p className="text-lg font-bold text-foreground font-mono">{stats.collection}</p>
            </div>
          </div>
        )}

        {/* Agent selector + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground"
          >
            {AGENT_OPTIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา memory (semantic search)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          </form>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-6 space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="หัวข้อ (ไม่บังคับ)"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="เนื้อหาที่ต้องการให้ agent จำ..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}

        {/* Memory list */}
        {loading ? (
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : displayList.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">ยังไม่มี memory สำหรับ {selectedAgent}</p>
            <p className="text-muted-foreground text-xs mt-1">เพิ่ม knowledge base หรือแชทกับ agent เพื่อสร้างความจำอัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {searchResults && (
              <p className="text-xs text-muted-foreground mb-2">
                ผลการค้นหา {searchResults.length} รายการ —{" "}
                <button onClick={() => setSearchResults(null)} className="text-primary underline">แสดงทั้งหมด</button>
              </p>
            )}
            {displayList.map((mem) => (
              <div key={mem.id} className="bg-card rounded-2xl border border-border p-5 group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">{mem.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-mono">
                        {mem.source}
                      </span>
                      {"score" in mem && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-mono">
                          score: {(mem as MemorySearchResult).score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{mem.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                      {new Date(mem.createdAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Obsidian Vault */}
        <section className="mt-12 pt-8 border-t border-border">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Obsidian Vault</h2>
                <p className="text-muted-foreground text-sm">ค้นหา note หรือ Sync → Qdrant เพื่อ index ทั้ง vault</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadObsidian}
                disabled={obsidianLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${obsidianLoading ? "animate-spin" : ""}`} />
                รีเฟรช
              </button>
              {obsidianRunning && (
                <button
                  onClick={handleSyncObsidian}
                  disabled={syncing}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  Sync → Qdrant
                </button>
              )}
            </div>
          </div>

          {syncResult && (
            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 mb-4">
              Indexed {syncResult.indexed} notes, skipped {syncResult.skipped}
            </p>
          )}

          {!s.obsidianUrl ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm font-medium">ยังไม่ได้ตั้งค่า Obsidian URL</p>
              <p className="text-muted-foreground text-xs mt-1 mb-4">ไปที่ Settings → Integrations</p>
              <Link href="/settings" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
                เปิด Settings
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm mb-4">
                {obsidianRunning === true && <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-green-700 font-medium">Obsidian Connected</span></>}
                {obsidianRunning === false && <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-600 font-medium">Obsidian Offline</span></>}
                {obsidianRunning === null && <span className="text-muted-foreground text-xs">กดรีเฟรชเพื่อตรวจสอบการเชื่อมต่อ</span>}
              </div>

              {obsidianRunning && (
                <div className="space-y-3">
                  <form onSubmit={handleObsidianSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={obsidianQuery}
                      onChange={(e) => { setObsidianQuery(e.target.value); if (!e.target.value) setObsidianSearchResults(null); }}
                      placeholder="ค้นหาใน Obsidian Vault..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                    />
                    <button
                      type="submit"
                      disabled={obsidianSearching || !obsidianQuery.trim()}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {obsidianSearching
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Search className="w-3.5 h-3.5" />}
                      ค้นหา
                    </button>
                    {obsidianSearchResults && (
                      <button
                        type="button"
                        onClick={() => { setObsidianSearchResults(null); setObsidianQuery(""); }}
                        className="px-3 py-2.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:bg-muted"
                      >
                        ล้าง
                      </button>
                    )}
                  </form>

                  <p className="text-xs text-muted-foreground">
                    {obsidianSearchResults
                      ? `${obsidianSearchResults.length} ผลลัพธ์ จาก "${obsidianQuery}"`
                      : obsidianNotes.length > 0
                        ? `${obsidianNotes.length} notes ใน Vault`
                        : "ไม่มี notes"}
                  </p>

                  {(obsidianSearchResults ?? obsidianNotes.slice(0, 50)).map((note) => (
                    <div key={note.path} className="bg-card rounded-xl border border-border px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{note.path}</span>
                        {note.score !== undefined && (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-100 text-[10px] text-violet-700 font-mono">
                            {note.score.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {note.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{note.excerpt}</p>
                      )}
                    </div>
                  ))}

                  {!obsidianSearchResults && obsidianNotes.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      แสดง 50 จาก {obsidianNotes.length} — ใช้ช่องค้นหาเพื่อกรอง
                    </p>
                  )}
                </div>
              )}

              {obsidianRunning === false && (
                <div className="bg-card rounded-2xl border border-dashed border-red-200 p-8 text-center">
                  <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground text-sm font-medium">เชื่อมต่อ Obsidian ไม่ได้</p>
                  <p className="text-muted-foreground text-xs mt-1">ตรวจสอบว่า Obsidian เปิดอยู่และ Local REST API plugin ทำงานที่ port 27124</p>
                  <a
                    href="obsidian://open"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> เปิด Obsidian
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
