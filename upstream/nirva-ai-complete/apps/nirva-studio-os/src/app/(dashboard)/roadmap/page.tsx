"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RoadmapCard } from "@/components/cards/roadmap-card";
import { mockRoadmap } from "@/lib/mock-data";

export default function RoadmapPage() {
  const planned = mockRoadmap.filter((m) => m.status === "planned");
  const later = mockRoadmap.filter((m) => m.status === "later");

  return (
    <>
      <PageHeader
        title="Roadmap"
        subtitle="โมดูลในอนาคต — ปิดใช้งานไว้โดยตั้งใจ prototype นี้พิสูจน์ UX ก่อน แล้วค่อยต่อของจริง"
      />

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-nirva-violet-soft">Planned — next up</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {planned.map((module) => (
          <RoadmapCard key={module.id} module={module} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-nirva-muted">Later</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {later.map((module) => (
          <RoadmapCard key={module.id} module={module} />
        ))}
      </div>
    </>
  );
}
