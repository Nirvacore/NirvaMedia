import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-nirva-border bg-white/[0.03] px-3.5 text-sm text-zinc-100 placeholder:text-nirva-muted/70 focus:border-nirva-violet/50 focus:outline-none focus:ring-1 focus:ring-nirva-violet/40",
        className
      )}
      {...props}
    />
  );
}
