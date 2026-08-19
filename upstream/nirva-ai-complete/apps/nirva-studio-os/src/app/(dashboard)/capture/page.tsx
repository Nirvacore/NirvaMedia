"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Languages, Mic, MonitorPlay, Square, Upload, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptureCard } from "@/components/cards/capture-card";
import { mockCaptures } from "@/lib/mock-data";
import {
  createDraftContent,
  detectLanguageLive,
  transcribeAudioLive,
  type CreatedContent,
  type LiveDetection,
  type LiveTranscript,
} from "@/lib/nirva-api";
import { cn } from "@/lib/utils";

type Stage = "idle" | "recording" | "processing" | "done";

const MOCK_TRANSCRIPT =
  "โอเค ไอเดียใหม่สำหรับ podcast — ทำไมธุรกิจไทยถึงต้องการ AI ERP ไม่ใช่แค่ระบบบันทึกข้อมูล แต่เป็นระบบที่คิดกับเราได้ มองเห็น cash flow เดือนหน้า สต็อกที่กำลังจะขาด แล้วก็อยากให้มี segment สัมภาษณ์เจ้าของธุรกิจจริงด้วย...";

const MOCK_CLASSIFICATION = {
  title: "AI ERP for Thai businesses",
  summary: "ไอเดีย podcast ว่าด้วย ERP ที่มี AI ในตัวสำหรับ SME ไทย + segment สัมภาษณ์เจ้าของธุรกิจจริง",
  tags: ["podcast", "erp", "ai", "sme"],
  category: "Podcast idea",
  tasks: ["ร่าง outline EP.1", "ลิสต์รายชื่อแขกสัมภาษณ์ 5 คน", "Draft Facebook post จากไอเดียนี้"],
  formats: ["Podcast outline", "Facebook post", "TikTok clip (60s)", "Blog article"],
};

