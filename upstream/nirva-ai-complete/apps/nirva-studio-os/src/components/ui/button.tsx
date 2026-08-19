"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirva-violet/60 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-nirva-violet text-white hover:bg-nirva-violet/85 shadow-glow",
        gold: "bg-nirva-gold text-black hover:bg-nirva-gold/85",
        secondary:
          "border border-nirva-border bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]",
        ghost: "text-nirva-muted hover:bg-white/[0.06] hover:text-zinc-200",
        outline:
          "border border-nirva-violet/40 text-nirva-violet-soft hover:bg-nirva-violet/10",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
