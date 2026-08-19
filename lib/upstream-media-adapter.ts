import {
  adaptTextForPlatform,
  canTransition,
  getPlatform,
  type ContentStatus,
} from "../upstream/nirva-ai/shared/media";

const upstreamPlatformIds: Record<string, string> = {
  Facebook: "facebook",
  Instagram: "instagram",
  Threads: "threads",
  X: "x",
  LinkedIn: "linkedin",
  TikTok: "tiktok",
  YouTube: "youtube",
  Pinterest: "pinterest",
  "LINE OA": "line",
  Telegram: "telegram",
  "WhatsApp Business": "whatsapp",
};

export type UpstreamAdaptation = {
  body: string;
  truncated: boolean;
  source: "claude-upstream" | "codex-extension";
  upstreamPlatformId: string | null;
  maxLength: number | null;
  supportsHashtags: boolean | null;
};

/**
 * Reuses Claude's deterministic platform rules when that source registry owns
 * the channel. New regional channels remain explicit Codex extensions instead
 * of pretending they were present in the original implementation.
 */
export function adaptActiveChannelText(text: string, channel: string): UpstreamAdaptation {
  const upstreamPlatformId = upstreamPlatformIds[channel] ?? null;
  if (!upstreamPlatformId) {
    return {
      body: text.trim(),
      truncated: false,
      source: "codex-extension",
      upstreamPlatformId: null,
      maxLength: null,
      supportsHashtags: null,
    };
  }

  const platform = getPlatform(upstreamPlatformId)!;
  const adapted = adaptTextForPlatform(text, upstreamPlatformId);
  return {
    ...adapted,
    source: "claude-upstream",
    upstreamPlatformId,
    maxLength: platform.maxLength,
    supportsHashtags: platform.supportsHashtags,
  };
}

export function canMoveContentStatus(from: string, to: string) {
  return canTransition(from as ContentStatus, to as ContentStatus);
}

export const CLAUDE_MEDIA_SOURCE = {
  repository: "https://github.com/Nirvacore/nirva-AI",
  branch: "claude/nirva-media-nle-vision-h0v1z0",
  commit: "12b703434d724b1aff04675602d52356ee9c2198",
  module: "shared/media.ts",
} as const;
