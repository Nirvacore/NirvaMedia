"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RelationNodeData } from "@/types";

export function NodeDetailPanel({ data, onClose }: { data: RelationNodeData; onClose: () => void }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute bottom-3 right-3 top-16 z-10 w-72 overflow-y-auto rounded-2xl border border-nirva-border/70 bg-nirva-surface/95 p-4 shadow-card backdrop-blur-xl md:top-3 md:w-80"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge className="border-nirva-violet/30 bg-nirva-violet/10 uppercase tracking-wider text-nirva-violet-soft">
            {data.kind}
          </Badge>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-zinc-50">{data.label}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-nirva-muted">{data.detail}</p>

      <div className="mt-4 space-y-2">
        {data.meta.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between rounded-xl border border-nirva-border/60 bg-white/[0.03] px-3 py-2"
          >
            <span className="text-[11px] text-nirva-muted">{entry.label}</span>
            <span className="text-[11px] font-medium text-zinc-200">{entry.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Button variant="secondary" size="sm" className="w-full">
          Open related items
        </Button>
        <Button variant="ghost" size="sm" className="w-full">
          Ask Nirva AI about this
        </Button>
      </div>
    </motion.aside>
  );
}
