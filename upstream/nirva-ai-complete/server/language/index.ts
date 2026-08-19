/**
 * NLE Nirva Language Engine — translation with swappable providers and a
 * translation-memory cache (Phase 2 core).
 * Design: docs/NLE_LANGUAGE_ENGINE_ARCHITECTURE.md
 *
 * Detection and localization are pure functions in shared/language.ts;
 * this module adds the parts that need state: the provider registry,
 * the SQLite translation cache, and the /api/v1/language router.
 */

import crypto from "node:crypto";
import express, { Router, type Response } from "express";
import { getDb } from "../db/index.ts";
import { getSessionFromRequest } from "../auth/index.ts";
import {
  LANGUAGES,
  detectLanguageByScript,
  getLanguage,
  localize,
} from "../../shared/language.ts";
import { getSttProviderName, transcribeAudio } from "./voice.ts";

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  tone?: string;
}

export interface TranslationResult {
  translated: string | null;
  sourceLang: string;
  targetLang: string;
  provider: string;
  cached: boolean;
  error?: string;
}

export type TranslationProvider = (req: TranslationRequest) => Promise<{ translated: string; model?: string }>;

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_TRANSLATE_MODEL = process.env.NLE_OLLAMA_MODEL || "llama3.1:8b";

/**
 * Default provider: local Ollama. Swappable per the constitution's
 * "change AI provider without changing the system" rule — call
 * setTranslationProvider() to plug in any other backend.
 */
async function ollamaProvider(req: TranslationRequest): Promise<{ translated: string; model?: string }> {
  const source = getLanguage(req.sourceLang)?.name ?? req.sourceLang;
  const target = getLanguage(req.targetLang)?.name ?? req.targetLang;
  const tone = req.tone ? ` Use a ${req.tone} tone.` : "";
  const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_TRANSLATE_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the user's text from ${source} to ${target}.${tone} Reply with ONLY the translation, no explanations.`,
        },
        { role: "user", content: req.text },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  const translated = data.message?.content?.trim();
  if (!translated) throw new Error("Empty translation from provider");
  return { translated, model: OLLAMA_TRANSLATE_MODEL };
}

let activeProvider: { name: string; fn: TranslationProvider } = { name: "ollama", fn: ollamaProvider };

export function setTranslationProvider(name: string, fn: TranslationProvider) {
  activeProvider = { name, fn };
}

export function getTranslationProviderName(): string {
  return activeProvider.name;
}

let schemaReady = false;

