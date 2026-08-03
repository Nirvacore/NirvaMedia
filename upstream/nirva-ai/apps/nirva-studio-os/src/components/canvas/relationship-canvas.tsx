"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockRelationshipEdges, mockRelationshipNodes } from "@/lib/mock-data/relationship";
import type { NodeKind, RelationNodeData } from "@/types";
import { NodeDetailPanel } from "./node-detail-panel";

const KIND_STYLE: Record<NodeKind, { chip: string; ring: string; label: string }> = {
  company: { chip: "bg-nirva-violet/20 text-nirva-violet-soft", ring: "border-nirva-violet/50", label: "Company" },
  person: { chip: "bg-nirva-gold/20 text-nirva-gold", ring: "border-nirva-gold/50", label: "Person" },
  customer: { chip: "bg-emerald-500/20 text-emerald-300", ring: "border-emerald-500/50", label: "Customer" },
  supplier: { chip: "bg-sky-500/20 text-sky-300", ring: "border-sky-500/50", label: "Supplier" },
  document: { chip: "bg-zinc-500/20 text-zinc-300", ring: "border-zinc-500/50", label: "Document" },
  project: { chip: "bg-teal-500/20 text-teal-300", ring: "border-teal-500/50", label: "Project" },
  content: { chip: "bg-pink-500/20 text-pink-300", ring: "border-pink-500/50", label: "Content" },
  task: { chip: "bg-orange-500/20 text-orange-300", ring: "border-orange-500/50", label: "Task" },
  capture: { chip: "bg-fuchsia-500/20 text-fuchsia-300", ring: "border-fuchsia-500/50", label: "Capture" },
};

const FILTERS: Array<{ label: string; kinds: NodeKind[] }> = [
  { label: "Companies", kinds: ["company"] },
  { label: "People", kinds: ["person", "customer", "supplier"] },
  { label: "Documents", kinds: ["document"] },
  { label: "Projects", kinds: ["project"] },
  { label: "Content", kinds: ["content", "capture"] },
  { label: "Tasks", kinds: ["task"] },
];

function NirvaNode({ data, selected }: NodeProps) {
  const nodeData = data as RelationNodeData;
  const style = KIND_STYLE[nodeData.kind];
  return (
    <div
      className={cn(
        "min-w-[160px] rounded-xl border bg-nirva-card/95 px-3.5 py-2.5 shadow-card backdrop-blur transition-shadow",
        style.ring,
        selected && "shadow-glow"
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-nirva-muted" />
      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider", style.chip)}>
        {style.label}
      </span>
      <p className="mt-1.5 text-xs font-medium leading-snug text-zinc-100">{nodeData.label}</p>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-nirva-muted" />
    </div>
  );
}

const nodeTypes = { nirva: NirvaNode };

export function RelationshipCanvas() {
  const [selected, setSelected] = useState<RelationNodeData | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const visibleKinds = useMemo(() => {
    if (!activeFilter) return null;
    return new Set(FILTERS.find((f) => f.label === activeFilter)?.kinds ?? []);
  }, [activeFilter]);

  const nodes = useMemo(
    () =>
      mockRelationshipNodes.map((node) => ({
        ...node,
        hidden: visibleKinds ? !visibleKinds.has(node.data.kind) : false,
      })),
    [visibleKinds]
  );

  const visibleIds = useMemo(() => new Set(nodes.filter((n) => !n.hidden).map((n) => n.id)), [nodes]);
  const edges = useMemo(
    () =>
      mockRelationshipEdges.map((edge) => ({
        ...edge,
        hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
        labelStyle: { fill: "#8E8EA8", fontSize: 10 },
        labelBgStyle: { fill: "#12121A", fillOpacity: 0.9 },
        style: { stroke: "rgba(139,124,246,0.35)" },
      })),
    [visibleIds]
  );

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    setSelected(node.data as RelationNodeData);
  }, []);

  return (
    <div className="relative h-[calc(100vh-220px)] min-h-[480px] overflow-hidden rounded-2xl border border-nirva-border/60">
      <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2 md:right-auto">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nirva-muted" />
          <Input placeholder="Search nodes… (prototype)" className="h-9 bg-nirva-surface/90 pl-9 text-xs" readOnly />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(activeFilter === filter.label ? null : filter.label)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] transition-colors",
                activeFilter === filter.label
                  ? "border-nirva-violet/60 bg-nirva-violet/20 text-nirva-violet-soft"
                  : "border-nirva-border bg-nirva-surface/90 text-nirva-muted hover:text-zinc-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        className="bg-nirva-bg"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(139,124,246,0.18)" />
        <Controls className="!rounded-xl !border !border-nirva-border !bg-nirva-surface/90 !shadow-card [&>button]:!border-nirva-border [&>button]:!bg-transparent [&>button]:!text-zinc-300" />
        <MiniMap
          className="!rounded-xl !border !border-nirva-border !bg-nirva-surface/90"
          maskColor="rgba(10,10,15,0.75)"
          nodeColor={() => "rgba(139,124,246,0.6)"}
        />
      </ReactFlow>

      {selected && <NodeDetailPanel data={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
