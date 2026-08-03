"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommandCard({
  title,
  description,
  icon: Icon,
  href,
  accent = "violet",
  index = 0,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  accent?: "violet" | "gold";
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        href={href}
        className={cn(
          "group flex h-full flex-col justify-between gap-4 rounded-2xl border p-4 transition-all",
          accent === "violet"
            ? "border-nirva-violet/25 bg-nirva-violet/[0.06] hover:bg-nirva-violet/[0.12] hover:shadow-glow"
            : "border-nirva-gold/25 bg-nirva-gold/[0.05] hover:bg-nirva-gold/[0.1]"
        )}
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              accent === "violet" ? "bg-nirva-violet/20 text-nirva-violet-soft" : "bg-nirva-gold/20 text-nirva-gold"
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-nirva-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-100">{title}</p>
          <p className="mt-0.5 text-xs text-nirva-muted">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}
