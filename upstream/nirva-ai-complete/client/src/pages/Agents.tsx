import Sidebar from "@/components/Sidebar";
import { Search, Server, Cloud, Leaf, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AGENTS as allAgents } from "@shared/agents";

type Tier = "self-hosted" | "hybrid" | "cloud";

interface Agent {
  name: string;
  role: string;
  tier: Tier;
  category: string;
}

// allAgents imported from @shared/agents (109 agents)

const tierConfig = {
  "self-hosted": { label: "Ready", icon: Server, pill: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  "hybrid": { label: "Hybrid", icon: Cloud, pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "cloud": { label: "Cloud", icon: Leaf, pill: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

export default function Agents() {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<Tier | "all">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [, navigate] = useLocation();

  const filtered = useMemo(() => {
    return allAgents.filter((agent) => {
      const matchesSearch =
        agent.name.toLowerCase().includes(search.toLowerCase()) ||
        agent.role.toLowerCase().includes(search.toLowerCase()) ||
        agent.category.toLowerCase().includes(search.toLowerCase());
      const matchesTier = filterTier === "all" || agent.tier === filterTier;
      return matchesSearch && matchesTier;
    });
  }, [search, filterTier]);

  const grouped = useMemo(() => {
    const groups: Record<string, Agent[]> = {};
    filtered.forEach((agent) => {
      if (!groups[agent.category]) groups[agent.category] = [];
      groups[agent.category].push(agent);
    });
    return groups;
  }, [filtered]);

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-6xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Agent Directory</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3">
            Your AI Garden
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            ค้นหาและจัดการ AI Agents ทั้ง {allAgents.length} ตัว — จัดเรียงตามหมวดหมู่และระดับการ deploy
          </p>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหา agent ตามชื่อ, หน้าที่, หรือหมวดหมู่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "self-hosted", "hybrid", "cloud"] as const).map((tier) => {
              const count = tier === "all" ? allAgents.length : allAgents.filter(a => a.tier === tier).length;
              return (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 border ${
                    filterTier === tier
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {tier === "all" ? "ทั้งหมด" : tierConfig[tier].label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          แสดง <span className="font-semibold text-foreground">{filtered.length}</span> จาก {allAgents.length} agents
        </p>

        {/* Agent Groups — Garden Beds */}
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, agents]) => {
            const isCollapsed = collapsed[category];
            return (
              <section key={category} className="bg-card rounded-2xl border border-border overflow-hidden transition-all duration-200 hover:border-primary/15">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-3 px-7 py-5 text-left hover:bg-muted/20 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-primary" />
                  )}
                  <h3 className="text-base font-bold text-foreground">{category}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {agents.length}
                  </span>
                </button>

                {/* Agent Grid */}
                {!isCollapsed && (
                  <div className="px-7 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agents.map((agent) => {
                      const config = tierConfig[agent.tier];
                      return (
                        <div
                          key={agent.name}
                          onClick={() => navigate(`/agents/${agent.name.toLowerCase()}`)}
                          className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/20 hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary font-mono">
                              {agent.name.slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground font-mono truncate">{agent.name}</p>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{agent.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
