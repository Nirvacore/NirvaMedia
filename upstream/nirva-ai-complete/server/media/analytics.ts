/**
 * NMD Analytics (NMD-1900) — the "results department": record real
 * numbers from the platforms back into the system, compute deterministic
 * stats, and let a swappable analyst provider explain what worked and
 * what to do next (reading the brand brief for context).
 *
 * Provider rules match the rest of NMD: default Ollama,
 * NMD_DEMO_CONNECTORS=1 resolves a zero-cost demo analyst.
 */

import crypto from "node:crypto";
import { appendAuditLog, getDb } from "../db/index.ts";
import { brandContextPrompt, ensureMediaSchema, getBrandBrief, getContent } from "./index.ts";
import type { BrandBrief } from "../../shared/media.ts";

export interface MetricEntry {
  id: string;
  contentId: string | null;
  contentTitle: string | null;
  platform: string;
  period: string;
  reach: number;
  engagement: number;
  clicks: number;
  notes: string;
  createdAt: string;
}

let schemaReady = false;

function ensureAnalyticsSchema() {
  const db = ensureMediaSchema();
  if (schemaReady) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS nmd_metrics (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      platform TEXT NOT NULL DEFAULT '',
      period TEXT NOT NULL DEFAULT '',
      reach INTEGER NOT NULL DEFAULT 0,
      engagement INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      organization_id TEXT NOT NULL DEFAULT 'tenant_nirva_default',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system'
    );
    CREATE INDEX IF NOT EXISTS idx_nmd_metrics_org ON nmd_metrics(organization_id, created_at);
  `);
  schemaReady = true;
  return db;
}

interface MetricRow {
  id: string;
  content_id: string | null;
  platform: string;
  period: string;
  reach: number;
  engagement: number;
  clicks: number;
  notes: string;
  created_at: string;
}

function rowToEntry(row: MetricRow): MetricEntry {
  const content = row.content_id ? getContent(row.content_id) : null;
  return {
    id: row.id,
    contentId: row.content_id,
    contentTitle: content?.title ?? null,
    platform: row.platform,
    period: row.period,
    reach: row.reach,
    engagement: row.engagement,
    clicks: row.clicks,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function recordMetrics(
  data: {
    contentId?: string;
    platform: string;
    period?: string;
    reach: number;
    engagement: number;
    clicks?: number;
    notes?: string;
    organizationId?: string;
  },
  actor = "system"
): MetricEntry {
  const db = ensureAnalyticsSchema();
  const id = `met_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
  db.prepare(`
    INSERT INTO nmd_metrics (id, content_id, platform, period, reach, engagement, clicks, notes, organization_id, created_by)
    VALUES (@id, @content_id, @platform, @period, @reach, @engagement, @clicks, @notes, @org, @actor)
  `).run({
    id,
    content_id: data.contentId ?? null,
    platform: data.platform,
    period: data.period ?? "",
    reach: Math.max(0, data.reach),
    engagement: Math.max(0, data.engagement),
    clicks: Math.max(0, data.clicks ?? 0),
    notes: data.notes ?? "",
    org: data.organizationId ?? "tenant_nirva_default",
    actor,
  });
  appendAuditLog({ action: "media.metrics.record", actor, resource: `metrics:${id}`, detail: `${data.platform} reach=${data.reach}` });
  return rowToEntry(ensureAnalyticsSchema().prepare("SELECT * FROM nmd_metrics WHERE id = ?").get(id) as MetricRow);
}

export function listMetrics(organizationId = "tenant_nirva_default"): MetricEntry[] {
  const rows = ensureAnalyticsSchema()
    .prepare("SELECT * FROM nmd_metrics WHERE organization_id = ? ORDER BY created_at DESC LIMIT 200")
    .all(organizationId) as MetricRow[];
  return rows.map(rowToEntry);
}

export interface PerformanceStats {
  entries: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  engagementRate: number; // engagement / reach
  best: { title: string; platform: string; rate: number } | null;
  worst: { title: string; platform: string; rate: number } | null;
}

/** Deterministic stats — no AI required, always available. */
export function computeStats(entries: MetricEntry[]): PerformanceStats {
  const totalReach = entries.reduce((sum, e) => sum + e.reach, 0);
  const totalEngagement = entries.reduce((sum, e) => sum + e.engagement, 0);
  const rated = entries
    .filter((e) => e.reach > 0)
    .map((e) => ({ title: e.contentTitle ?? e.platform, platform: e.platform, rate: e.engagement / e.reach }))
    .sort((a, b) => b.rate - a.rate);
  return {
    entries: entries.length,
    totalReach,
    totalEngagement,
    totalClicks: entries.reduce((sum, e) => sum + e.clicks, 0),
    engagementRate: totalReach > 0 ? +(totalEngagement / totalReach).toFixed(4) : 0,
    best: rated[0] ?? null,
    worst: rated.length > 1 ? rated[rated.length - 1] : null,
  };
}

