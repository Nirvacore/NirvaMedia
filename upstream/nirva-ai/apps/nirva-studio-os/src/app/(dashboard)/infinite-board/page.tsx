"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  GripVertical,
  ListTodo,
  Maximize2,
  Mic,
  Minus,
  Network,
  PenSquare,
  Plus,
  Podcast,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mockBoardCards } from "@/lib/mock-data";
import type { BoardCard } from "@/types";

const KIND_ICON: Record<BoardCard["kind"], typeof Mic> = {
  voice: Mic,
  podcast: Podcast,
  campaign: Megaphone,
  graph: Network,
  ai: Sparkles,
  tasks: ListTodo,
  draft: PenSquare,
  assets: FolderOpen,
};

export default function InfiniteBoardPage() {
  const [zoom, setZoom] = useState(1);

  return (
    <>
      <PageHeader
        title="Infinite Board"
        subtitle="พื้นที่ทำงานแบบ spatial — วางทุกอย่างไว้บนผืนเดียว ซูมเข้า-ออกได้เหมือนไม่มีขอบ"
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-nirva-border bg-nirva-surface/80 p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-nirva-muted">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="relative h-[calc(100vh-230px)] min-h-[500px] overflow-auto rounded-2xl border border-nirva-border/60 bg-nirva-bg">
        <div className="pointer-events-none sticky left-0 top-0 z-10 flex justify-center pt-3">
          <span className="rounded-full border border-nirva-border/60 bg-nirva-surface/90 px-3 py-1 text-[10px] text-nirva-muted backdrop-blur">
            Prototype canvas — drag persistence arrives with the database phase
          </span>
        </div>
        <div
          className="relative h-[900px] w-[1300px] origin-top-left bg-dot-grid [background-size:28px_28px] transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {mockBoardCards.map((card, i) => {
            const Icon = KIND_ICON[card.kind];
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className={cn(
                  "absolute cursor-grab rounded-2xl border p-4 shadow-card backdrop-blur-sm active:cursor-grabbing",
                  card.accent === "violet" && "border-nirva-violet/30 bg-nirva-violet/[0.07]",
                  card.accent === "gold" && "border-nirva-gold/30 bg-nirva-gold/[0.06]",
                  card.accent === "neutral" && "border-nirva-border/70 bg-nirva-card/90"
                )}
                style={{ left: card.x, top: card.y, width: card.w }}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      card.accent === "violet" && "text-nirva-violet-soft",
                      card.accent === "gold" && "text-nirva-gold",
                      card.accent === "neutral" && "text-nirva-muted"
                    )}
                  />
                  <p className="flex-1 text-xs font-semibold uppercase tracking-wider text-nirva-muted">{card.title}</p>
                  <GripVertical className="h-3.5 w-3.5 text-nirva-muted/50" />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-200">{card.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
