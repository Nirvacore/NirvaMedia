"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Send, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentCard } from "@/components/cards/content-card";
import { PlatformBadge } from "@/components/cards/status-badge";
import { mockContentItems } from "@/lib/mock-data";
import {
  generateCampaignLive,
  generateImageLive,
  getAssetsLive,
  getBrandBriefLive,
  getConnectedPlatforms,
  getMediaContent,
  publishContentLive,
  saveBrandBriefLive,
  scheduleContentLive,
  type BrandBriefLive,
  type CampaignPlanLive,
  type LiveContentItem,
  type MediaAssetLive,
  type PublishRecordLive,
} from "@/lib/nirva-api";
import { cn } from "@/lib/utils";
import type { ContentItem, ContentStatus, ContentType } from "@/types";

/** Map real NMD pipeline items onto the prototype's board shape. */
function toBoardItem(item: LiveContentItem): ContentItem | null {
  const statusMap: Record<string, ContentStatus> = {
    draft: "draft",
    review: "draft",
    approved: "ready",
    scheduled: "ready",
    published: "published",
  };
  const typeMap: Record<string, ContentType> = {
    post: "facebook",
    article: "blog",
    script: "tiktok",
    caption: "facebook",
    email: "email",
    ad: "facebook",
  };
  const status = statusMap[item.contentStatus];
  if (!status) return null; // archived etc. stay off the board
  return {
    id: item.id,
    title: item.title,
    type: typeMap[item.contentType] ?? "facebook",
    status,
    excerpt: item.body.slice(0, 120),
    updatedAt: new Date(item.updatedAt + "Z").toLocaleDateString(),
    live: true,
    body: item.body,
  };
}

const COLUMNS: Array<{ status: ContentStatus; label: string }> = [
  { status: "idea", label: "Idea" },
  { status: "draft", label: "Draft" },
  { status: "ready", label: "Ready" },
  { status: "published", label: "Published" },
];

const FORMATS: Array<{ type: ContentType; label: string }> = [
  { type: "facebook", label: "Facebook post" },
  { type: "tiktok", label: "TikTok short script" },
  { type: "youtube", label: "YouTube outline" },
  { type: "podcast", label: "Podcast outline" },
  { type: "blog", label: "Blog article" },
  { type: "course", label: "Course lesson" },
  { type: "email", label: "Email newsletter" },
];

const MOCK_DRAFT = `HOOK (0-3s)
"คุณไม่ได้มีปัญหาเรื่องคอนเทนต์ — คุณมีปัญหาเรื่องระบบ"

BODY (3-40s)
• ครีเอเตอร์ส่วนใหญ่ใช้ 7+ แอปต่อวัน: จดไอเดียที่หนึ่ง วางแผนที่หนึ่ง ตัดต่อที่หนึ่ง โพสต์อีกที่หนึ่ง
• ทุกครั้งที่สลับแอป = โฟกัสรั่ว
• ลองนึกภาพ: จับไอเดียด้วยเสียง → AI แปลงเป็น draft → วางลงปฏิทิน → จบในหน้าจอเดียว

CTA (40-45s)
"นี่คือสิ่งที่เรากำลังสร้าง — Nirva Studio OS. ติดตามการเดินทางได้ที่นี่"`;

