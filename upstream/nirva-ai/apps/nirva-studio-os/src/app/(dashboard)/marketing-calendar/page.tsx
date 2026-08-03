"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCard } from "@/components/cards/calendar-card";
import { PlatformBadge } from "@/components/cards/status-badge";
import { mockCampaigns, mockScheduledPosts } from "@/lib/mock-data";
import {
  analyzePerformanceLive,
  getMediaContent,
  recordMetricsLive,
  type LiveContentItem,
  type PerformanceInsightsLive,
  type PerformanceStatsLive,
} from "@/lib/nirva-api";
import { cn, PLATFORM_META } from "@/lib/utils";

function AnalyticsPanel({ published }: { published: LiveContentItem[] }) {
  const [contentId, setContentId] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [reach, setReach] = useState("");
  const [engagement, setEngagement] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ stats: PerformanceStatsLive; insights: PerformanceInsightsLive | null; provider: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = async () => {
    if (!reach || !engagement || saving) return;
    setSaving(true);
    const ok = await recordMetricsLive({
      contentId: contentId || undefined,
      platform,
      reach: Number(reach),
      engagement: Number(engagement),
    });
    if (ok) {
      setSavedCount((c) => c + 1);
      setReach("");
      setEngagement("");
    } else setError("บันทึกไม่สำเร็จ — backend offline?");
    setSaving(false);
  };

  const analyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setError(null);
    const outcome = await analyzePerformanceLive();
    if (!outcome) setError("backend offline");
    else if (outcome.error && !outcome.insights) setError(outcome.error);
    else setResult(outcome as typeof result);
    setAnalyzing(false);
  };

  const inputCls =
    "h-8 w-full rounded-lg border border-nirva-border bg-white/[0.03] px-2.5 text-[12px] text-zinc-100 placeholder:text-nirva-muted/60 focus:border-nirva-violet/50 focus:outline-none";

  return (
    <Card className="border-nirva-violet/25">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[13px]">
          <BarChart3 className="h-3.5 w-3.5 text-nirva-violet-soft" /> Analytics — วิเคราะห์ผล
        </CardTitle>
        <CardDescription>โยนตัวเลขจากเพจกลับเข้าระบบ แล้วให้ AI สรุปว่าอะไรเวิร์ก</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <select value={contentId} onChange={(e) => setContentId(e.target.value)} className={inputCls}>
          <option value="">— โพสต์ทั่วไป (ไม่ผูกกับชิ้นงาน) —</option>
          {published.map((item) => (
            <option key={item.id} value={item.id}>{item.title.slice(0, 48)}</option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls}>
            {["facebook", "line", "telegram", "instagram", "tiktok", "x"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input value={reach} onChange={(e) => setReach(e.target.value.replace(/\D/g, ""))} placeholder="reach" className={inputCls} />
          <input value={engagement} onChange={(e) => setEngagement(e.target.value.replace(/\D/g, ""))} placeholder="engage" className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={record} disabled={saving || !reach || !engagement}>
            {saving ? "Saving…" : "บันทึกตัวเลข"}
          </Button>
          <Button size="sm" onClick={analyze} disabled={analyzing}>
            {analyzing ? "Analyzing…" : "Analyze"}
          </Button>
          {savedCount > 0 && (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">+{savedCount}</Badge>
          )}
        </div>
        {error && <Badge className="border-red-500/30 bg-red-500/10 text-red-300">{error}</Badge>}
        {result && (
          <div className="space-y-2 rounded-xl border border-nirva-violet/25 bg-nirva-violet/[0.06] p-3">
            <p className="text-[11px] leading-relaxed text-zinc-200">{result.insights?.summary}</p>
            {result.insights?.working.map((w) => (
              <p key={w} className="text-[11px] text-emerald-300">✓ {w}</p>
            ))}
            {result.insights?.notWorking.map((w) => (
              <p key={w} className="text-[11px] text-red-300">✗ {w}</p>
            ))}
            {result.insights?.recommendations.map((r) => (
              <p key={r} className="text-[11px] text-nirva-gold">→ {r}</p>
            ))}
            <p className="text-[10px] text-nirva-muted">
              reach {result.stats.totalReach.toLocaleString()} · engagement {result.stats.totalEngagement.toLocaleString()} · rate{" "}
              {(result.stats.engagementRate * 100).toFixed(1)}% · via {result.provider}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarEntry {
  id: string;
  title: string;
  day: number;
  time: string;
  platform?: string;
  status: "scheduled" | "published";
}

/** Live NMD items with a schedule time in the visible month. */
function toEntries(items: LiveContentItem[], year: number, month: number): CalendarEntry[] {
  return items
    .filter((item) => item.contentStatus === "scheduled" || item.contentStatus === "published")
    .flatMap((item) => {
      const raw = item.scheduledAt;
      if (!raw) return [];
      const date = new Date(raw);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month) return [];
      return [{
        id: item.id,
        title: item.title,
        day: date.getDate(),
        time: date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        status: item.contentStatus as "scheduled" | "published",
      }];
    })
    .sort((a, b) => a.day - b.day);
}

export default function MarketingCalendarPage() {
  const [now] = useState(() => new Date());
  const [live, setLive] = useState<CalendarEntry[] | null>(null);
  const [rawItems, setRawItems] = useState<LiveContentItem[]>([]);

  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  useEffect(() => {
    getMediaContent().then((items) => {
      if (items) {
        setLive(toEntries(items, year, month));
        setRawItems(items);
      }
    });
  }, [year, month]);

  const { cells, monthLabel } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7; // Monday-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      cells: [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ],
      monthLabel: `${MONTHS[month]} ${year}`,
    };
  }, [year, month]);

  const isLive = live !== null;
  const entriesForDay = (day: number): CalendarEntry[] =>
    isLive
      ? live.filter((entry) => entry.day === day)
      : mockScheduledPosts
          .filter((post) => post.day === day)
          .map((post) => ({ id: post.id, title: post.title, day: post.day, time: post.time, platform: post.platform, status: "scheduled" as const }));

  const upcoming = isLive
    ? live.filter((entry) => entry.status === "scheduled" && entry.day >= today)
    : null;

  return (
    <>
      <PageHeader
        title="Marketing Calendar"
        subtitle={`${monthLabel} — วางแผนแคมเปญและโพสต์ทุกแพลตฟอร์มจากปฏิทินเดียว`}
        actions={
          isLive ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              NMD live · {live.length} scheduled/published
            </Badge>
          ) : (
            <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">mock mode</Badge>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-nirva-muted">
                  {day}
                </div>
              ))}
              {cells.map((day, i) => {
                const entries = day ? entriesForDay(day) : [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[64px] rounded-lg border p-1.5 md:min-h-[84px]",
                      day ? "border-nirva-border/40 bg-white/[0.015]" : "border-transparent",
                      day === today && "border-nirva-violet/50 bg-nirva-violet/[0.07]"
                    )}
                  >
                    {day && (
                      <>
                        <span className={cn("text-[10px] tabular-nums", day === today ? "font-bold text-nirva-violet-soft" : "text-nirva-muted")}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {entries.map((entry) => {
                            const meta = entry.platform ? PLATFORM_META[entry.platform] : null;
                            return (
                              <div
                                key={entry.id}
                                title={entry.title}
                                className={cn(
                                  "truncate rounded-md border px-1.5 py-0.5 text-[9px] leading-tight",
                                  meta?.className ??
                                    (entry.status === "published"
                                      ? "border-nirva-gold/30 bg-nirva-gold/10 text-nirva-gold"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300")
                                )}
                              >
                                {entry.time} · {meta?.label ?? entry.title}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Upcoming posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLive ? (
                upcoming && upcoming.length > 0 ? (
                  upcoming.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-nirva-border/50 bg-white/[0.02] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">scheduled</Badge>
                        <span className="text-[10px] tabular-nums text-nirva-muted">
                          {MONTHS[month].slice(0, 3)} {entry.day} · {entry.time}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-xs text-zinc-200">{entry.title}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-white/[0.02] px-3 py-4 text-center text-xs text-nirva-muted">
                    ยังไม่มีโพสต์ตั้งเวลา — ไปที่ Content Studio → เลือกการ์ด live → Schedule
                  </p>
                )
              ) : (
                mockScheduledPosts.slice(0, 6).map((post) => (
                  <div key={post.id} className="rounded-xl border border-nirva-border/50 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <PlatformBadge platform={post.platform} />
                      <span className="text-[10px] tabular-nums text-nirva-muted">
                        Jul {post.day} · {post.time}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs text-zinc-200">{post.title}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {isLive && <AnalyticsPanel published={rawItems.filter((i) => i.contentStatus === "published")} />}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-nirva-muted">Campaigns</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {mockCampaigns.map((campaign) => (
          <CalendarCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </>
  );
}
