import { FileText, Mic, Upload, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Capture } from "@/types";

const KIND_ICON = { voice: Mic, text: FileText, video: Video, upload: Upload };

export function CaptureCard({ capture }: { capture: Capture }) {
  const Icon = KIND_ICON[capture.kind];
  return (
    <Card className="transition-colors hover:border-nirva-violet/40">
      <CardContent className="flex gap-3.5 p-4">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            capture.kind === "voice" ? "bg-nirva-violet/15 text-nirva-violet-soft" : "bg-white/[0.05] text-nirva-muted"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-zinc-100">{capture.title}</p>
            {capture.duration && <span className="text-[11px] tabular-nums text-nirva-muted">{capture.duration}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-nirva-muted">{capture.preview}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {capture.tags.map((tag) => (
              <Badge key={tag} className="border-white/10 bg-white/[0.04] text-zinc-400">
                #{tag}
              </Badge>
            ))}
            <span className="ml-auto text-[10px] text-nirva-muted/70">{capture.createdAt}</span>
            {!capture.processed && (
              <Badge className="border-nirva-gold/30 bg-nirva-gold/10 text-nirva-gold">unprocessed</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