function PublishPanel({ item, onPublished }: { item: ContentItem; onPublished: () => void }) {
  const [connected, setConnected] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishRecordLive[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduledOk, setScheduledOk] = useState<boolean | null>(null);

  useEffect(() => {
    getConnectedPlatforms().then((platforms) => {
      if (platforms) {
        setConnected(platforms);
        setChosen(platforms);
      }
    });
  }, []);

  useEffect(() => {
    setResults(null);
    setSkipped([]);
    setScheduledOk(null);
  }, [item.id]);

  const schedule = async () => {
    if (!scheduleAt || chosen.length === 0 || publishing) return;
    setPublishing(true);
    const ok = await scheduleContentLive(
      item.id,
      item.status === "draft" ? "draft" : item.status,
      chosen,
      new Date(scheduleAt).toISOString()
    );
    setScheduledOk(ok);
    if (ok) onPublished();
    setPublishing(false);
  };

  const publish = async () => {
    if (chosen.length === 0 || publishing) return;
    setPublishing(true);
    const outcome = await publishContentLive(item.id, item.status === "draft" ? "draft" : item.status, chosen);
    if (outcome) {
      setResults(outcome.records);
      setSkipped(outcome.skipped);
      onPublished();
    }
    setPublishing(false);
  };

  return (
    <Card className="border-nirva-violet/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[13px]">
          <Send className="h-3.5 w-3.5 text-nirva-violet-soft" /> Publish (live)
        </CardTitle>
        <CardDescription>
          กดปุ่ม = อนุมัติ + สร้าง variants + โพสต์จริงผ่าน connector ที่ตั้งค่าไว้
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connected.length === 0 ? (
          <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">
            ไม่มี connector — ตั้ง LINE_CHANNEL_ACCESS_TOKEN / TELEGRAM_BOT_TOKEN หรือ NMD_DEMO_CONNECTORS=1
          </Badge>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {connected.map((platform) => (
                <button
                  key={platform}
                  onClick={() =>
                    setChosen((prev) =>
                      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                    chosen.includes(platform)
                      ? "border-nirva-violet/60 bg-nirva-violet/15 text-nirva-violet-soft"
                      : "border-nirva-border bg-white/[0.02] text-nirva-muted"
                  )}
                >
                  {platform}
                </button>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={publish} disabled={publishing || chosen.length === 0}>
              <Send className="h-3.5 w-3.5" /> {publishing ? "Working…" : `Publish now (${chosen.length})`}
            </Button>
            {item.status !== "published" ? (
              <div className="flex items-center gap-2 border-t border-white/5 pt-2.5">
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-nirva-border bg-white/[0.03] px-2 text-[11px] text-zinc-200 [color-scheme:dark]"
                />
                <Button variant="outline" size="sm" onClick={schedule} disabled={publishing || !scheduleAt || chosen.length === 0}>
                  Schedule
                </Button>
              </div>
            ) : (
              <p className="border-t border-white/5 pt-2.5 text-[10px] text-nirva-muted">
                เผยแพร่ไปแล้ว — โพสต์ซ้ำได้ด้วย Publish now แต่ตั้งเวลาใหม่ไม่ได้
              </p>
            )}
            {scheduledOk === true && (
              <Badge className="border-nirva-gold/30 bg-nirva-gold/10 text-nirva-gold">
                scheduled ✓ — ดูในปฏิทิน · โพสต์อัตโนมัติเมื่อถึงเวลา
              </Badge>
            )}
            {scheduledOk === false && (
              <Badge className="border-red-500/30 bg-red-500/10 text-red-300">schedule failed — backend offline?</Badge>
            )}
          </>
        )}
        {results && (
          <div className="space-y-1.5 border-t border-white/5 pt-2.5">
            {results.map((record, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <span className="text-[11px] text-zinc-300">
                  {record.platform} · {record.lang}
                </span>
                {record.publishStatus === "published" ? (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    published ✓ {record.externalId?.startsWith("demo_") && "(demo)"}
                  </Badge>
                ) : (
                  <Badge className="border-red-500/30 bg-red-500/10 text-red-300" title={record.error ?? ""}>
                    failed
                  </Badge>
                )}
              </div>
            ))}
            {skipped.map((reason) => (
              <p key={reason} className="text-[10px] text-nirva-muted">
                ⏭ {reason}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StrategyPanel({ onGenerated }: { onGenerated: () => void }) {
  const [goal, setGoal] = useState("");
  const [working, setWorking] = useState(false);
  const [plan, setPlan] = useState<(CampaignPlanLive & { itemCount: number; provider: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!goal.trim() || working) return;
    setWorking(true);
    setError(null);
    const result = await generateCampaignLive(goal.trim());
    if (!result) setError("backend offline");
    else if (result.error || !result.plan) setError(result.error ?? "no plan returned");
    else {
      setPlan({ ...result.plan, itemCount: result.itemCount, provider: result.provider });
      onGenerated();
    }
    setWorking(false);
  };

  return (
    <Card className="border-nirva-violet/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[13px]">
          <Sparkles className="h-3.5 w-3.5 text-nirva-violet-soft" /> Strategy — วางกลยุทธ์แคมเปญ
        </CardTitle>
        <CardDescription>บอกเป้าหมายสั้น ๆ → AI อ่าน Brand Brief → Big Idea + drafts ลง pipeline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="เช่น เปิดตัวแคมเปญใหม่ไตรมาสนี้"
            className="h-9 flex-1 rounded-lg border border-nirva-border bg-white/[0.03] px-3 text-[12px] text-zinc-100 placeholder:text-nirva-muted/60 focus:border-nirva-violet/50 focus:outline-none"
          />
          <Button size="sm" onClick={generate} disabled={working || !goal.trim()}>
            {working ? "Thinking…" : "Generate"}
          </Button>
        </div>
        {error && <Badge className="border-red-500/30 bg-red-500/10 text-red-300">{error}</Badge>}
        {plan && (
          <div className="space-y-2 rounded-xl border border-nirva-violet/25 bg-nirva-violet/[0.06] p-3">
            <p className="text-[12px] font-semibold text-zinc-100">{plan.campaignName}</p>
            <p className="text-[11px] leading-relaxed text-zinc-300">💡 {plan.bigIdea}</p>
            <p className="text-[11px] leading-relaxed text-nirva-muted">🔍 {plan.insight}</p>
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              สร้าง {plan.itemCount} drafts ลง pipeline แล้ว · {plan.provider}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImagePanel({ item }: { item: ContentItem }) {
  const [prompt, setPrompt] = useState("");
  const [working, setWorking] = useState(false);
  const [assets, setAssets] = useState<MediaAssetLive[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(`ภาพโฆษณาสำหรับ: ${item.title}`);
    setError(null);
    getAssetsLive(item.id).then((result) => setAssets(result ?? []));
  }, [item.id, item.title]);

  const generate = async () => {
    if (!prompt.trim() || working) return;
    setWorking(true);
    setError(null);
    const result = await generateImageLive(prompt.trim(), item.id);
    if (!result) setError("backend offline");
    else if (result.error || !result.asset) setError(result.error ?? "no image returned");
    else setAssets((prev) => [result.asset!, ...prev]);
    setWorking(false);
  };

  return (
    <div className="mt-4 border-t border-nirva-border/50 pt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">
        🎨 AI Image — แผนกโปรดักชัน
      </p>
      <div className="flex items-center gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="บรรยายภาพที่ต้องการ…"
          className="h-9 flex-1 rounded-lg border border-nirva-border bg-white/[0.03] px-3 text-[12px] text-zinc-100 placeholder:text-nirva-muted/60 focus:border-nirva-violet/50 focus:outline-none"
        />
        <Button size="sm" variant="gold" onClick={generate} disabled={working || !prompt.trim()}>
          {working ? "Generating…" : "Generate image"}
        </Button>
      </div>
      {error && <Badge className="mt-2 border-red-500/30 bg-red-500/10 text-red-300">{error}</Badge>}
      {assets.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {assets.map((asset) => (
            <figure key={asset.id} className="overflow-hidden rounded-xl border border-nirva-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.dataUri} alt={asset.prompt} className="aspect-square w-full object-cover" />
              <figcaption className="truncate bg-nirva-bg/80 px-2 py-1 text-[9px] text-nirva-muted" title={asset.prompt}>
                {asset.provider} · {asset.prompt}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_BRIEF = { brandName: "", product: "", audience: "", tone: "", competitors: "", bannedWords: [] as string[], notes: "" };

function BrandBriefPanel() {
  const [open, setOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_BRIEF);

  useEffect(() => {
    getBrandBriefLive().then((result) => {
      if (result === "offline") setOffline(true);
      else if (result) {
        const { organizationId: _org, ...rest } = result as BrandBriefLive;
        setForm({ ...EMPTY_BRIEF, ...rest });
      }
    });
  }, []);

  const save = async () => {
    if (!form.brandName.trim() || saving) return;
    setSaving(true);
    const ok = await saveBrandBriefLive(form);
    setSavedAt(ok ? 1 : null);
    setOffline(!ok);
    setSaving(false);
  };

  const field = (key: keyof typeof EMPTY_BRIEF, label: string, placeholder: string) => (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-nirva-muted">{label}</p>
      <input
        value={key === "bannedWords" ? (form.bannedWords as string[]).join(", ") : (form[key] as string)}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            [key]: key === "bannedWords" ? e.target.value.split(",").map((w) => w.trim()).filter(Boolean) : e.target.value,
          }))
        }
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-nirva-border bg-white/[0.03] px-2.5 text-[12px] text-zinc-100 placeholder:text-nirva-muted/60 focus:border-nirva-violet/50 focus:outline-none"
      />
    </div>
  );

  return (
    <Card className="border-nirva-gold/30">
      <CardHeader className="cursor-pointer pb-2" onClick={() => setOpen((o) => !o)}>
        <CardTitle className="flex items-center gap-2 text-[13px]">
          <BookOpenCheck className="h-3.5 w-3.5 text-nirva-gold" /> Brand Brief — สมองชั้นแบรนด์
          <span className="ml-auto text-[10px] text-nirva-muted">{open ? "ซ่อน" : form.brandName ? form.brandName : "ตั้งค่า"}</span>
        </CardTitle>
        {!open && (
          <CardDescription>AI Writer อ่านบริบทนี้ทุกครั้ง — งานออกมาตรงแบรนด์ ไม่ต้องบรีฟซ้ำ</CardDescription>
        )}
      </CardHeader>
      {open && (
        <CardContent className="space-y-2.5">
          {field("brandName", "แบรนด์", "เช่น พันนา")}
          {field("product", "สินค้า/บริการ", "เช่น น้ำมันสมุนไพรบำบัดสายพรีเมียม")}
          {field("audience", "กลุ่มเป้าหมาย", "เช่น คนทำงานออฟฟิศ 25-45")}
          {field("tone", "โทนของแบรนด์", "เช่น อบอุ่น พรีเมียม ไม่ขายแข็ง")}
          {field("competitors", "คู่แข่ง", "เช่น ยาหม่องทั่วไป")}
          {field("bannedWords", "คำต้องห้าม (คั่นด้วย ,)", "เช่น ถูกที่สุด, ยาแก้ปวดคนแก่")}
          {field("notes", "โน้ตเพิ่มเติม", "เช่น แคมเปญหลักตอนนี้: พักสีเขียว")}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={saving || !form.brandName.trim()}>
              {saving ? "Saving…" : "Save brief"}
            </Button>
            {savedAt && <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">saved ✓ ใช้กับทุก generate</Badge>}
            {offline && <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">NMD offline</Badge>}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const AI_SUGGESTIONS = [
  "ลองเปิดด้วยตัวเลข: '7 แอป 1 โพสต์' สั้นและจำง่ายกว่า",
  "เวอร์ชัน Facebook ควรเล่าเป็น story ยาวขึ้น — ใช้ประสบการณ์จริงของ founder",
  "clip นี้ตัดเป็น teaser 15s สำหรับ campaign ได้ — ช่วง HOOK + CTA",
];

export default function ContentStudioPage() {
  const [selected, setSelected] = useState<ContentItem>(mockContentItems[0]);
  const [format, setFormat] = useState<ContentType>("tiktok");
  const [liveItems, setLiveItems] = useState<ContentItem[] | null>(null);

  const refreshLive = () => {
    getMediaContent().then((items) => {
      if (!items) return;
      // Newest 8 only — keep the prototype board calm even with a busy backend.
      setLiveItems(
        items.map(toBoardItem).filter((i): i is ContentItem => i !== null).slice(0, 8)
      );
    });
  };

  useEffect(refreshLive, []);

  const boardItems = useMemo(() => [...(liveItems ?? []), ...mockContentItems], [liveItems]);

  return (
    <>
      <PageHeader
        title="Content Studio"
        subtitle="เปลี่ยนไอเดียเป็นคอนเทนต์ — pipeline เดียว เห็นตั้งแต่ idea จนถึง published"
        actions={
          <div className="flex items-center gap-2">
            {liveItems !== null ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                NMD live · {liveItems.length} items
              </Badge>
            ) : (
              <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">mock mode</Badge>
            )}
            <Button size="sm">
              <Sparkles className="h-3.5 w-3.5" /> New from capture
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = boardItems.filter((item) => item.status === column.status);
          return (
            <div key={column.status} className="rounded-2xl border border-nirva-border/50 bg-white/[0.015] p-2.5">
              <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">{column.label}</p>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] tabular-nums text-nirva-muted">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <ContentCard key={item.id} item={item} selected={selected.id === item.id} onSelect={setSelected} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Draft Editor · {selected.title}</CardTitle>
              <CardDescription className="mt-1">Preview เท่านั้น — editor จริงมากับ database phase</CardDescription>
            </div>
            <PlatformBadge platform={selected.type} />
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-xl border border-nirva-border/60 bg-nirva-bg/70 p-4 font-sans text-[13px] leading-relaxed text-zinc-300">
              {selected.body
                ? selected.body
                : selected.id === "cnt_1"
                  ? MOCK_DRAFT
                  : `${selected.excerpt}\n\n(mock draft body — เลือกการ์ด 'Short video script' เพื่อดู draft เต็ม)`}
            </pre>
            {selected.live && <ImagePanel item={selected} />}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StrategyPanel onGenerated={refreshLive} />
          <BrandBriefPanel />
          {selected.live && <PublishPanel item={selected} onPublished={refreshLive} />}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Content format</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.type}
                  onClick={() => setFormat(f.type)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                    format === f.type
                      ? "border-nirva-violet/60 bg-nirva-violet/15 text-nirva-violet-soft"
                      : "border-nirva-border bg-white/[0.02] text-nirva-muted hover:text-zinc-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-nirva-gold/25">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px]">
                <Wand2 className="h-3.5 w-3.5 text-nirva-gold" /> AI draft suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {AI_SUGGESTIONS.map((suggestion) => (
                <div key={suggestion} className="rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-zinc-300">
                  {suggestion}
                </div>
              ))}
              <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">mock — real AI in Roadmap</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
