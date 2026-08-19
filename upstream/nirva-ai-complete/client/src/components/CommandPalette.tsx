import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, Network, MessageSquare, Brain, GitBranch, ListTodo,
  Mic, Users, FolderOpen, TerminalSquare, Settings, Bot, Zap, Search, Store, Building2, BarChart3, Puzzle, BookOpen, Cpu,
} from "lucide-react";
import { AGENTS } from "@shared/agents";
import { runWorkflow } from "@/lib/api";
import { toast } from "sonner";

const PAGE_ITEMS = [
  { id: "home", label: "Dashboard", path: "/", icon: LayoutDashboard, keywords: ["home", "หน้าหลัก"] },
  { id: "demo", label: "Demo Hub", path: "/demo", icon: Zap, keywords: ["demo", "ตัวอย่าง", "deploy", "storybook"] },
  { id: "ecosystem", label: "Nirva Ecosystem", path: "/ecosystem", icon: Network, keywords: ["ecosystem", "products"] },
  { id: "organization", label: "AI Organization", path: "/organization", icon: Building2, keywords: ["organization", "company", "blueprint", "departments"] },
  { id: "orchestration", label: "Model ROUTER", path: "/orchestration", icon: Cpu, keywords: ["model", "router", "orchestration", "cost", "tier"] },
  { id: "reports", label: "Reports", path: "/reports", icon: BarChart3, keywords: ["reports", "dashboard", "status"] },
  { id: "chat", label: "Chat", path: "/chat", icon: MessageSquare, keywords: ["chat", "แชท", "ollama", "control tower", "desk"] },
  { id: "memory", label: "Memory", path: "/memory", icon: Brain, keywords: ["memory", "qdrant", "rag"] },
  { id: "workflows", label: "Workflows", path: "/workflows", icon: GitBranch, keywords: ["workflow", "n8n", "flow"] },
  { id: "tasks", label: "Tasks", path: "/tasks", icon: ListTodo, keywords: ["tasks", "งาน", "queue"] },
  { id: "voice", label: "Voice Command", path: "/voice", icon: Mic, keywords: ["voice", "เสียง", "speech"] },
  { id: "agents", label: "Agents", path: "/agents", icon: Users, keywords: ["agents", "109", "directory"] },
  { id: "marketplace", label: "Agent Marketplace", path: "/marketplace", icon: Store, keywords: ["marketplace", "pack"] },
  { id: "plugins", label: "Agent Plugins", path: "/plugins", icon: Puzzle, keywords: ["plugins", "tools", "integrations"] },
  { id: "docs", label: "API Docs", path: "/docs", icon: BookOpen, keywords: ["docs", "api", "openapi", "swagger"] },
  { id: "files", label: "Files", path: "/files", icon: FolderOpen, keywords: ["files", "ไฟล์"] },
  { id: "terminal", label: "Terminal", path: "/terminal", icon: TerminalSquare, keywords: ["terminal", "cli"] },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings, keywords: ["settings", "ตั้งค่า", "config"] },
];

const ACTION_ITEMS = [
  { id: "run-pipeline", label: "Run CODE → ARCH → SHIP", keywords: ["deploy", "pipeline", "code"], workflowId: "code-arch-ship" },
  { id: "run-health", label: "Run Ecosystem Health Check", keywords: ["health", "status", "monitor"], workflowId: "ecosystem-health" },
  { id: "run-rag", label: "Build RAG Knowledge Base", keywords: ["rag", "memory", "qdrant"], workflowId: "rag-knowledge-base" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const agentItems = useMemo(
    () => AGENTS.map((a) => ({
      id: `agent-${a.name}`,
      label: a.name,
      description: a.role,
      path: `/agents/${a.name}`,
      tier: a.tier,
      keywords: [a.name, a.role, a.category].join(" "),
    })),
    []
  );

  const runAction = useCallback(async (workflowId: string) => {
    setOpen(false);
    try {
      await runWorkflow(workflowId);
      toast.success("Workflow triggered");
    } catch {
      toast.error("Workflow failed");
    }
  }, []);

  const go = useCallback((path: string) => {
    setOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search pages, agents, and actions">
      <CommandInput placeholder="ค้นหาหน้า, agent, หรือคำสั่ง..." />
      <CommandList>
        <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>

        <CommandGroup heading="Pages">
          {PAGE_ITEMS.map((item) => (
            <CommandItem key={item.id} value={`${item.label} ${item.keywords.join(" ")}`} onSelect={() => go(item.path)}>
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Agents">
          {agentItems.slice(0, 20).map((agent) => (
            <CommandItem key={agent.id} value={`${agent.label} ${agent.keywords}`} onSelect={() => go(agent.path)}>
              <Bot className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-mono font-semibold">{agent.label}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[280px]">{agent.description}</span>
              </div>
            </CommandItem>
          ))}
          <CommandItem value="all agents browse directory" onSelect={() => go("/agents")}>
            <Search className="w-4 h-4" />
            <span>Browse all 109 agents →</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {ACTION_ITEMS.map((action) => (
            <CommandItem
              key={action.id}
              value={`${action.label} ${action.keywords.join(" ")}`}
              onSelect={() => runAction(action.workflowId)}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Nirva Command Palette</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </div>
    </CommandDialog>
  );
}