export interface PerformanceInsights {
  summary: string;
  working: string[];
  notWorking: string[];
  recommendations: string[];
}

export interface AnalystRequest {
  brand: BrandBrief | null;
  stats: PerformanceStats;
  entries: MetricEntry[];
}

export type AnalystProvider = (req: AnalystRequest) => Promise<PerformanceInsights>;

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_ANALYST_MODEL = process.env.NMD_ANALYST_MODEL || "llama3.1:8b";

async function ollamaAnalyst(req: AnalystRequest): Promise<PerformanceInsights> {
  const brandBlock = req.brand ? `\n\n${brandContextPrompt(req.brand)}` : "";
  const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_ANALYST_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            `You are a marketing performance analyst. Analyze the data and reply in Thai as JSON only: ` +
            `{"summary": "...", "working": ["..."], "notWorking": ["..."], "recommendations": ["..."]}.${brandBlock}`,
        },
        {
          role: "user",
          content: `Stats: ${JSON.stringify(req.stats)}\nEntries: ${JSON.stringify(
            req.entries.slice(0, 50).map((e) => ({ title: e.contentTitle, platform: e.platform, reach: e.reach, engagement: e.engagement, clicks: e.clicks }))
          )}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  const parsed = JSON.parse((data.message?.content ?? "").replace(/^```json?\s*|\s*```$/g, "")) as PerformanceInsights;
  if (!parsed.summary) throw new Error("Analyst returned an incomplete report");
  return parsed;
}

/** Zero-cost deterministic analyst for demos/tests. */
async function demoAnalyst(req: AnalystRequest): Promise<PerformanceInsights> {
  const rate = (req.stats.engagementRate * 100).toFixed(1);
  return {
    summary: `[demo] ${req.stats.entries} รายการ · reach รวม ${req.stats.totalReach.toLocaleString()} · engagement rate ${rate}%`,
    working: req.stats.best ? [`"${req.stats.best.title}" (${req.stats.best.platform}) ทำ rate สูงสุด ${(req.stats.best.rate * 100).toFixed(1)}%`] : [],
    notWorking: req.stats.worst ? [`"${req.stats.worst.title}" (${req.stats.worst.platform}) rate ต่ำสุด ${(req.stats.worst.rate * 100).toFixed(1)}%`] : [],
    recommendations: [
      "ทำซ้ำรูปแบบของโพสต์ที่ rate สูงสุดในสัปดาห์หน้า",
      "เชื่อม LLM provider เพื่อรับบทวิเคราะห์เชิงลึกจริง",
    ],
  };
}

let activeAnalyst: { name: string; fn: AnalystProvider } | null = null;

function resolveAnalyst(): { name: string; fn: AnalystProvider } {
  if (activeAnalyst) return activeAnalyst;
  if (process.env.NMD_DEMO_CONNECTORS === "1" || process.env.NMD_DEMO_CONNECTORS === "true") {
    return { name: "demo", fn: demoAnalyst };
  }
  return { name: "ollama", fn: ollamaAnalyst };
}

export function setAnalystProvider(name: string, fn: AnalystProvider) {
  activeAnalyst = { name, fn };
}

export interface AnalysisResult {
  stats: PerformanceStats;
  insights: PerformanceInsights | null;
  provider: string;
  error?: string;
}

export async function analyzePerformance(organizationId = "tenant_nirva_default", actor = "system"): Promise<AnalysisResult> {
  const entries = listMetrics(organizationId);
  const stats = computeStats(entries);
  const provider = resolveAnalyst();
  if (entries.length === 0) {
    return { stats, insights: null, provider: provider.name, error: "No metrics recorded yet" };
  }
  try {
    const raw = await provider.fn({ brand: getBrandBrief(organizationId), stats, entries });
    // LLM output is untrusted: normalize so a summary-only or mis-typed
    // response can never crash the UI's .map() calls.
    const toStrings = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
    const insights: PerformanceInsights = {
      summary: typeof raw?.summary === "string" ? raw.summary : "",
      working: toStrings(raw?.working),
      notWorking: toStrings(raw?.notWorking),
      recommendations: toStrings(raw?.recommendations),
    };
    if (!insights.summary) throw new Error("Analyst returned an incomplete report");
    appendAuditLog({ action: "media.analytics.analyze", actor, resource: `org:${organizationId}`, detail: `${entries.length} entries` });
    return { stats, insights, provider: provider.name };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { stats, insights: null, provider: provider.name, error: `Analyst unavailable: ${message}` };
  }
}
