import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-nirva-border/70 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04]">
        <Icon className="h-5 w-5 text-nirva-muted" />
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-nirva-muted">{description}</p>
    </div>
  );
}