export default function CapturePage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscript | null>(null);
  const [micMode, setMicMode] = useState<"real" | "simulated">("simulated");
  const [note, setNote] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<LiveDetection | null | "offline">(null);

  const detectNote = async () => {
    if (!note.trim() || detecting) return;
    setDetecting(true);
    const result = await detectLanguageLive(note);
    setDetection(result ?? "offline");
    setDetecting(false);
  };

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CreatedContent | null | "offline">(null);

  const saveDraftToNmd = async () => {
    if (saving) return;
    setSaving(true);
    const content = await createDraftContent({
      title: MOCK_CLASSIFICATION.title,
      body: `${MOCK_CLASSIFICATION.summary}\n\n${liveTranscript?.text ?? MOCK_TRANSCRIPT}`,
      contentType: "post",
      sourceLang: "th",
      tags: MOCK_CLASSIFICATION.tags,
    });
    setSaved(content ?? "offline");
    setSaving(false);
  };

  useEffect(() => {
    if (stage === "recording") {
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [stage]);

  const startRecording = async () => {
    setSeconds(0);
    setLiveTranscript(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      mediaRecorder.start(250);
      recorder.current = mediaRecorder;
      setMicMode("real");
    } catch {
      // mic denied or unavailable — fall back to the simulated flow
      recorder.current = null;
      setMicMode("simulated");
    }
    setStage("recording");
  };

  const stopRecording = async () => {
    setStage("processing");
    const mediaRecorder = recorder.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        mediaRecorder.stop();
      });
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
      recorder.current = null;
      if (blob.size > 0) {
        const transcript = await transcribeAudioLive(blob, "th");
        setLiveTranscript(transcript);
        setStage("done");
        return;
      }
    }
    // simulated path keeps the original prototype pacing
    setTimeout(() => setStage("done"), 1600);
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <>
      <PageHeader title="Capture" subtitle="จับไอเดียให้เร็วที่สุด — พูด พิมพ์ หรืออัปโหลด แล้วให้ AI จัดระเบียบให้" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-nirva-violet/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-nirva-violet-soft" /> Voice Capture
            </CardTitle>
            <CardDescription>อัดเสียงไอเดีย แล้ว Nirva ถอดความ + จัดหมวดให้อัตโนมัติ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-nirva-border/60 bg-nirva-bg/60 px-6 py-8">
              <button
                onClick={() => {
                  if (stage === "recording") void stopRecording();
                  else void startRecording();
                }}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full transition-all",
                  stage === "recording"
                    ? "bg-red-500/20 text-red-400 shadow-[0_0_0_8px_rgba(239,68,68,0.08),0_0_40px_-4px_rgba(239,68,68,0.5)]"
                    : "bg-nirva-violet/20 text-nirva-violet-soft shadow-glow hover:bg-nirva-violet/30"
                )}
              >
                {stage === "recording" ? (
                  <Square className="h-7 w-7 fill-current" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <div className="text-center">
                {stage === "recording" ? (
                  <>
                    <p className="text-lg font-semibold tabular-nums text-red-300">{mmss}</p>
                    <p className="mt-0.5 text-xs text-nirva-muted">
                      {micMode === "real" ? "🎙️ Recording (mic live)… tap to stop" : "Recording (simulated)… tap to stop"}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-1">
                      {[...Array(12)].map((_, i) => (
                        <motion.span
                          key={i}
                          animate={{ height: [4, 14 + (i % 4) * 5, 4] }}
                          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.07 }}
                          className="w-1 rounded-full bg-red-400/70"
                        />
                      ))}
                    </div>
                  </>
                ) : stage === "processing" ? (
                  <p className="flex items-center gap-2 text-sm text-nirva-violet-soft">
                    <Wand2 className="h-4 w-4 animate-pulse" /> AI processing…
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-200">
                      {stage === "done" ? "Capture saved ✓ — record another?" : "Start Recording"}
                    </p>
                    <p className="mt-0.5 text-xs text-nirva-muted">
                      อัดเสียงจริงผ่านไมค์ · ถอดความผ่าน NLE เมื่อ backend ออนไลน์ · ไม่มีไมค์ = โหมดจำลอง
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-nirva-gold" /> Text Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="พิมพ์ไอเดียเร็ว ๆ ที่นี่… (prototype)"
                rows={3}
                className="w-full resize-none rounded-xl border border-nirva-border bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-nirva-muted/70 focus:border-nirva-violet/50 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm">
                  Save note
                </Button>
                <Button variant="outline" size="sm" onClick={detectNote} disabled={!note.trim() || detecting}>
                  <Languages className="h-3.5 w-3.5" /> {detecting ? "Detecting…" : "Detect language"}
                </Button>
                {detection === "offline" && (
                  <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">
                    NLE offline — mock mode
                  </Badge>
                )}
                {detection && detection !== "offline" && detection.language && (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                    {detection.languageInfo?.nativeName ?? detection.language} ·{" "}
                    {Math.round(detection.confidence * 100)}% · via NLE live
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: MonitorPlay, label: "Screen / Video", note: "Coming with Media Storage" },
              { icon: Upload, label: "Upload Media", note: "Coming with Media Storage" },
            ].map((item) => (
              <Card key={item.label} className="border-dashed opacity-70">
                <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                  <item.icon className="h-5 w-5 text-nirva-muted" />
                  <p className="text-xs font-medium text-zinc-300">{item.label}</p>
                  <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">{item.note}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {stage === "done" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <Card className="border-nirva-gold/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-nirva-gold" /> AI Processing Preview
                </CardTitle>
                <CardDescription>ตัวอย่างผลลัพธ์เมื่อ Real Voice Transcription เปิดใช้งาน</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-nirva-border/60 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">Transcript</p>
                    {liveTranscript ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        via NLE live · {liveTranscript.provider}
                      </Badge>
                    ) : (
                      <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">mock</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">
                    {liveTranscript?.text ?? MOCK_TRANSCRIPT}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">Title</p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{MOCK_CLASSIFICATION.title}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">Summary</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">{MOCK_CLASSIFICATION.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="border-nirva-violet/30 bg-nirva-violet/10 text-nirva-violet-soft">
                      {MOCK_CLASSIFICATION.category}
                    </Badge>
                    {MOCK_CLASSIFICATION.tags.map((tag) => (
                      <Badge key={tag} className="border-white/10 bg-white/[0.04] text-zinc-400">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">Suggested tasks</p>
                    <ul className="mt-1.5 space-y-1">
                      {MOCK_CLASSIFICATION.tasks.map((task) => (
                        <li key={task} className="flex items-center gap-2 text-xs text-zinc-300">
                          <span className="h-1 w-1 rounded-full bg-nirva-gold" /> {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-nirva-muted">Suggested content formats</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {MOCK_CLASSIFICATION.formats.map((format) => (
                        <Badge key={format} className="border-nirva-gold/30 bg-nirva-gold/10 text-nirva-gold">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                    <Button size="sm" onClick={saveDraftToNmd} disabled={saving || (saved !== null && saved !== "offline")}>
                      <Wand2 className="h-3.5 w-3.5" />
                      {saving ? "Saving…" : "Create draft in Content Studio"}
                    </Button>
                    {saved === "offline" && (
                      <Badge className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">NMD offline — mock mode</Badge>
                    )}
                    {saved && saved !== "offline" && (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        saved to NMD live · {saved.id} · {saved.contentStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-nirva-muted">Recent Captures</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        {mockCaptures.map((capture) => (
          <CaptureCard key={capture.id} capture={capture} />
        ))}
      </div>
    </>
  );
}
