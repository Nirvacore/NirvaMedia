"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Inbox,
  Mic,
  Network,
  PenSquare,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CommandCard } from "@/components/cards/command-card";
import { ProjectCard } from "@/components/cards/project-card";
import { CaptureCard } from "@/components/cards/capture-card";
import { ContentCard } from "@/components/cards/content-card";
import { CalendarCard } from "@/components/cards/calendar-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCampaigns, mockCaptures, mockContentItems, mockProjects } from "@/lib/mock-data";
import { getMediaContent, type LiveContentItem } from "@/lib/nirva-api";
import type { ContentItem } from "@/types";

const QUICK_ACTIONS = [
  { title: "Record new idea", description: "Voice-first capture, AI จัดหมวดให้", icon: Mic, href: "/capture", accent: "violet" as const },
  { title: "Create content from note", description: "แปลง capture เป็น draft", icon: PenSquare, href: "/content-studio", accent: "gold" as const },
  { title: "Open Relationship Canvas", description: "BEST Investigation map", icon: Network, href: "/relationship-canvas", accent: "violet" as const },
  { title: "Plan campaign", description: "Launch teaser · Jul 6–19", icon: CalendarDays, href: "/marketing-calendar", accent: "gold" as const },
  { title: "Ask Nirva AI", description: "ถามจากทุกอย่างใน workspace", icon: Sparkles, href: "/ai-assistant", accent: "violet" as const },
  { title: "Review unprocessed captures", description: "2 รายการรอ AI ประมวลผล", icon: Inbox, href: "/capture", accent: "gold" as const },
];

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-nirva-muted">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-xs text-nirva-violet-soft hover:underline">
          {linkLabel ?? "View all"} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function toPipelineCard(item: LiveContentItem): ContentItem {
  const statusMap: Record<string, ContentItem["status"]> = {
    draft: "draft", review: "draft", approved: "ready", scheduled: "ready", published: "published",
  };
  return {
    id: item.id,
    title: item.title,
    type: "facebook",
    status: statusMap[item.contentStatus] ?? "draft",
    excerpt: item.body.slice(0, 100),
    updatedAt: item.contentStatus,
    live: true,
    body: item.body,
  };
}

export default function CommandCenterPage() {
  const [live, setLive] = useState<LiveContentItem[] | null>(null);

  useEffect(() => {
    getMediaContent().then((items) => items && setLive(items));
  }, []);

  const stats = useMemo(() => {
    if (!live) return null;
    const byStatus = (status: string) => live.filter((i) => i.contentStatus === status);
    const nextScheduled = byStatus("scheduled")
      .filter((i) => i.scheduledAt)
      .sort((a, b) => (a.scheduledAt! < b.scheduledAt! ? -1 : 1))[0];
    return {
      drafts: byStatus("draft").length + byStatus("review").length,
      scheduled: byStatus("scheduled").length,
      published: byStatus("published").length,
      nextScheduled,
    };
  }, [live]);

  const pipeline = live
    ? live.slice(0, 4).map(toPipelineCard)
    : mockContentItems.slice(0, 4);

  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle="สวัสดีตอนเช้า 🌅 นี่คือภาพรวมวันนี้ของคุณ — หนึ่งหน้าจอ เห็นทุกอย่าง"
        actions={
          stats ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              live · {stats.drafts} drafts · {stats.scheduled} scheduled · {stats.published} published
            </Badge>
          ) : (
            <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">mock mode</Badge>
          )
        }
      />

      <Card className="border-nirva-violet/30 bg-gradient-to-br from-nirva-violet/[0.12] to-transparent">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nirva-violet/20">
            <Target className="h-4 w-4 text-nirva-violet-soft" />
          </div>
          <div>
            <CardTitle>Today Focus</CardTitle>
            <p className="text-xs text-nirva-muted">1 งานสำคัญ + 2 งานรอง</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats ? (
            <>
              {stats.nextScheduled ? (
                <div className="rounded-xl border border-nirva-gold/25 bg-nirva-gold/[0.06] px-4 py-3">
                  <p className="text-sm font-medium text-zinc-100">{stats.nextScheduled.title}</p>
                  <p className="mt-0.5 text-xs text-nirva-muted">
                    โพสต์ถัดไป · {new Date(stats.nextScheduled.scheduledAt!).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · ระบบโพสต์ให้อัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-nirva-gold/25 bg-nirva-gold/[0.06] px-4 py-3">
                  <p className="text-sm font-medium text-zinc-100">ยังไม่มีโพสต์ตั้งเวลา</p>
                  <p className="mt-0.5 text-xs text-nirva-muted">อัดไอเดียใน Capture แล้ว Schedule จาก Content Studio</p>
                </div>
              )}
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="flex-1 rounded-xl border border-nirva-border/60 bg-white/[0.02] px-4 py-2.5 text-xs text-nirva-muted">
                  ✦ Draft รอขัด/อนุมัติ {stats.drafts} ชิ้น
                </div>
                <div className="flex-1 rounded-xl border border-nirva-border/60 bg-white/[0.02] px-4 py-2.5 text-xs text-nirva-muted">
                  ✦ เผยแพร่แล้วทั้งหมด {stats.published} ชิ้น
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-nirva-gold/25 bg-nirva-gold/[0.06] px-4 py-3">
                <p className="text-sm font-medium text-zinc-100">Draft Facebook post from voice note</p>
                <p className="mt-0.5 text-xs text-nirva-muted">จาก capture "AI ERP for Thai businesses" · แนะนำทำก่อน 12:00</p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="flex-1 rounded-xl border border-nirva-border/60 bg-white/[0.02] px-4 py-2.5 text-xs text-nirva-muted">
                  ✦ Approve teaser 15s cut (Ready → schedule Jul 11)
                </div>
                <div className="flex-1 rounded-xl border border-nirva-border/60 bg-white/[0.02] px-4 py-2.5 text-xs text-nirva-muted">
                  ✦ Review 2 unprocessed captures
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SectionTitle title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {QUICK_ACTIONS.map((action, i) => (
          <CommandCard key={action.title} {...action} index={i} />
        ))}
      </div>

      <SectionTitle title="Active Projects" />
      <div className="grid gap-3 md:grid-cols-3">
        {mockProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle title="Recent Captures" href="/capture" />
          <div className="space-y-3">
            {mockCaptures.slice(0, 3).map((capture) => (
              <CaptureCard key={capture.id} capture={capture} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle title="Content Pipeline" href="/content-studio" />
          <div className="grid gap-3 sm:grid-cols-2">
            {pipeline.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      <SectionTitle title="Marketing Overview" href="/marketing-calendar" />
      <div className="grid gap-3 md:grid-cols-3">
        {mockCampaigns.map((campaign) => (
          <CalendarCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      <SectionTitle title="AI Suggestions" href="/ai-assistant" linkLabel="Open assistant" />
      <Card>
        <CardContent className="space-y-2.5 p-4">
          {[
            "3 ไอเดียสัปดาห์นี้ชี้ไปทางเดียวกัน: 'operating system for creators' — ทำเป็นซีรีส์ได้",
            "Podcast EP.1 พร้อมอัดแล้ว แต่ยังไม่มีช่องในปฏิทิน — แนะนำ Jul 17",
            "Voice note ล่าสุดยังไม่ถูกแปลงเป็นคอนเทนต์ — แตะเพื่อสร้าง draft",
          ].map((suggestion) => (
            <div key={suggestion} className="flex items-start gap-2.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nirva-violet-soft" />
              <p className="text-xs leading-relaxed text-zinc-300">{suggestion}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
