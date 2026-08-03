"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge, StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/types";

export function ContentCard({
  item,
  selected,
  onSelect,
}: {
  item: ContentItem;
  selected?: boolean;
  onSelect?: (item: ContentItem) => void;
}) {
  return (
    <Card
      role={onSelect ? "button" : undefined}
      onClick={() => onSelect?.(item)}
      className={cn(
        "cursor-default transition-all",
        onSelect && "cursor-pointer hover:border-nirva-violet/50",
        selected && "border-nirva-violet/60 shadow-glow"
      )}
    >
      <CardContent className="p-3.5">
        <div className="flex items-center gap-1.5">
          <PlatformBadge platform={item.type} />
          {item.platform && item.platform !== item.type && <PlatformBadge platform={item.platform} />}
          {item.live && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400" /> live
            </span>
          )}
        </div>
        <p className="mt-2 text-[13px] font-medium leading-snug text-zinc-100">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-nirva-muted">{item.excerpt}</p>
        <div className="mt-2.5 flex items-center justify-between">
          <StatusBadge status={item.status} />
          <span className="text-[10px] text-nirva-muted/70">{item.updatedAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}
