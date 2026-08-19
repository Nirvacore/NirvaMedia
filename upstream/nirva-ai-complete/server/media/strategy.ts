/**
 * NMD Strategy skill — the "strategy department": takes a short campaign
 * goal, reads the brand brief (two-layer brain), produces a Big Idea +
 * insight, and breaks it into a content plan that lands in the pipeline
 * as drafts ready for review.
 *
 * Provider rules match the rest of NMD: swappable, default Ollama,
 * NMD_DEMO_CONNECTORS=1 enables a deterministic zero-cost demo strategist.
 */

import { brandContextPrompt, createContent, getBrandBrief, type WriterRequest } from "./index.ts";
import { appendAuditLog } from "../db/index.ts";
import type { BrandBrief, ContentItem, ContentType } from "../../shared/media.ts";

export interface CampaignPost {
  title: string;
  hook: string;
  caption: string;
  contentType: ContentType;
}

export interface CampaignPlan {
  campaignName: string;
  bigIdea: string;
  insight: string;
  posts: CampaignPost[];
}

export interface StrategyRequest {
  goal: string;
  lang: string;
  brand: BrandBrief | null;
  postCount: number;
}

export type StrategistProvider = (req: StrategyRequest) => Promise<CampaignPlan>;

const DEFAULT_OLLAMA_URL = process.env.VITE_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_STRATEGY_MODEL = process.env.NMD_STRATEGY_MODEL || "llama3.1:8b";

async function ollamaStrategist(req: StrategyRequest): Promise<CampaignPlan> {
  const brandBlock = req.brand ? `\n\n${brandContextPrompt(req.brand)}` : "";
  const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_STRATEGY_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            `You are a senior advertising strategist. Research the audience in your head, find a sharp insight, and produce a campaign in language "${req.lang}".${brandBlock}\n\n` +
            `Reply as JSON only: {"campaignName": "...", "bigIdea": "...", "insight": "...", "posts": [{"title": "...", "hook": "...", "caption": "...", "contentType": "post"}]} ` +
            `with exactly ${req.postCount} posts. contentType is one of: post, article, caption, script.`,
        },
        { role: "user", content: req.goal },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = (await response.json()) as { message?: { content?: string } };
  const raw = data.message?.content?.trim() ?? "";
  const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, "")) as CampaignPlan;
  if (!parsed.campaignName || !Array.isArray(parsed.posts) || parsed.posts.length === 0) {
    throw new Error("Strategist returned an incomplete plan");
  }
  return parsed;
}

/** Deterministic zero-cost strategist for demos/tests (NMD_DEMO_CONNECTORS=1). */
async function demoStrategist(req: StrategyRequest): Promise<CampaignPlan> {
  const brand = req.brand?.brandName || "แบรนด์";
  const audience = req.brand?.audience || "กลุ่มเป้าหมาย";
  return {
    campaignName: `[demo] แคมเปญ: ${req.goal.slice(0, 40)}`,
    bigIdea: `${brand} ไม่ได้ขายสินค้า แต่ขายช่วงเวลาพักของ${audience}`,
    insight: `${audience} ไม่ได้ต้องการของใหม่ — ต้องการเหตุผลใหม่ในการดูแลตัวเอง`,
    posts: Array.from({ length: req.postCount }, (_, i) => ({
      title: `${brand} · โพสต์ ${i + 1}: ${req.goal.slice(0, 30)}`,
      hook: `HOOK ${i + 1}: คำถามที่${audience}ถามตัวเองทุกเช้า`,
      caption: `(demo caption ${i + 1}) เล่าเรื่องตามโทน ${req.brand?.tone || "ธรรมชาติ"} — สร้างจริงเมื่อเชื่อม LLM provider`,
      contentType: "post" as ContentType,
    })),
  };
}

let activeStrategist: { name: string; fn: StrategistProvider } | null = null;

function resolveStrategist(): { name: string; fn: StrategistProvider } {
  if (activeStrategist) return activeStrategist;
  if (process.env.NMD_DEMO_CONNECTORS === "1" || process.env.NMD_DEMO_CONNECTORS === "true") {
    return { name: "demo", fn: demoStrategist };
  }
  return { name: "ollama", fn: ollamaStrategist };
}

export function setStrategistProvider(name: string, fn: StrategistProvider) {
  activeStrategist = { name, fn };
}

export interface CampaignResult {
  plan: CampaignPlan | null;
  provider: string;
  items: ContentItem[];
  error?: string;
}

/**
 * Strategy → pipeline: generate the plan, then create one draft per post
 * (tagged with the campaign name) so the founder reviews and schedules
 * from Content Studio as usual. Provider failures never throw.
 */
export async function generateCampaign(
  req: { goal: string; lang: string; organizationId?: string; postCount?: number },
  actor = "system"
): Promise<CampaignResult> {
  const provider = resolveStrategist();
  const organizationId = req.organizationId ?? "tenant_nirva_default";
  const brand = getBrandBrief(organizationId);
  const postCount = Math.min(Math.max(req.postCount ?? 8, 1), 20);

  let plan: CampaignPlan;
  try {
    plan = await provider.fn({ goal: req.goal, lang: req.lang, brand, postCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { plan: null, provider: provider.name, items: [], error: `Strategist unavailable: ${message}` };
  }

  // LLM output is untrusted: sanitize every post BEFORE any draft is
  // created, so a malformed plan can never 500 mid-loop with partial drafts.
  const VALID_TYPES = new Set(["post", "article", "caption", "script", "email", "ad"]);
  const validPosts = (Array.isArray(plan.posts) ? plan.posts : [])
    .map((post) => ({
      title: typeof post?.title === "string" ? post.title.trim() : "",
      hook: typeof post?.hook === "string" ? post.hook.trim() : "",
      caption: typeof post?.caption === "string" ? post.caption.trim() : "",
      contentType: (VALID_TYPES.has(post?.contentType as string) ? post.contentType : "post") as ContentType,
    }))
    .filter((post) => post.title && (post.hook || post.caption));
  if (validPosts.length === 0) {
    return { plan: null, provider: provider.name, items: [], error: "Strategist returned no valid posts" };
  }

  const items = validPosts.map((post) =>
    createContent({
      title: post.title,
      body: [post.hook, post.caption].filter(Boolean).join("\n\n"),
      contentType: post.contentType as WriterRequest["contentType"],
      sourceLang: req.lang,
      tags: ["campaign", plan.campaignName],
      organizationId,
      actor,
    })
  );

  appendAuditLog({
    action: "media.campaign.generate",
    actor,
    resource: `org:${organizationId}`,
    detail: `${plan.campaignName} — ${items.length} drafts`,
  });
  return { plan, provider: provider.name, items };
}
