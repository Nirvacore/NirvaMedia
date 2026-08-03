/**
 * NMD Nirva Media — content pipeline: AI Writer → platform variants →
 * multi-language translation (via NLE) → schedule → publish.
 * Design: docs/NMD_MEDIA_ARCHITECTURE.md
 *
 * Follows the same patterns as NID and NLE: standard column set,
 * audit on every mutation, swappable AI provider, module boundaries
 * crossed only through exported functions.
 */

import crypto from "node:crypto";
import { Router, type Response } from "express";
import { getDb, appendAuditLog } from "../db/index.ts";
import { getSessionFromRequest } from "../auth/index.ts";
import { translateText } from "../language/index.ts";
import {
  adaptTextForPlatform,
  canTransition,
  getPlatform,
  PLATFORMS,
  type BrandBrief,
  type ContentItem,
  type ContentStatus,
  type ContentType,
  type ContentVariant,
} from "../../shared/media.ts";

export interface WriterRequest {
  brief: string;
  contentType: ContentType;
  lang: string;
  tone?: string;
  /** Persistent brand context (the per-client brain layer), when one exists */
  brand?: BrandBrief | null;
}

/** Render the brand brief as system-prompt context for any writer provider. */
export function brandContextPrompt(brand: BrandBrief): string {
  const lines = [
    `Brand: ${brand.brandName}`,
    brand.product && `Product/Service: ${brand.product}`,
    brand.audience && `Target audience: ${brand.audience}`,
    brand.tone && `Brand tone: ${brand.tone}`,
    brand.competitors && `Competitors (do not praise): ${brand.competitors}`,
    brand.bannedWords.length > 0 && `NEVER use these words: ${brand.bannedWords.join(", ")}`,
    brand.notes && `Notes: ${brand.notes}`,
  ].filter(Boolean);
  return `Brand context:\n${lines.join("\n")}`;
}

export type WriterProvider = (req: WriterRequest) => Promise<{ title: string; body: string }>;

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_WRITER_MODEL = process.env.NMD_OLLAMA_MODEL || "llama3.1:8b";

async function ollamaWriter(req: WriterRequest): Promise<{ title: string; body: string }> {
  const tone = req.tone ? ` Tone: ${req.tone}.` : "";
  const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_WRITER_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content: `You are a professional content writer. Write a ${req.contentType} in language "${req.lang}".${tone}${req.brand ? `\n\n${brandContextPrompt(req.brand)}` : ""} Reply as JSON: {"title": "...", "body": "..."} with no other text.`,
        },
        { role: "user", content: req.brief },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  const raw = data.message?.content?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, "")) as { title?: string; body?: string };
    if (parsed.title && parsed.body) return { title: parsed.title, body: parsed.body };
  } catch {
    // fall through — treat the whole reply as the body
  }
  if (!raw) throw new Error("Empty draft from provider");
  return { title: raw.split("\n")[0].slice(0, 120), body: raw };
}

let activeWriter: { name: string; fn: WriterProvider } = { name: "ollama", fn: ollamaWriter };

export function setWriterProvider(name: string, fn: WriterProvider) {
  activeWriter = { name, fn };
}

let schemaReady = false;

