import { Badge } from "@/components/ui/badge";
import { STATUS_META, PLATFORM_META, cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, className: "bg-white/5 text-zinc-300 border-white/10" };
  return <Badge className={cn(meta.className, className)}>{meta.label}</Badge>;
}

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const meta = PLATFORM_META[platform] ?? { label: platform, className: "bg-white/5 text-zinc-300 border-white/10" };
  return <Badge className={cn(meta.className, className)}>{meta.label}</Badge>;
}
