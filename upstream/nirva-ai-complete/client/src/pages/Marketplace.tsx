import Sidebar from "@/components/Sidebar";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import {
  Store, Search, Download, Star, Upload, Sparkles, Bot,
  FileJson, Tag, User, ChevronDown,
} from "lucide-react";
import { AGENTS } from "@shared/agents";
import {
  fetchMarketplace,
  importMarketplacePack,
  rateMarketplacePack,
  publishMarketplacePack,
  exportAgentPack,
  importAgentPackJson,
  type MarketplaceListing,
} from "@/lib/api";
import { toast } from "sonner";

export default function Marketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [stats, setStats] = useState({ total: 0, totalDownloads: 0, featuredCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplace({
        search: search || undefined,
        featured: featuredOnly || undefined,
      });
      setListings(data.listings);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }, [search, featuredOnly]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleImport = async (id: string) => {
    try {
      const result = await importMarketplacePack(id);
      toast.success(`Imported pack to ${result.agent.name}`);
      load();
    } catch {
      toast.error("Import failed");
    }
  };

  const handleRate = async (id: string, stars: number) => {
    try {
      await rateMarketplacePack(id, stars);
      toast.success("Thanks for rating!");
      load();
    } catch {
      toast.error("Rating failed");
    }
  };

  const handleExport = async (agentName: string) => {
    try {
      const { pack } = await exportAgentPack(agentName);
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${agentName.toLowerCase()}-pack.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${agentName} pack`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleJsonImport = async (file: File) => {
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      const result = await importAgentPackJson(pack);
      toast.success(`Imported JSON to ${result.agent.name}`);
    } catch {
      toast.error("Invalid agent pack JSON");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Agent Marketplace</h1>
                <p className="text-sm text-muted-foreground">
                  แชร์และนำเข้า agent configuration — ร่วมกับ Nirva Ecosystem
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                Import JSON
              </button>
              <button
                onClick={() => setShowPublish(!showPublish)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" />
                Publish Pack
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleJsonImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {stats.total > 0 && (
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {stats.total} Packs
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                {stats.totalDownloads} Downloads
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                {stats.featuredCount} Featured
              </span>
            </div>
          )}
        </header>

        {showPublish && (
          <PublishForm
            onClose={() => setShowPublish(false)}
            onPublished={() => { setShowPublish(false); load(); }}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหา pack, agent, หรือ tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              featuredOnly
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Featured
          </button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        ) : listings.length === 0 ? (
          <p className="text-muted-foreground text-sm">ไม่พบ pack ที่ตรงกับการค้นหา</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing) => (
              <PackCard
                key={listing.id}
                listing={listing}
                onImport={handleImport}
                onRate={handleRate}
                onExport={handleExport}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PackCard({
  listing,
  onImport,
  onRate,
  onExport,
}: {
  listing: MarketplaceListing;
  onImport: (id: string) => void;
  onRate: (id: string, stars: number) => void;
  onExport: (agent: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{listing.title}</h3>
              {listing.featured && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Featured</span>
              )}
            </div>
            <Link href={`/agents/${listing.agentName}`}>
              <span className="text-xs text-primary font-mono hover:underline">{listing.agentName}</span>
            </Link>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-semibold">{listing.rating || "—"}</span>
            <span className="text-[10px] text-muted-foreground">({listing.ratingCount})</span>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
            <Download className="w-3 h-3" /> {listing.downloads}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>

      {listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {listing.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Tag className="w-2.5 h-2.5" /> {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <User className="w-3 h-3" />
        <span>{listing.author}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "ซ่อนรายละเอียด" : "ดู capabilities"}
      </button>

      {expanded && (
        <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
          <p><span className="font-medium text-foreground">Model:</span> {listing.config.model}</p>
          <p><span className="font-medium text-foreground">Tools:</span> {listing.config.tools.join(", ")}</p>
          <p><span className="font-medium text-foreground">Capabilities:</span> {listing.config.capabilities.join(", ")}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border mt-auto">
        <button
          onClick={() => onImport(listing.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
        >
          <Download className="w-3.5 h-3.5" />
          Import to Agent
        </button>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => onRate(listing.id, s)}
              className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
              title={`Rate ${s} stars`}
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <button
          onClick={() => onExport(listing.agentName)}
          className="p-2 rounded-xl border border-border hover:bg-muted/60"
          title="Export JSON"
        >
          <FileJson className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PublishForm({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [agentName, setAgentName] = useState("CODE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await publishMarketplacePack({
        agentName,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Pack published!");
      onPublished();
    } catch {
      toast.error("Publish failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-5 rounded-2xl border border-primary/20 bg-primary/5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Publish Agent Pack</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Agent</label>
          <select
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm"
          >
            {AGENTS.map((a) => (
              <option key={a.name} value={a.name}>{a.name} — {a.role}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Custom Pack"
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="rag, api, security"
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Publishing..." : "Publish"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
      </div>
    </div>
  );
}
