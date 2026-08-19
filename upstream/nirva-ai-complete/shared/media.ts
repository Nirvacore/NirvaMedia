/**
 * NMD Nirva Media — shared types, platform registry, and content pipeline
 * rules (Phase 4 core, pulled forward per the vision's create-once
 * publish-everywhere workflow). Design: docs/NMD_MEDIA_ARCHITECTURE.md
 */

export type ContentStatus = "draft" | "review" | "approved" | "scheduled" | "published" | "archived";

export type ContentType = "post" | "article" | "caption" | "script" | "email" | "ad";

/** Valid status transitions — the pipeline moves forward only, with
 * archive allowed from anywhere, rework allowed from review, and
 * scheduled → scheduled allowed so a post can be re-timed. */
export const STATUS_FLOW: Record<ContentStatus, ContentStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["scheduled", "published", "archived"],
  scheduled: ["published", "approved", "scheduled", "archived"],
  published: ["archived"],
  archived: [],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false;
}

export interface PlatformInfo {
  id: string;
  name: string;
  /** Max characters for the primary text; 0 = no practical limit */
  maxLength: number;
  supportsHashtags: boolean;
  category: "social" | "messaging" | "owned" | "commerce";
}

/** The 18 platforms from the Nirva Media vision. Connectors are added
 * per-platform later; the registry drives content adaptation now. */
export const PLATFORMS: PlatformInfo[] = [
  { id: "facebook", name: "Facebook", maxLength: 63206, supportsHashtags: true, category: "social" },
  { id: "instagram", name: "Instagram", maxLength: 2200, supportsHashtags: true, category: "social" },
  { id: "threads", name: "Threads", maxLength: 500, supportsHashtags: true, category: "social" },
  { id: "x", name: "X", maxLength: 280, supportsHashtags: true, category: "social" },
  { id: "linkedin", name: "LinkedIn", maxLength: 3000, supportsHashtags: true, category: "social" },
  { id: "tiktok", name: "TikTok", maxLength: 2200, supportsHashtags: true, category: "social" },
  { id: "youtube", name: "YouTube", maxLength: 5000, supportsHashtags: true, category: "social" },
  { id: "pinterest", name: "Pinterest", maxLength: 500, supportsHashtags: true, category: "social" },
  { id: "line", name: "LINE OA", maxLength: 5000, supportsHashtags: false, category: "messaging" },
  { id: "telegram", name: "Telegram", maxLength: 4096, supportsHashtags: true, category: "messaging" },
  { id: "discord", name: "Discord", maxLength: 2000, supportsHashtags: true, category: "messaging" },
  { id: "whatsapp", name: "WhatsApp Business", maxLength: 65536, supportsHashtags: false, category: "messaging" },
  { id: "website", name: "Website", maxLength: 0, supportsHashtags: false, category: "owned" },
  { id: "blog", name: "Blog", maxLength: 0, supportsHashtags: true, category: "owned" },
  { id: "email", name: "Email", maxLength: 0, supportsHashtags: false, category: "owned" },
  { id: "podcast", name: "Podcast", maxLength: 4000, supportsHashtags: false, category: "owned" },
  { id: "rss", name: "RSS", maxLength: 0, supportsHashtags: false, category: "owned" },
  { id: "marketplace", name: "Marketplace", maxLength: 5000, supportsHashtags: false, category: "commerce" },
];

const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: string): PlatformInfo | null {
  return PLATFORM_BY_ID.get(id.toLowerCase()) ?? null;
}

/**
 * Brand Brief — the per-client "brain layer": who the brand is, who it
 * talks to, how it sounds, and what it must never say. Every AI Writer
 * call reads this so output stays on-brand without repeating context.
 */
export interface BrandBrief {
  organizationId: string;
  brandName: string;
  product: string;
  audience: string;
  tone: string;
  competitors: string;
  bannedWords: string[];
  notes: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  contentType: ContentType;
  sourceLang: string;
  contentStatus: ContentStatus;
  tags: string[];
  scheduledAt: string | null;
  /** Platforms chosen for the schedule; null = publish all built variants */
  scheduledPlatforms: string[] | null;
  organizationId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVariant {
  id: string;
  contentId: string;
  platform: string;
  lang: string;
  body: string;
  truncated: boolean;
  translationProvider: string | null;
  createdAt: string;
}

/**
 * Deterministic platform adaptation: fit the text to the platform's
 * limit at a word boundary with an ellipsis, and strip hashtags where
 * the platform doesn't use them. AI-assisted rewriting can replace
 * this later without changing callers.
 */
export function adaptTextForPlatform(text: string, platformId: string): { body: string; truncated: boolean } {
  const platform = getPlatform(platformId);
  if (!platform) throw new Error(`Unknown platform "${platformId}"`);

  let body = text.trim();
  if (!platform.supportsHashtags) {
    body = body.replace(/(^|\s)#[^\s#]+/g, "$1").replace(/[ \t]+/g, " ").trim();
  }
  if (platform.maxLength > 0 && body.length > platform.maxLength) {
    const slice = body.slice(0, platform.maxLength - 1);
    const lastSpace = slice.lastIndexOf(" ");
    body = `${slice.slice(0, lastSpace > platform.maxLength * 0.5 ? lastSpace : slice.length).trimEnd()}…`;
    return { body, truncated: true };
  }
  return { body, truncated: false };
}