export function ensureMediaSchema() {
  const db = getDb();
  if (schemaReady) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS nmd_content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'post',
      source_lang TEXT NOT NULL DEFAULT 'th',
      content_status TEXT NOT NULL DEFAULT 'draft',
      tags TEXT NOT NULL DEFAULT '[]',
      scheduled_at TEXT,
      organization_id TEXT NOT NULL DEFAULT 'tenant_nirva_default',
      status TEXT NOT NULL DEFAULT 'active',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT NOT NULL DEFAULT 'system',
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_nmd_content_org ON nmd_content(organization_id, content_status);
  `);

  // Migration for existing DBs: platforms chosen at schedule time.
  const contentCols = db.prepare("PRAGMA table_info(nmd_content)").all() as { name: string }[];
  if (!contentCols.some((c) => c.name === "scheduled_platforms")) {
    db.exec("ALTER TABLE nmd_content ADD COLUMN scheduled_platforms TEXT");
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS nmd_variants (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES nmd_content(id),
      platform TEXT NOT NULL,
      lang TEXT NOT NULL,
      body TEXT NOT NULL,
      truncated INTEGER NOT NULL DEFAULT 0,
      translation_provider TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (content_id, platform, lang)
    );
    CREATE INDEX IF NOT EXISTS idx_nmd_variants_content ON nmd_variants(content_id);

    CREATE TABLE IF NOT EXISTS nmd_briefs (
      organization_id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL DEFAULT '',
      product TEXT NOT NULL DEFAULT '',
      audience TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT '',
      competitors TEXT NOT NULL DEFAULT '',
      banned_words TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT NOT NULL DEFAULT 'system'
    );
  `);
  schemaReady = true;
  return db;
}

interface BriefRow {
  organization_id: string;
  brand_name: string;
  product: string;
  audience: string;
  tone: string;
  competitors: string;
  banned_words: string;
  notes: string;
  updated_at: string;
}

