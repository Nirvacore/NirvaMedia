/**
 * Optional live bridge to the Nirva AI Core backend (NLE Language Engine).
 * Every call degrades gracefully to null so the prototype keeps working
 * on mock data when the backend isn't running. Proxied via /nirva-api
 * (see next.config.ts) so there are no CORS concerns.
 */

export interface LiveDetection {
  language: string | null;
  script: string | null;
  confidence: number;
  languageInfo: { name: string; nativeName: string; rtl: boolean } | null;
}

export interface NleStatus {
  entries: number;
  cacheHits: number;
  provider: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`/nirva-api${path}`, {
      ...init,
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** null = backend offline → caller falls back to mock behaviour */
export function detectLanguageLive(text: string): Promise<LiveDetection | null> {
  return request<LiveDetection>("/v1/language/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export function getNleStatus(): Promise<NleStatus | null> {
  return request<NleStatus>("/v1/language/stats");
}

export interface CreatedContent {
  id: string;
  title: string;
  contentStatus: string;
}

export interface LiveTranscript {
  text: string;
  provider: string;
}

/**
 * Real speech-to-text through NLE (raw audio bytes → transcript).
 * null = backend offline / no STT provider → caller uses the mock transcript.
 */
export async function transcribeAudioLive(blob: Blob, lang?: string): Promise<LiveTranscript | null> {
  if (!(await ensureSession())) return null;
  try {
    const response = await fetch(`/nirva-api/v1/language/transcribe${lang ? `?lang=${lang}` : ""}`, {
      method: "POST",
      headers: { "Content-Type": blob.type || "audio/webm" },
      body: blob,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text: string | null; provider: string };
    return data.text ? { text: data.text, provider: data.provider } : null;
  } catch {
    return null;
  }
}

/** Demo session for the prototype — cookies flow through the rewrite. */
async function ensureSession(): Promise<boolean> {
  const me = await request<{ authenticated: boolean }>("/auth/me");
  if (me?.authenticated) return true;
  const login = await request<{ user?: unknown }>("/auth/demo-login", { method: "POST" });
  return login !== null;
}

export interface LiveContentItem {
  id: string;
  title: string;
  body: string;
  contentType: string;
  sourceLang: string;
  contentStatus: string;
  tags: string[];
  scheduledAt: string | null;
  updatedAt: string;
}

/**
 * Real NMD pipeline items, newest first.
 * null = backend offline → Content Studio stays on mock data.
 */
export async function getMediaContent(): Promise<LiveContentItem[] | null> {
  if (!(await ensureSession())) return null;
  const result = await request<{ content: LiveContentItem[] }>("/v1/media/content");
  return result?.content ?? null;
}

export interface LiveRouting {
  intent: string;
  intentLabelTh: string;
  confidence: number;
  agents: string[];
  description: string;
}

/**
 * Ask the real Nirva Core router (DESK) which agents would handle this
 * message — keyword-based, works without any LLM. null = backend offline.
 */
export async function analyzeMessageLive(message: string): Promise<LiveRouting | null> {
  const result = await request<LiveRouting>("/router/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return result?.agents ? result : null;
}

export interface MediaAssetLive {
  id: string;
  contentId: string | null;
  prompt: string;
  dataUri: string;
  provider: string;
}

/** AI Image (NMD-1200): generate an ad image, optionally attached to content. */
export async function generateImageLive(
  prompt: string,
  contentId?: string
): Promise<{ asset: MediaAssetLive | null; provider: string; error?: string } | null> {
  if (!(await ensureSession())) return null;
  try {
    const response = await fetch("/nirva-api/v1/media/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, contentId }),
      signal: AbortSignal.timeout(180_000),
    });
    return (await response.json()) as { asset: MediaAssetLive | null; provider: string; error?: string };
  } catch {
    return null;
  }
}

export async function getAssetsLive(contentId: string): Promise<MediaAssetLive[] | null> {
  if (!(await ensureSession())) return null;
  const result = await request<{ assets: MediaAssetLive[] }>(`/v1/media/assets?contentId=${encodeURIComponent(contentId)}`);
  return result?.assets ?? null;
}

export interface CampaignPlanLive {
  campaignName: string;
  bigIdea: string;
  insight: string;
}

/** Strategy skill: goal -> Big Idea -> drafts in the pipeline. */
export async function generateCampaignLive(
  goal: string,
  postCount = 8
): Promise<{ plan: CampaignPlanLive | null; itemCount: number; provider: string; error?: string } | null> {
  if (!(await ensureSession())) return null;
  try {
    const response = await fetch("/nirva-api/v1/media/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, lang: "th", postCount }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await response.json()) as {
      plan: CampaignPlanLive | null;
      items?: unknown[];
      provider: string;
      error?: string;
    };
    return { plan: data.plan, itemCount: data.items?.length ?? 0, provider: data.provider, error: data.error };
  } catch {
    return null;
  }
}

export interface PerformanceStatsLive {
  entries: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  engagementRate: number;
  best: { title: string; platform: string; rate: number } | null;
  worst: { title: string; platform: string; rate: number } | null;
}

export interface PerformanceInsightsLive {
  summary: string;
  working: string[];
  notWorking: string[];
  recommendations: string[];
}

export async function recordMetricsLive(data: {
  contentId?: string;
  platform: string;
  reach: number;
  engagement: number;
  clicks?: number;
}): Promise<boolean> {
  if (!(await ensureSession())) return false;
  const result = await request("/v1/media/metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result !== null;
}

export async function analyzePerformanceLive(): Promise<{
  stats: PerformanceStatsLive;
  insights: PerformanceInsightsLive | null;
  provider: string;
  error?: string;
} | null> {
  if (!(await ensureSession())) return null;
  try {
    const response = await fetch("/nirva-api/v1/media/analyze", {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
    });
    return (await response.json()) as {
      stats: PerformanceStatsLive;
      insights: PerformanceInsightsLive | null;
      provider: string;
      error?: string;
    };
  } catch {
    return null;
  }
}

export interface BrandBriefLive {
  organizationId: string;
  brandName: string;
  product: string;
  audience: string;
  tone: string;
  competitors: string;
  bannedWords: string[];
  notes: string;
}

/** The per-brand brain layer — read by every AI Writer call. */
export async function getBrandBriefLive(): Promise<BrandBriefLive | null | "offline"> {
  if (!(await ensureSession())) return "offline";
  const result = await request<{ brief: BrandBriefLive | null }>("/v1/media/brief");
  return result === null ? "offline" : result.brief;
}

export async function saveBrandBriefLive(brief: Omit<BrandBriefLive, "organizationId">): Promise<boolean> {
  if (!(await ensureSession())) return false;
  const result = await request("/v1/media/brief", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
  return result !== null;
}

/** Platforms that have a publish connector configured on the backend. */
export async function getConnectedPlatforms(): Promise<string[] | null> {
  if (!(await ensureSession())) return null;
  const result = await request<{ connected: string[] }>("/v1/media/connectors");
  return result?.connected ?? null;
}

export interface PublishRecordLive {
  platform: string;
  lang: string;
  publishStatus: "published" | "failed";
  externalId: string | null;
  error: string | null;
}

/**
 * Schedule a live content item: approve if needed, build variants for the
 * chosen platforms, then transition to scheduled with the given time.
 * The explicit scheduler (POST /v1/media/publish-due, driven by cron/n8n)
 * publishes it when the time arrives. null = backend offline.
 */
export async function scheduleContentLive(
  contentId: string,
  contentStatus: string,
  platforms: string[],
  scheduledAt: string
): Promise<boolean> {
  if (!(await ensureSession())) return false;
  const transition = (to: string, extra?: Record<string, unknown>) =>
    request(`/v1/media/content/${contentId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, ...extra }),
    });
  if (contentStatus === "draft") {
    await transition("review");
    await transition("approved");
  } else if (contentStatus === "review") {
    await transition("approved");
  }
  const built = await request(`/v1/media/content/${contentId}/variants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platforms, langs: [] }),
  });
  if (built === null) return false;
  // Send the chosen platforms so the scheduler publishes only these,
  // not every variant ever built for this content.
  const scheduled = await transition("scheduled", { scheduledAt, platforms });
  return scheduled !== null;
}

/**
 * Full publish flow for a live content item: approve if still draft,
 * build platform variants, then publish. The click IS the human review
 * step required by the pipeline. null = backend offline.
 */
export async function publishContentLive(
  contentId: string,
  contentStatus: string,
  platforms: string[]
): Promise<{ records: PublishRecordLive[]; failures: number; skipped: string[] } | null> {
  if (!(await ensureSession())) return null;

  const transition = (to: string) =>
    request(`/v1/media/content/${contentId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
  if (contentStatus === "draft") {
    await transition("review");
    await transition("approved");
  } else if (contentStatus === "review") {
    await transition("approved");
  }

  const built = await request(`/v1/media/content/${contentId}/variants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platforms, langs: [] }),
  });
  if (built === null) return null;

  return request<{ records: PublishRecordLive[]; failures: number; skipped: string[] }>(
    `/v1/media/content/${contentId}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platforms }),
    }
  );
}

/**
 * Save a capture as a real draft in NMD Content Studio.
 * null = backend offline or auth unavailable → caller stays in mock mode.
 */
export async function createDraftContent(data: {
  title: string;
  body: string;
  contentType?: string;
  sourceLang?: string;
  tags?: string[];
}): Promise<CreatedContent | null> {
  if (!(await ensureSession())) return null;
  const result = await request<{ content: CreatedContent }>("/v1/media/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return result?.content ?? null;
}
