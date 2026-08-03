"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getNleStatus } from "@/lib/nirva-api";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const [nleLive, setNleLive] = useState<boolean | null>(null);

  useEffect(() => {
    getNleStatus().then((status) => setNleLive(status !== null));
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-nirva-border/50 bg-nirva-surface/70 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-nirva-violet to-nirva-violet/50 shadow-glow">
          <span className="text-sm font-bold text-white">N</span>
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-zinc-100">Nirva Studio</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-nirva-gold">OS · Prototype</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-nirva-violet/15 text-zinc-50 shadow-[inset_0_0_0_1px_rgba(139,124,246,0.25)]"
                  : "text-nirva-muted hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              <item.icon
                className={cn("h-4 w-4", active ? "text-nirva-violet-soft" : "text-nirva-muted group-hover:text-zinc-300")}
              />
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-nirva-gold" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-nirva-border/60 bg-white/[0.03] p-3.5">
        <p className="text-xs font-medium text-zinc-200">Prototype mode</p>
        <p className="mt-1 text-[11px] leading-relaxed text-nirva-muted">
          Mock data only · no backend · ดู Roadmap สำหรับของจริง
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/5 pt-2.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              nleLive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-zinc-600"
            )}
          />
          <span className="text-[10px] text-nirva-muted">
            NLE bridge: {nleLive === null ? "checking…" : nleLive ? "live" : "offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
