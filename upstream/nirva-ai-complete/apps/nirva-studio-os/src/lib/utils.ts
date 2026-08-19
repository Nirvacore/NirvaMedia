import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PLATFORM_META: Record<
  string,
  { label: string; className: string }
> = {
  facebook: { label: "Facebook", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  tiktok: { label: "TikTok", className: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  youtube: { label: "YouTube", className: "bg-red-500/15 text-red-300 border-red-500/30" },
  instagram: { label: "Instagram", className: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  linkedin: { label: "LinkedIn", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  website: { label: "Website", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  podcast: { label: "Podcast", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  blog: { label: "Blog", className: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  course: { label: "Course", className: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  email: { label: "Email", className: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

export const STATUS_META: Record<string, { label: string; className: string }> = {
  idea: { label: "Idea", className: "bg-nirva-violet/10 text-nirva-violet-soft border-nirva-violet/30" },
  draft: { label: "Draft", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  ready: { label: "Ready", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  published: { label: "Published", className: "bg-nirva-gold/10 text-nirva-gold border-nirva-gold/30" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  paused: { label: "Paused", className: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
  done: { label: "Done", className: "bg-nirva-gold/10 text-nirva-gold border-nirva-gold/30" },
  planning: { label: "Planning", className: "bg-nirva-violet/10 text-nirva-violet-soft border-nirva-violet/30" },
  running: { label: "Running", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  planned: { label: "Planned", className: "bg-nirva-violet/10 text-nirva-violet-soft border-nirva-violet/30" },
  later: { label: "Later", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
};
