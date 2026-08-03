import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/sidebar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-nirva-bg bg-nirva-glow text-zinc-100">
      <Sidebar />
      <main className="pb-24 md:ml-60 md:pb-8">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