export function getBrandBrief(organizationId: string): BrandBrief | null {
  const row = ensureMediaSchema()
    .prepare("SELECT * FROM nmd_briefs WHERE organization_id = ?")
    .get(organizationId) as BriefRow | undefined;
  if (!row) return null;
  return {
    organizationId: row.organization_id,
    brandName: row.brand_name,
    product: row.product,
    audience: row.audience,
    tone: row.tone,
    competitors: row.competitors,
    bannedWords: JSON.parse(row.banned_words) as string[],
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export function saveBrandBrief(
  data: Omit<BrandBrief, "updatedAt">,
  actor = "system"
): BrandBrief {
  ensureMediaSchema().prepare(`
    INSERT INTO nmd_briefs (organization_id, brand_name, product, audience, tone, competitors, banned_words, notes, updated_at, updated_by)
    VALUES (@org, @brand, @product, @audience, @tone, @competitors, @banned, @notes, datetime('now'), @actor)
    ON CONFLICT (organization_id) DO UPDATE SET
      brand_name = @brand, product = @product, audience = @audience, tone = @tone,
      competitors = @competitors, banned_words = @banned, notes = @notes,
      updated_at = datetime('now'), updated_by = @actor
  `).run({
    org: data.organizationId,
    brand: data.brandName,
    product: data.product,
    audience: data.audience,
    tone: data.tone,
    competitors: data.competitors,
    banned: JSON.stringify(data.bannedWords),
    notes: data.notes,
    actor,
  });
  appendAuditLog({ action: "media.brief.save", actor, resource: `org:${data.organizationId}`, detail: data.brandName });
  return getBrandBrief(data.organizationId)!;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
}

interface ContentRow {
  id: string;
  title: string;
  body: string;
  content_type: string;
  source_lang: string;
  content_status: string;
  tags: string;
  scheduled_at: string | null;
  scheduled_platforms: string | null;
  organization_id: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function rowToContent(row: ContentRow): ContentItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    contentType: row.content_type as ContentType,
    sourceLang: row.source_lang,
    contentStatus: row.content_status as ContentStatus,
    tags: JSON.parse(row.tags) as string[],
    scheduledAt: row.scheduled_at,
    scheduledPlatforms: row.scheduled_platforms ? (JSON.parse(row.scheduled_platforms) as string[]) : null,
    organizationId: row.organization_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createContent(data: {
  title: string;
  body: string;
  contentType?: ContentType;
  sourceLang?: string;
  tags?: string[];
  organizationId?: string;
  actor?: string;
}): ContentItem {
  const db = ensureMediaSchema();
  const id = newId("cnt");
  const actor = data.actor ?? "system";
  db.prepare(`
    INSERT INTO nmd_content (id, title, body, content_type, source_lang, tags, organization_id, created_by, updated_by)
    VALUES (@id, @title, @body, @type, @lang, @tags, @org, @actor, @actor)
  `).run({
    id,
    title: data.title,
    body: data.body,
    type: data.contentType ?? "post",
    lang: data.sourceLang ?? "th",
    tags: JSON.stringify(data.tags ?? []),
    org: data.organizationId ?? "tenant_nirva_default",
    actor,
  });
  appendAuditLog({ action: "media.content.create", actor, resource: `content:${id}`, detail: data.title });
  return getContent(id)!;
}

export function getContent(id: string): ContentItem | null {
  const row = ensureMediaSchema()
    .prepare("SELECT * FROM nmd_content WHERE id = ? AND deleted_at IS NULL")
    .get(id) as ContentRow | undefined;
  return row ? rowToContent(row) : null;
}

export function listContent(opts: { organizationId?: string; contentStatus?: ContentStatus } = {}): ContentItem[] {
  const conditions = ["deleted_at IS NULL"];
  const params: string[] = [];
  if (opts.organizationId) { conditions.push("organization_id = ?"); params.push(opts.organizationId); }
  if (opts.contentStatus) { conditions.push("content_status = ?"); params.push(opts.contentStatus); }
  const rows = ensureMediaSchema()
    .prepare(`SELECT * FROM nmd_content WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`)
    .all(...params) as ContentRow[];
  return rows.map(rowToContent);
}

export function transitionContent(
  id: string,
  to: ContentStatus,
  actor: string,
  scheduledAt?: string,
  platforms?: string[]
): { content: ContentItem | null; error?: string } {
  const db = ensureMediaSchema();
  const current = getContent(id);
  if (!current) return { content: null, error: "Content not found" };
  if (!canTransition(current.contentStatus, to)) {
    return { content: current, error: `Cannot move from "${current.contentStatus}" to "${to}"` };
  }
  if (to === "scheduled" && !scheduledAt && !current.scheduledAt) {
    return { content: current, error: "scheduledAt is required to schedule content" };
  }
  // Remember which platforms this schedule targets so the scheduler never
  // publishes to variants left over from an earlier publish/schedule.
  const chosen =
    to === "scheduled" && Array.isArray(platforms) && platforms.length > 0
      ? JSON.stringify(platforms.filter((p) => typeof p === "string" && getPlatform(p)).map((p) => getPlatform(p)!.id))
      : null;
  db.prepare(`
    UPDATE nmd_content
    SET content_status = @to, scheduled_at = COALESCE(@sched, scheduled_at),
        scheduled_platforms = COALESCE(@platforms, scheduled_platforms),
        version = version + 1, updated_at = datetime('now'), updated_by = @actor
    WHERE id = @id
  `).run({ id, to, sched: scheduledAt ?? null, platforms: chosen, actor });
  appendAuditLog({ action: "media.content.transition", actor, resource: `content:${id}`, detail: `${current.contentStatus} -> ${to}` });
  return { content: getContent(id) };
}

/** AI Writer — drafts content through the swappable writer provider. */
export async function generateContent(
  req: WriterRequest & { organizationId?: string; tags?: string[] },
  actor = "system"
): Promise<{ content: ContentItem | null; error?: string }> {
  try {
    // Two-layer brain: the caller's prompt + the persistent brand brief.
    const brand = req.brand ?? getBrandBrief(req.organizationId ?? "tenant_nirva_default");
    const draft = await activeWriter.fn({ ...req, brand });
    const content = createContent({
      title: draft.title,
      body: draft.body,
      contentType: req.contentType,
      sourceLang: req.lang,
      tags: req.tags,
      organizationId: req.organizationId,
      actor,
    });
    return { content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: null, error: `Writer provider unavailable: ${message}` };
  }
}

interface VariantRow {
  id: string;
  content_id: string;
  platform: string;
  lang: string;
  body: string;
  truncated: number;
  translation_provider: string | null;
  created_at: string;
}

function rowToVariant(row: VariantRow): ContentVariant {
  return {
    id: row.id,
    contentId: row.content_id,
    platform: row.platform,
    lang: row.lang,
    body: row.body,
    truncated: row.truncated === 1,
    translationProvider: row.translation_provider,
    createdAt: row.created_at,
  };
}

export function listVariants(contentId: string): ContentVariant[] {
  const rows = ensureMediaSchema()
    .prepare("SELECT * FROM nmd_variants WHERE content_id = ? ORDER BY platform, lang")
    .all(contentId) as VariantRow[];
  return rows.map(rowToVariant);
}

/**
 * Create-once, publish-everywhere: fan the source content out to
 * platform × language variants. Translation goes through NLE (with its
 * translation memory); adaptation applies each platform's constraints.
 * Languages that fail to translate are reported, not silently dropped.
 */
export async function buildVariants(
  contentId: string,
  platforms: string[],
  langs: string[],
  actor = "system"
): Promise<{ variants: ContentVariant[]; failures: Array<{ lang: string; error: string }> }> {
  const db = ensureMediaSchema();
  const content = getContent(contentId);
  if (!content) throw new Error("Content not found");
  for (const p of platforms) {
    if (!getPlatform(p)) throw new Error(`Unknown platform "${p}"`);
  }

  const targetLangs = langs.length > 0 ? langs : [content.sourceLang];
  const texts = new Map<string, { body: string; provider: string | null }>();
  const failures: Array<{ lang: string; error: string }> = [];

  for (const lang of targetLangs) {
    if (lang === content.sourceLang) {
      texts.set(lang, { body: content.body, provider: null });
      continue;
    }
    const result = await translateText(
      { text: content.body, sourceLang: content.sourceLang, targetLang: lang },
      actor
    );
    if (result.translated) {
      texts.set(lang, { body: result.translated, provider: result.provider });
    } else {
      failures.push({ lang, error: result.error ?? "Unknown translation failure" });
    }
  }

  const upsert = db.prepare(`
    INSERT INTO nmd_variants (id, content_id, platform, lang, body, truncated, translation_provider)
    VALUES (@id, @content_id, @platform, @lang, @body, @truncated, @provider)
    ON CONFLICT (content_id, platform, lang)
    DO UPDATE SET body = @body, truncated = @truncated, translation_provider = @provider
  `);

  const saveAll = db.transaction(() => {
    for (const platform of platforms) {
      for (const [lang, { body, provider }] of Array.from(texts.entries())) {
        const adapted = adaptTextForPlatform(body, platform);
        upsert.run({
          id: newId("var"),
          content_id: contentId,
          platform,
          lang,
          body: adapted.body,
          truncated: adapted.truncated ? 1 : 0,
          provider,
        });
      }
    }
  });
  saveAll();

  appendAuditLog({
    action: "media.variants.build",
    actor,
    resource: `content:${contentId}`,
    detail: `${platforms.length} platforms × ${texts.size} langs (${failures.length} failed)`,
  });
  return { variants: listVariants(contentId), failures };
}

// ---------------------------------------------------------------------------
// HTTP API — /api/v1/media/*
// ---------------------------------------------------------------------------

function fail(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

export function createMediaRouter(): Router {
  const router = Router();

  // Scheduler trigger — registered BEFORE session auth so cron/n8n can call
  // it with a bearer token (NMD_SCHEDULER_TOKEN). A logged-in session works
  // too. Example crontab line:
  //   * * * * * curl -s -X POST -H "Authorization: Bearer $NMD_SCHEDULER_TOKEN" http://localhost:3000/api/v1/media/publish-due
  router.post("/publish-due", async (req, res) => {
    ensureMediaSchema();
    const configured = process.env.NMD_SCHEDULER_TOKEN;
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const session = getSessionFromRequest(req);
    const tokenOk = Boolean(
      configured &&
        bearer &&
        bearer.length === configured.length &&
        crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(configured))
    );
    if (!tokenOk && !session) {
      return fail(res, 401, "NMD-401-AUTH", "Session or NMD_SCHEDULER_TOKEN bearer required");
    }
    const { processDueContent } = await import("./publish.ts");
    res.json({ processed: await processDueContent(session?.id ?? "scheduler-cron") });
  });

  router.use((req, res, next) => {
    ensureMediaSchema();
    const session = getSessionFromRequest(req);
    if (!session) {
      fail(res, 401, "NMD-401-AUTH", "Authentication required");
      return;
    }
    (req as typeof req & { actorId: string }).actorId = session.id;
    next();
  });

  const actorOf = (req: unknown): string => (req as { actorId: string }).actorId;

  router.get("/platforms", (_req, res) => {
    res.json({ platforms: PLATFORMS, count: PLATFORMS.length });
  });

  router.get("/brief", (req, res) => {
    const organizationId = String(req.query.organizationId || "tenant_nirva_default");
    res.json({ brief: getBrandBrief(organizationId) });
  });

  router.put("/brief", (req, res) => {
    const { organizationId, brandName, product, audience, tone, competitors, bannedWords, notes } = req.body ?? {};
    if (!brandName) return fail(res, 400, "NMD-400-INPUT", "brandName is required");
    const brief = saveBrandBrief(
      {
        organizationId: organizationId || "tenant_nirva_default",
        brandName,
        product: product ?? "",
        audience: audience ?? "",
        tone: tone ?? "",
        competitors: competitors ?? "",
        bannedWords: Array.isArray(bannedWords) ? bannedWords : [],
        notes: notes ?? "",
      },
      actorOf(req)
    );
    res.json({ brief });
  });

  router.get("/content", (req, res) => {
    const { organizationId, status } = req.query;
    res.json({
      content: listContent({
        organizationId: organizationId ? String(organizationId) : undefined,
        contentStatus: status ? (String(status) as ContentStatus) : undefined,
      }),
    });
  });

  router.post("/content", (req, res) => {
    const { title, body, contentType, sourceLang, tags, organizationId } = req.body ?? {};
    if (!title || !body) return fail(res, 400, "NMD-400-INPUT", "title and body are required");
    const content = createContent({ title, body, contentType, sourceLang, tags, organizationId, actor: actorOf(req) });
    res.status(201).json({ content });
  });

  router.get("/content/:id", (req, res) => {
    const content = getContent(req.params.id);
    if (!content) return fail(res, 404, "NMD-404-CONTENT", "Content not found");
    res.json({ content, variants: listVariants(content.id) });
  });

  router.post("/content/:id/transition", (req, res) => {
    const { to, scheduledAt, platforms } = req.body ?? {};
    if (!to) return fail(res, 400, "NMD-400-INPUT", "target status 'to' is required");
    const { content, error } = transitionContent(req.params.id, to, actorOf(req), scheduledAt, platforms);
    if (error) return fail(res, content ? 409 : 404, "NMD-409-FLOW", error);
    res.json({ content });
  });

  // AI Image (NMD-1200): generate ad images and attach them to content.
  router.post("/image", async (req, res) => {
    const { prompt, contentId, organizationId, size } = req.body ?? {};
    if (!prompt || typeof prompt !== "string") {
      return fail(res, 400, "NMD-400-INPUT", "prompt is required");
    }
    const { generateImage } = await import("./images.ts");
    const result = await generateImage({ prompt, contentId, organizationId, size }, actorOf(req));
    if (result.error === "Content not found") return fail(res, 404, "NMD-404-CONTENT", result.error);
    res.status(result.error ? 502 : 201).json(result);
  });

  router.get("/assets", async (req, res) => {
    const { listAssets } = await import("./images.ts");
    const contentId = req.query.contentId ? String(req.query.contentId) : undefined;
    res.json({ assets: listAssets(contentId) });
  });

  // Analytics (NMD-1900): record real numbers, get stats + AI insights.
  router.post("/metrics", async (req, res) => {
    const { contentId, platform, period, reach, engagement, clicks, notes, organizationId } = req.body ?? {};
    if (!platform || typeof reach !== "number" || typeof engagement !== "number") {
      return fail(res, 400, "NMD-400-INPUT", "platform, reach, and engagement are required");
    }
    const { recordMetrics } = await import("./analytics.ts");
    res.status(201).json({
      metric: recordMetrics({ contentId, platform, period, reach, engagement, clicks, notes, organizationId }, actorOf(req)),
    });
  });

  router.get("/metrics", async (req, res) => {
    const { listMetrics, computeStats } = await import("./analytics.ts");
    const organizationId = String(req.query.organizationId || "tenant_nirva_default");
    const entries = listMetrics(organizationId);
    res.json({ metrics: entries, stats: computeStats(entries) });
  });

  router.post("/analyze", async (req, res) => {
    const { analyzePerformance } = await import("./analytics.ts");
    const organizationId = String(req.body?.organizationId || "tenant_nirva_default");
    const result = await analyzePerformance(organizationId, actorOf(req));
    res.status(result.error && !result.insights ? (result.stats.entries === 0 ? 400 : 502) : 200).json(result);
  });

  // Strategy skill: goal -> Big Idea + insight -> drafts in the pipeline.
  router.post("/campaign", async (req, res) => {
    const { goal, lang, postCount, organizationId } = req.body ?? {};
    if (!goal || !lang) return fail(res, 400, "NMD-400-INPUT", "goal and lang are required");
    const { generateCampaign } = await import("./strategy.ts");
    const result = await generateCampaign({ goal, lang, postCount, organizationId }, actorOf(req));
    res.status(result.error ? 502 : 201).json(result);
  });

  router.post("/generate", async (req, res) => {
    const { brief, contentType, lang, tone, tags, organizationId } = req.body ?? {};
    if (!brief || !lang) return fail(res, 400, "NMD-400-INPUT", "brief and lang are required");
    const { content, error } = await generateContent(
      { brief, contentType: contentType ?? "post", lang, tone, tags, organizationId },
      actorOf(req)
    );
    if (error) return fail(res, 502, "NMD-502-WRITER", error);
    res.status(201).json({ content });
  });

  router.post("/content/:id/variants", async (req, res) => {
    const { platforms, langs } = req.body ?? {};
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return fail(res, 400, "NMD-400-INPUT", "platforms array is required");
    }
    try {
      const result = await buildVariants(req.params.id, platforms, Array.isArray(langs) ? langs : [], actorOf(req));
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) return fail(res, 404, "NMD-404-CONTENT", message);
      if (message.includes("Unknown platform")) return fail(res, 400, "NMD-400-PLATFORM", message);
      throw err;
    }
  });

  router.get("/connectors", async (_req, res) => {
    const { listConnectedPlatforms } = await import("./publish.ts");
    res.json({ connected: listConnectedPlatforms() });
  });

  router.post("/content/:id/publish", async (req, res) => {
    const { platforms } = req.body ?? {};
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return fail(res, 400, "NMD-400-INPUT", "platforms array is required");
    }
    const { publishContent } = await import("./publish.ts");
    try {
      const result = await publishContent(req.params.id, platforms, actorOf(req));
      res.status(result.failures > 0 ? 207 : 200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) return fail(res, 404, "NMD-404-CONTENT", message);
      if (message.includes("Unknown platform")) return fail(res, 400, "NMD-400-PLATFORM", message);
      throw err;
    }
  });

  router.get("/content/:id/publishes", async (req, res) => {
    const { listPublishRecords } = await import("./publish.ts");
    res.json({ publishes: listPublishRecords(req.params.id) });
  });

  return router;
}