export function ensureLanguageSchema() {
  const db = getDb();
  if (schemaReady) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS nle_translations (
      id TEXT PRIMARY KEY,
      source_hash TEXT NOT NULL UNIQUE,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT '',
      source_text TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      provider TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT NOT NULL DEFAULT 'system',
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_nle_langs ON nle_translations(source_lang, target_lang);
  `);
  schemaReady = true;
  return db;
}

function cacheKey(req: TranslationRequest): string {
  return crypto
    .createHash("sha256")
    .update(`${req.sourceLang}|${req.targetLang}|${req.tone ?? ""}|${req.text}`)
    .digest("hex");
}

/**
 * Translation memory first ("reuse before build" applied to tokens),
 * then the active provider. Provider failures come back as a structured
 * error instead of throwing so callers can degrade gracefully.
 */
export async function translateText(req: TranslationRequest, actor = "system"): Promise<TranslationResult> {
  const db = ensureLanguageSchema();
  const base = { sourceLang: req.sourceLang, targetLang: req.targetLang };
  if (!getLanguage(req.targetLang)) {
    return { translated: null, ...base, provider: "none", cached: false, error: `Unsupported target language "${req.targetLang}"` };
  }
  if (req.sourceLang === req.targetLang) {
    return { translated: req.text, ...base, provider: "identity", cached: false };
  }

  const hash = cacheKey(req);
  const hit = db
    .prepare("SELECT translated_text, provider FROM nle_translations WHERE source_hash = ? AND deleted_at IS NULL")
    .get(hash) as { translated_text: string; provider: string } | undefined;
  if (hit) {
    db.prepare("UPDATE nle_translations SET hits = hits + 1, updated_at = datetime('now') WHERE source_hash = ?").run(hash);
    return { translated: hit.translated_text, ...base, provider: hit.provider, cached: true };
  }

  try {
    const { translated } = await activeProvider.fn(req);
    db.prepare(`
      INSERT OR IGNORE INTO nle_translations
        (id, source_hash, source_lang, target_lang, tone, source_text, translated_text, provider, created_by, updated_by)
      VALUES (@id, @hash, @src, @tgt, @tone, @text, @translated, @provider, @actor, @actor)
    `).run({
      id: `tr_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`,
      hash,
      src: req.sourceLang,
      tgt: req.targetLang,
      tone: req.tone ?? "",
      text: req.text,
      translated,
      provider: activeProvider.name,
      actor,
    });
    return { translated, ...base, provider: activeProvider.name, cached: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { translated: null, ...base, provider: activeProvider.name, cached: false, error: `Translation provider unavailable: ${message}` };
  }
}

export function getTranslationStats() {
  const db = ensureLanguageSchema();
  const row = db.prepare(`
    SELECT COUNT(*) as entries, COALESCE(SUM(hits), 0) as cacheHits FROM nle_translations WHERE deleted_at IS NULL
  `).get() as { entries: number; cacheHits: number };
  return { entries: row.entries, cacheHits: row.cacheHits, provider: activeProvider.name };
}

// ---------------------------------------------------------------------------
// HTTP API — /api/v1/language/*
// ---------------------------------------------------------------------------

function fail(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

export function createLanguageRouter(): Router {
  const router = Router();

  router.use((_req, _res, next) => {
    ensureLanguageSchema();
    next();
  });

  router.get("/languages", (_req, res) => {
    res.json({ languages: LANGUAGES, count: LANGUAGES.length });
  });

  router.post("/detect", (req, res) => {
    const { text } = req.body ?? {};
    if (typeof text !== "string" || !text.trim()) {
      return fail(res, 400, "NLE-400-INPUT", "text is required");
    }
    const detection = detectLanguageByScript(text);
    res.json({ ...detection, languageInfo: detection.language ? getLanguage(detection.language) : null });
  });

  router.post("/localize", (req, res) => {
    const { number, currencyAmount, date, locale, currency, timezone } = req.body ?? {};
    if (locale && !getLanguage(locale)) {
      return fail(res, 400, "NLE-400-LOCALE", `Unsupported locale "${locale}"`);
    }
    try {
      res.json(localize({ number, currencyAmount, date }, { locale, currency, timezone }));
    } catch (err) {
      fail(res, 400, "NLE-400-INPUT", err instanceof Error ? err.message : String(err));
    }
  });

  // Translation costs tokens — require an authenticated session.
  router.post("/translate", async (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) return fail(res, 401, "NLE-401-AUTH", "Authentication required");
    const { text, sourceLang, targetLang, tone } = req.body ?? {};
    if (typeof text !== "string" || !text.trim() || !sourceLang || !targetLang) {
      return fail(res, 400, "NLE-400-INPUT", "text, sourceLang, and targetLang are required");
    }
    if (text.length > 20_000) {
      return fail(res, 413, "NLE-413-SIZE", "text exceeds 20,000 characters — split into chunks");
    }
    const result = await translateText({ text, sourceLang, targetLang, tone }, session.id);
    res.status(result.error ? 502 : 200).json(result);
  });

  router.get("/stats", (_req, res) => {
    res.json({ ...getTranslationStats(), sttProvider: getSttProviderName() });
  });

  // Speech-to-text (NLE-1700) — raw audio body, session required (costs tokens).
  router.post(
    "/transcribe",
    express.raw({ type: ["audio/*", "application/octet-stream"], limit: "16mb" }),
    async (req, res) => {
      const session = getSessionFromRequest(req);
      if (!session) return fail(res, 401, "NLE-401-AUTH", "Authentication required");
      const audio = req.body as Buffer;
      if (!Buffer.isBuffer(audio) || audio.length === 0) {
        return fail(res, 400, "NLE-400-AUDIO", "Send raw audio bytes with an audio/* content type");
      }
      const mimeType = req.headers["content-type"] || "audio/webm";
      const lang = typeof req.query.lang === "string" ? req.query.lang : undefined;
      const result = await transcribeAudio({ audio, mimeType, lang });
      res.status(result.error ? 502 : 200).json(result);
    }
  );

  return router;
}
