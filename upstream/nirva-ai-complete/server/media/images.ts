/**
 * NMD AI Image (NMD-1200) — the "production department": generate ad
 * images behind a swappable provider and attach them to pipeline content.
 *
 * Provider resolution (free options first, same rules as NLE STT):
 *   1. NMD_DEMO_CONNECTORS=1 → deterministic branded SVG (zero cost)
 *   2. NMD_IMAGE_URL         → self-hosted OpenAI-compatible images API
 *                              (LocalAI, Stable Diffusion gateways)
 *   3. OPENAI_API_KEY        → OpenAI images (paid)
 */

import crypto from "node:crypto";
import { appendAuditLog } from "../db/index.ts";
import { ensureMediaSchema, getBrandBrief, getContent } from "./index.ts";
import type { BrandBrief } from "../../shared/media.ts";

export interface ImageRequest {
  prompt: string;
  brand: BrandBrief | null;
  size?: string;
}

export type ImageProvider = (req: ImageRequest) => Promise<{ dataUri: string; model?: string }>;

const MAX_DATA_URI_BYTES = 8 * 1024 * 1024;

async function openAICompatibleImages(
  req: ImageRequest,
  baseUrl: string,
  opts: { key?: string; model: string }
): Promise<{ dataUri: string; model?: string }> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.key ? { Authorization: `Bearer ${opts.key}` } : {}),
    },
    body: JSON.stringify({
      model: opts.model,
      prompt: req.prompt,
      size: req.size || "1024x1024",
      response_format: "b64_json",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Images API ${response.status}`);
  const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (first?.b64_json) return { dataUri: `data:image/png;base64,${first.b64_json}`, model: opts.model };
  if (first?.url) return { dataUri: first.url, model: opts.model };
  throw new Error("Empty image from provider");
}

async function openaiImages(req: ImageRequest): Promise<{ dataUri: string; model?: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return openAICompatibleImages(req, "https://api.openai.com", {
    key,
    model: process.env.NMD_IMAGE_MODEL || "gpt-image-1",
  });
}

async function localImages(req: ImageRequest): Promise<{ dataUri: string; model?: string }> {
  const url = process.env.NMD_IMAGE_URL;
  if (!url) throw new Error("NMD_IMAGE_URL not configured");
  return openAICompatibleImages(req, url, {
    key: process.env.NMD_IMAGE_KEY,
    model: process.env.NMD_IMAGE_MODEL || "stablediffusion",
  });
}

/** Zero-cost demo: a clean branded SVG poster with the prompt text. */
async function demoImages(req: ImageRequest): Promise<{ dataUri: string; model?: string }> {
  const brand = req.brand?.brandName || "Nirva";
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0e3b2e"/><stop offset="1" stop-color="#134e4a"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="430" r="150" fill="none" stroke="#34d399" stroke-width="6" opacity="0.7"/>
  <circle cx="512" cy="430" r="100" fill="#065f46" opacity="0.6"/>
  <text x="512" y="445" font-family="sans-serif" font-size="52" fill="#d1fae5" text-anchor="middle">${escape(brand)}</text>
  <text x="512" y="700" font-family="sans-serif" font-size="30" fill="#a7f3d0" text-anchor="middle">${escape(req.prompt)}</text>
  <text x="512" y="960" font-family="sans-serif" font-size="20" fill="#6ee7b7" opacity="0.7" text-anchor="middle">[demo image — ต่อ provider จริงด้วย NMD_IMAGE_URL หรือ OPENAI_API_KEY]</text>
</svg>`;
  return { dataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, model: "demo-svg" };
}

let activeImageProvider: { name: string; fn: ImageProvider } | null = null;

function resolveImageProvider(): { name: string; fn: ImageProvider } {
  if (activeImageProvider) return activeImageProvider;
  if (process.env.NMD_DEMO_CONNECTORS === "1" || process.env.NMD_DEMO_CONNECTORS === "true") {
    return { name: "demo", fn: demoImages };
  }
  if (process.env.NMD_IMAGE_URL) return { name: "local-images", fn: localImages };
  return { name: "openai-images", fn: openaiImages };
}

export function setImageProvider(name: string, fn: ImageProvider) {
  activeImageProvider = { name, fn };
}

export interface MediaAsset {
  id: string;
  contentId: string | null;
  prompt: string;
  dataUri: string;
  provider: string;
  createdAt: string;
}

let schemaReady = false;

function ensureAssetSchema() {
  const db = ensureMediaSchema();
  if (schemaReady) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS nmd_assets (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      prompt TEXT NOT NULL DEFAULT '',
      data_uri TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      organization_id TEXT NOT NULL DEFAULT 'tenant_nirva_default',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system'
    );
    CREATE INDEX IF NOT EXISTS idx_nmd_assets_content ON nmd_assets(content_id);
  `);
  schemaReady = true;
  return db;
}

interface AssetRow {
  id: string;
  content_id: string | null;
  prompt: string;
  data_uri: string;
  provider: string;
  created_at: string;
}

function rowToAsset(row: AssetRow): MediaAsset {
  return {
    id: row.id,
    contentId: row.content_id,
    prompt: row.prompt,
    dataUri: row.data_uri,
    provider: row.provider,
    createdAt: row.created_at,
  };
}

export interface ImageResult {
  asset: MediaAsset | null;
  provider: string;
  error?: string;
}

/** Generate an image with brand context and attach it to content. */
export async function generateImage(
  req: { prompt: string; contentId?: string; organizationId?: string; size?: string },
  actor = "system"
): Promise<ImageResult> {
  const db = ensureAssetSchema();
  const provider = resolveImageProvider();
  const organizationId = req.organizationId ?? "tenant_nirva_default";
  if (!req.prompt.trim()) return { asset: null, provider: provider.name, error: "prompt is required" };
  if (req.contentId && !getContent(req.contentId)) {
    return { asset: null, provider: provider.name, error: "Content not found" };
  }

  const brand = getBrandBrief(organizationId);
  const styled = brand
    ? `${req.prompt}\n\nBrand: ${brand.brandName}. ${brand.product}. Tone: ${brand.tone}.`
    : req.prompt;

  let generated: { dataUri: string; model?: string };
  try {
    generated = await provider.fn({ prompt: styled, brand, size: req.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { asset: null, provider: provider.name, error: `Image provider unavailable: ${message}` };
  }
  if (generated.dataUri.length > MAX_DATA_URI_BYTES) {
    return { asset: null, provider: provider.name, error: "Generated image exceeds 8 MB limit" };
  }

  const id = `ast_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
  db.prepare(`
    INSERT INTO nmd_assets (id, content_id, prompt, data_uri, provider, organization_id, created_by)
    VALUES (@id, @content_id, @prompt, @data_uri, @provider, @org, @actor)
  `).run({
    id,
    content_id: req.contentId ?? null,
    prompt: req.prompt,
    data_uri: generated.dataUri,
    provider: generated.model ? `${provider.name}:${generated.model}` : provider.name,
    org: organizationId,
    actor,
  });
  appendAuditLog({ action: "media.image.generate", actor, resource: `asset:${id}`, detail: req.prompt.slice(0, 80) });
  const row = db.prepare("SELECT * FROM nmd_assets WHERE id = ?").get(id) as AssetRow;
  return { asset: rowToAsset(row), provider: provider.name };
}

export function listAssets(contentId?: string): MediaAsset[] {
  const db = ensureAssetSchema();
  const rows = (
    contentId
      ? db.prepare("SELECT * FROM nmd_assets WHERE content_id = ? ORDER BY created_at DESC LIMIT 20").all(contentId)
      : db.prepare("SELECT * FROM nmd_assets ORDER BY created_at DESC LIMIT 20").all()
  ) as AssetRow[];
  return rows.map(rowToAsset);
}
