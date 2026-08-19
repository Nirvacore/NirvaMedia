import Sidebar from "@/components/Sidebar";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";

/* ─── Custom Node Components ─── */

function CoreNode({ data }: { data: { label: string; desc: string } }) {
  return (
    <div className="relative px-6 py-4 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-2 border-primary min-w-[180px] text-center">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-primary-foreground" />
      <p className="text-base font-bold">{data.label}</p>
      <p className="text-xs opacity-80 mt-1">{data.desc}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-primary-foreground" />
    </div>
  );
}

function AgentNode({ data }: { data: { label: string; desc: string; color: string } }) {
  return (
    <div className={`relative px-5 py-3 rounded-xl border-2 min-w-[160px] text-center bg-card shadow-md ${data.color}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2.5 !h-2.5" />
      <p className="text-sm font-bold text-foreground">{data.label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{data.desc}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2.5 !h-2.5" />
    </div>
  );
}

function ToolNode({ data }: { data: { label: string; desc: string } }) {
  return (
    <div className="relative px-4 py-3 rounded-xl border border-border bg-muted/50 min-w-[140px] text-center">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <p className="text-xs font-bold text-foreground">{data.label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{data.desc}</p>
    </div>
  );
}

function InfraNode({ data }: { data: { label: string; desc: string; status: string } }) {
  return (
    <div className="relative px-4 py-3 rounded-xl border border-border bg-card min-w-[150px] text-center shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <div className={`w-2 h-2 rounded-full ${data.status === "online" ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
        <p className="text-xs font-bold text-foreground">{data.label}</p>
      </div>
      <p className="text-[10px] text-muted-foreground">{data.desc}</p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  core: CoreNode,
  agent: AgentNode,
  tool: ToolNode,
  infra: InfraNode,
};

/* ─── Node & Edge Definitions ─── */

const initialNodes: Node[] = [
  // User Entry
  { id: "user", type: "core", position: { x: 400, y: 0 }, data: { label: "👤 User", desc: "คำสั่งงาน / Task" } },

  // Core System
  { id: "nirva-core", type: "core", position: { x: 400, y: 120 }, data: { label: "Nirva AI Core", desc: "FastAPI + LangGraph" } },

  // Planner
  { id: "planner", type: "agent", position: { x: 400, y: 260 }, data: { label: "🧠 Planner Agent", desc: "วางแผนและแบ่งงาน", color: "border-primary/50" } },

  // Router
  { id: "router", type: "agent", position: { x: 400, y: 380 }, data: { label: "🔀 Router", desc: "เลือก Agent ที่เหมาะสม", color: "border-amber-400" } },

  // Agent Executor
  { id: "architect", type: "agent", position: { x: 150, y: 520 }, data: { label: "📐 Architect", desc: "ออกแบบระบบ (Qwen)", color: "border-blue-400" } },
  { id: "coder", type: "agent", position: { x: 400, y: 520 }, data: { label: "💻 Coder", desc: "เขียนโค้ด (Qwen-Coder)", color: "border-purple-400" } },
  { id: "reviewer", type: "agent", position: { x: 650, y: 520 }, data: { label: "🔍 Reviewer", desc: "ตรวจสอบ (DeepSeek)", color: "border-red-400" } },

  // Tools
  { id: "tool-file", type: "tool", position: { x: 100, y: 680 }, data: { label: "📁 File Manager", desc: "อ่าน/เขียนไฟล์" } },
  { id: "tool-terminal", type: "tool", position: { x: 280, y: 680 }, data: { label: "⚡ Terminal", desc: "รันคำสั่ง" } },
  { id: "tool-api", type: "tool", position: { x: 460, y: 680 }, data: { label: "🌐 API Connector", desc: "เรียก External API" } },
  { id: "tool-memory", type: "tool", position: { x: 640, y: 680 }, data: { label: "🧠 Memory", desc: "Qdrant Vector DB" } },

  // Infrastructure (right side)
  { id: "infra-ollama", type: "infra", position: { x: 820, y: 140 }, data: { label: "Ollama", desc: "Local LLM Runtime", status: "online" } },
  { id: "infra-qdrant", type: "infra", position: { x: 820, y: 230 }, data: { label: "Qdrant", desc: "Vector Database", status: "online" } },
  { id: "infra-n8n", type: "infra", position: { x: 820, y: 320 }, data: { label: "n8n", desc: "Workflow Orchestrator", status: "online" } },
  { id: "infra-postgres", type: "infra", position: { x: 820, y: 410 }, data: { label: "PostgreSQL", desc: "Persistent Storage", status: "online" } },
  { id: "infra-fastapi", type: "infra", position: { x: 820, y: 500 }, data: { label: "FastAPI", desc: "Core API Server", status: "building" } },
];

const initialEdges: Edge[] = [
  // Main flow
  { id: "e-user-core", source: "user", target: "nirva-core", type: "smoothstep", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" } },
  { id: "e-core-planner", source: "nirva-core", target: "planner", type: "smoothstep", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" } },
  { id: "e-planner-router", source: "planner", target: "router", type: "smoothstep", animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" } },

  // Router to agents
  { id: "e-router-arch", source: "router", target: "architect", type: "smoothstep", style: { stroke: "#60a5fa", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#60a5fa" } },
  { id: "e-router-coder", source: "router", target: "coder", type: "smoothstep", style: { stroke: "#a78bfa", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#a78bfa" } },
  { id: "e-router-reviewer", source: "router", target: "reviewer", type: "smoothstep", style: { stroke: "#f87171", strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#f87171" } },

  // Agents to tools
  { id: "e-arch-file", source: "architect", target: "tool-file", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-coder-terminal", source: "coder", target: "tool-terminal", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-coder-file", source: "coder", target: "tool-file", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-reviewer-api", source: "reviewer", target: "tool-api", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-arch-memory", source: "architect", target: "tool-memory", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-coder-api", source: "coder", target: "tool-api", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },
  { id: "e-reviewer-memory", source: "reviewer", target: "tool-memory", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1 } },

  // Infrastructure connections
  { id: "e-core-ollama", source: "nirva-core", target: "infra-ollama", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" } },
  { id: "e-core-qdrant", source: "nirva-core", target: "infra-qdrant", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" } },
  { id: "e-core-n8n", source: "nirva-core", target: "infra-n8n", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" } },
  { id: "e-core-postgres", source: "nirva-core", target: "infra-postgres", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" } },
  { id: "e-core-fastapi", source: "nirva-core", target: "infra-fastapi", type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" } },
];

/* ─── Page Component ─── */

export default function MindMap() {
  const nodes = useMemo(() => initialNodes, []);
  const edges = useMemo(() => initialEdges, []);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] flex flex-col">
        {/* Header */}
        <header className="px-10 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">System Architecture</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
            Mind Map
          </h1>
          <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
            แผนผังสถาปัตยกรรมระบบ Nirva AI Core — ลาก, ซูม, สำรวจได้อิสระ
          </p>
        </header>

        {/* Legend */}
        <div className="px-10 pb-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-xs font-medium text-primary">Core System</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-xs font-medium text-blue-700">Agents</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
            <div className="w-3 h-3 rounded bg-muted-foreground/50" />
            <span className="text-xs font-medium text-muted-foreground">Tools</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-foreground">Infrastructure</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-muted-foreground">💡 ลากเพื่อเลื่อน · Scroll เพื่อซูม · ลาก node เพื่อจัดเรียง</span>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 mx-6 mb-6 rounded-2xl border border-border overflow-hidden bg-card/50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Background gap={20} size={1} color="var(--border)" />
            <Controls className="!bg-card !border-border !rounded-xl !shadow-lg" />
            <MiniMap
              className="!bg-card !border-border !rounded-xl"
              nodeColor={(node) => {
                if (node.type === "core") return "var(--primary)";
                if (node.type === "agent") return "#60a5fa";
                if (node.type === "infra") return "#22c55e";
                return "#94a3b8";
              }}
            />
          </ReactFlow>
        </div>
      </main>
    </div>
  );
}
