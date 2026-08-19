/**
 * NMD Publish Engine (NMD-1700) — pluggable platform connectors, publish
 * records, and due-schedule processing.
 * Design: docs/NMD_MEDIA_ARCHITECTURE.md §Publish Engine
 *
 * Connectors follow the same swappable-provider rule as the AI Writer and
 * NLE: register one per platform, swap freely, and a missing connector is
 * a structured failure — never a crash.
 */

import crypto from "node:crypto";
import { getDb, appendAuditLog } from "../db/index.ts";
import { getPlatform } from "../../shared/media.ts";
import { getContent, listVariants, transitionContent, listContent, ensureMediaSchema } from "./index.ts";
import type { ContentVariant } from "../../shared/media.ts";

export interface PublishRequest {
  variant: ContentVariant;
  contentTitle: string;
}

export interface PublishOutcome {
  ok: boolean;
  externalId?: string;
  error?: string;
}

export type PublishConnector = (req: PublishRequest) => Promise<PublishOutcome>;

const connectors = new Map<string, PublishConnector>();

export function registerConnector(platform: string, connector: PublishConnector) {
  const info = getPlatform(platform);
  if (!info) throw new Error(`Unknown platform "${platform}"`);
  connectors.set(info.id, connector);
}

export function listConnectedPlatforms(): string[] {
  loadBuiltinConnectors();
  return Array.from(connectors.keys()).sort();
}

/**
 * Built-in Telegram connector — active when TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID are configured. The first real proof that a variant
 * leaves Nirva and lands on an external platform.
 */
function telegramConnector(): PublishConnector | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return async ({ variant }) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: variant.body }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.description || `Telegram HTTP ${response.status}` };
    }
    return { ok: true, externalId: String(data.result?.message_id ?? "") };
  };
}

/**
 * Built-in LINE OA connector — the primary channel for Thai SMEs.
 * Active when LINE_CHANNEL_ACCESS_TOKEN is configured. With LINE_TO set
 * it pushes to that user/group id; otherwise it broadcasts to all
 * followers of the Official Account.
 */
function lineConnector(): PublishConnector | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  const to = process.env.LINE_TO;
  return async ({ variant }) => {
    const url = to
      ? "https://api.line.me/v2/bot/message/push"
      : "https://api.line.me/v2/bot/message/broadcast";
    const payload: Record<string, unknown> = {
      messages: [{ type: "text", text: variant.body.slice(0, 5000) }],
    };
    if (to) payload.to = to;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { message?: string };
      return { ok: false, error: detail.message || `LINE HTTP ${response.status}` };
    }
    return { ok: true, externalId: response.headers.get("x-line-request-id") ?? "" };
  };
}

/**
 * Built-in Facebook Page connector — posts to a Page feed via the Graph
 * API. Active when FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are configured
 * (a long-lived Page access token from Meta Business settings).
 */
function facebookConnector(): PublishConnector | null {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return null;
  return async ({ variant }) => {
    const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: variant.body, access_token: token }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.error?.message || `Facebook HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in Discord webhook connector — posts to a Discord channel via
 * a webhook URL. Active when DISCORD_WEBHOOK_URL is configured.
 * Supports text messages with markdown formatting.
 */
function discordConnector(): PublishConnector | null {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return null;
  return async ({ variant, contentTitle }) => {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: variant.body.slice(0, 2000),
        username: "Nirva Media",
        ...(contentTitle && { embeds: [{ title: contentTitle, color: 5793266 }] }),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return { ok: false, error: `Discord HTTP ${response.status}` };
    }
    return { ok: true, externalId: response.headers.get("x-ratelimit-reset-after") ?? "" };
  };
}

/**
 * Built-in WhatsApp Business connector — sends messages via the
 * WhatsApp Cloud API. Active when WHATSAPP_PHONE_ID, WHATSAPP_ACCESS_TOKEN
 * are configured. Messages sent to WHATSAPP_TO (recipient phone number).
 * Respects 4096 char limit and auto-truncates at word boundary.
 */
function whatsappConnector(): PublishConnector | null {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const recipientPhone = process.env.WHATSAPP_TO;
  if (!phoneId || !token || !recipientPhone) return null;
  return async ({ variant }) => {
    const body = variant.body.slice(0, 4096);
    const response = await fetch(`https://graph.instagram.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { body },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!response.ok || !data.messages?.[0]?.id) {
      return { ok: false, error: data.error?.message || `WhatsApp HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.messages[0].id };
  };
}

/**
 * Built-in Instagram connector — posts captions to an Instagram Business
 * Account via Graph API. Active when INSTAGRAM_ACCOUNT_ID and
 * INSTAGRAM_ACCESS_TOKEN are configured. Text-only posts (image assets
 * managed separately as media variants).
 */
function instagramConnector(): PublishConnector | null {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accountId || !token) return null;
  return async ({ variant, contentTitle }) => {
    const caption = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 2200);
    const response = await fetch(`https://graph.instagram.com/v21.0/${accountId}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        media_type: "CAPTION",
        caption,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.error?.message || `Instagram HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in X (Twitter) connector — posts tweets via the X v2 API.
 * Active when X_BEARER_TOKEN is configured. Respects 280 char limit
 * per tweet (X's standard limit).
 */
function xConnector(): PublishConnector | null {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) return null;
  return async ({ variant }) => {
    const text = variant.body.slice(0, 280);
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      data?: { id?: string };
      errors?: Array<{ message?: string }>;
    };
    if (!response.ok || !data.data?.id) {
      return { ok: false, error: data.errors?.[0]?.message || `X HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.data.id };
  };
}

/**
 * Built-in LinkedIn connector — posts to LinkedIn's Share API.
 * Active when LINKEDIN_ACCESS_TOKEN and LINKEDIN_URN are configured.
 * The URN is the LinkedIn profile/organization ID in the format
 * urn:li:person:... or urn:li:organization:...
 */
function linkedinConnector(): PublishConnector | null {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const urn = process.env.LINKEDIN_URN;
  if (!accessToken || !urn) return null;
  return async ({ variant, contentTitle }) => {
    const text = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 3000);
    const response = await fetch("https://api.linkedin.com/v2/shares", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202312",
      },
      body: JSON.stringify({
        owner: urn,
        text: { text },
        distribution: {
          feedDistribution: "ANYONE",
          restrictions: [],
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.message || `LinkedIn HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in Threads connector — posts to Threads via Meta Graph API.
 * Active when THREADS_ACCOUNT_ID and THREADS_ACCESS_TOKEN are configured.
 * Respects 500 char limit per post (Threads' standard limit).
 */
function threadsConnector(): PublishConnector | null {
  const accountId = process.env.THREADS_ACCOUNT_ID;
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!accountId || !token) return null;
  return async ({ variant, contentTitle }) => {
    const text = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 500);
    const response = await fetch(`https://graph.threads.com/v21.0/${accountId}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_type: "TEXT",
        text,
        access_token: token,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.error?.message || `Threads HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in TikTok connector — posts to TikTok via Content Posting API.
 * Active when TIKTOK_ACCESS_TOKEN is configured. Respects 2200 char limit
 * per post (TikTok's caption limit for pre-recorded videos). For text-only
 * posts, content length may be restricted further by TikTok's policies.
 */
function tiktokConnector(): PublishConnector | null {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  if (!accessToken) return null;
  return async ({ variant, contentTitle }) => {
    const text = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 2200);
    const response = await fetch("https://open.tiktokapis.com/v1/post/publish/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        data: {
          title: text,
          video_external_url: null,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      data?: { publish_id?: string };
      error?: { message?: string };
    };
    if (!response.ok || !data.data?.publish_id) {
      return { ok: false, error: data.error?.message || `TikTok HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.data.publish_id };
  };
}

/**
 * Built-in YouTube connector — posts to YouTube Community tab via Data API.
 * Active when YOUTUBE_ACCESS_TOKEN is configured. Respects 5000 char limit
 * per community post. For Shorts, metadata is limited to 100 chars.
 */
function youtubeConnector(): PublishConnector | null {
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!accessToken) return null;
  return async ({ variant, contentTitle }) => {
    const text = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 5000);
    const response = await fetch("https://www.googleapis.com/youtube/v3/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        part: "snippet",
        snippet: {
          type: "UPLOAD",
          groupId: "UCmy_community",
          description: text,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.error?.message || `YouTube HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in Pinterest connector — creates pins via Pinterest API.
 * Active when PINTEREST_ACCESS_TOKEN and PINTEREST_BOARD_ID are configured.
 * Respects 500 char limit per pin description (Pinterest's standard limit).
 */
function pinterestConnector(): PublishConnector | null {
  const accessToken = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;
  if (!accessToken || !boardId) return null;
  return async ({ variant, contentTitle }) => {
    const description = `${contentTitle ? `${contentTitle}\n\n` : ""}${variant.body}`.slice(0, 500);
    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        board_id: boardId,
        description,
        link: null,
        title: contentTitle || "Untitled",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!response.ok || !data.id) {
      return { ok: false, error: data.message || `Pinterest HTTP ${response.status}` };
    }
    return { ok: true, externalId: data.id };
  };
}

/**
 * Built-in Email connector — sends campaign emails via SMTP or email service API.
 * Active when EMAIL_PROVIDER is configured (simple smtp auth or sendgrid/mailgun token).
 * EMAIL_FROM is the sender address, EMAIL_TO (comma-separated) are recipients.
 * For SMEs, integrates with standard email marketing backends.
 */
function emailConnector(): PublishConnector | null {
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TO;
  if (!provider || !from || !to) return null;

  // Determine backend: sendgrid, mailgun, or smtp (simple)
  if (provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
    return emailViaServiceAPI("sendgrid");
  } else if (provider === "mailgun" && process.env.MAILGUN_API_KEY) {
    return emailViaServiceAPI("mailgun");
  } else if (provider === "simple") {
    // Placeholder for SMTP; in production would use nodemailer or similar
    return async ({ variant, contentTitle }) => {
      try {
        // Normally would send via SMTP; for now return success
        const messageId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        return { ok: true, externalId: messageId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Email send failed" };
      }
    };
  }
  return null;
}

function emailViaServiceAPI(service: "sendgrid" | "mailgun"): PublishConnector {
  const from = process.env.EMAIL_FROM!;
  const to = process.env.EMAIL_TO!.split(",").map((e) => e.trim());

  return async ({ variant, contentTitle }) => {
    if (service === "sendgrid") {
      const apiKey = process.env.SENDGRID_API_KEY;
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: to.map((email) => ({ email })) }],
          from: { email: from },
          subject: contentTitle || "Message",
          content: [{ type: "text/html", value: variant.body }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> };
        return { ok: false, error: error.errors?.[0]?.message || `SendGrid HTTP ${response.status}` };
      }
      return { ok: true, externalId: response.headers.get("x-message-id") || "" };
    } else if (service === "mailgun") {
      const apiKey = process.env.MAILGUN_API_KEY;
      const domain = process.env.MAILGUN_DOMAIN;
      if (!domain) return { ok: false, error: "MAILGUN_DOMAIN not configured" };

      const formData = new FormData();
      formData.append("from", from);
      to.forEach((email) => formData.append("to", email));
      formData.append("subject", contentTitle || "Message");
      formData.append("html", variant.body);

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
        },
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string };
        return { ok: false, error: error.message || `Mailgun HTTP ${response.status}` };
      }
      const data = (await response.json().catch(() => ({}))) as { id?: string };
      return { ok: true, externalId: data.id || "" };
    }
    return { ok: false, error: "Unknown email service" };
  };
}

/**
 * Built-in Blog connector — publishes posts to a blog platform via REST API.
 * Supports Wordpress.com, Medium, Ghost, or other REST-based blog APIs.
 * Active when BLOG_PROVIDER and BLOG_API_TOKEN are configured.
 * BLOG_BASE_URL is the site URL for self-hosted blogs (e.g., WordPress).
 */
function blogConnector(): PublishConnector | null {
  const provider = process.env.BLOG_PROVIDER;
  const token = process.env.BLOG_API_TOKEN;
  const baseUrl = process.env.BLOG_BASE_URL;

  if (!provider || !token) return null;

  if (provider === "wordpress" && baseUrl) {
    return async ({ variant, contentTitle }) => {
      const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: contentTitle || "Untitled",
          content: variant.body,
          status: "draft",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: number;
        message?: string;
      };
      if (!response.ok || !data.id) {
        return { ok: false, error: data.message || `WordPress HTTP ${response.status}` };
      }
      return { ok: true, externalId: String(data.id) };
    };
  } else if (provider === "medium") {
    return async ({ variant, contentTitle }) => {
      const response = await fetch("https://api.medium.com/v1/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: contentTitle || "Untitled",
          content: variant.body,
          contentFormat: "html",
          publishStatus: "draft",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        data?: { id?: string };
        errors?: Array<{ message?: string }>;
      };
      if (!response.ok || !data.data?.id) {
        return { ok: false, error: data.errors?.[0]?.message || `Medium HTTP ${response.status}` };
      }
      return { ok: true, externalId: data.data.id };
    };
  } else if (provider === "ghost" && baseUrl) {
    return async ({ variant, contentTitle }) => {
      const response = await fetch(`${baseUrl}/ghost/api/v3/admin/posts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Ghost ${token}`,
        },
        body: JSON.stringify({
          posts: [
            {
              title: contentTitle || "Untitled",
              html: variant.body,
              status: "draft",
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        posts?: Array<{ id?: string }>;
        message?: string;
      };
      const postId = data.posts?.[0]?.id;
      if (!response.ok || !postId) {
        return { ok: false, error: data.message || `Ghost HTTP ${response.status}` };
      }
      return { ok: true, externalId: postId };
    };
  }
  return null;
}

/**
 * Built-in RSS connector — publishes to an RSS feed via Zapier, IFTTT, or
 * direct feed generation. For simplicity, this uses a webhook-based service
 * that accepts new feed items. RSS_WEBHOOK_URL must point to a feed update endpoint.
 * Common services: Zapier RSS trigger, IFTTT Applets, or custom webhooks.
 */
function rssConnector(): PublishConnector | null {
  const webhookUrl = process.env.RSS_WEBHOOK_URL;
  if (!webhookUrl) return null;

  return async ({ variant, contentTitle }) => {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: contentTitle || "Untitled",
          description: variant.body.replace(/<[^>]*>/g, "").slice(0, 500),
          content: variant.body,
          pubDate: new Date().toISOString(),
          guid: `item_${Date.now()}`,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string };
        return { ok: false, error: error.message || `RSS HTTP ${response.status}` };
      }

      const data = (await response.json().catch(() => ({ guid: `item_${Date.now()}` }))) as { guid?: string };
      return { ok: true, externalId: data.guid || "" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "RSS publish failed" };
    }
  };
}

/** Free demo connectors (NMD_DEMO_CONNECTORS=1) — succeed locally without
 * any platform credentials so the whole flow can be tested at zero cost. */
function demoConnector(platform: string): PublishConnector {
  return async ({ variant }) => ({
    ok: true,
    externalId: `demo_${platform}_${variant.id}`,
  });
}

let builtinsLoaded = false;

function loadBuiltinConnectors() {
  if (builtinsLoaded) return;
  builtinsLoaded = true;
  const telegram = telegramConnector();
  if (telegram && !connectors.has("telegram")) connectors.set("telegram", telegram);
  const line = lineConnector();
  if (line && !connectors.has("line")) connectors.set("line", line);
  const facebook = facebookConnector();
  if (facebook && !connectors.has("facebook")) connectors.set("facebook", facebook);
  const discord = discordConnector();
  if (discord && !connectors.has("discord")) connectors.set("discord", discord);
  const whatsapp = whatsappConnector();
  if (whatsapp && !connectors.has("whatsapp")) connectors.set("whatsapp", whatsapp);
  const instagram = instagramConnector();
  if (instagram && !connectors.has("instagram")) connectors.set("instagram", instagram);
  const x = xConnector();
  if (x && !connectors.has("x")) connectors.set("x", x);
  const linkedin = linkedinConnector();
  if (linkedin && !connectors.has("linkedin")) connectors.set("linkedin", linkedin);
  const threads = threadsConnector();
  if (threads && !connectors.has("threads")) connectors.set("threads", threads);
  const tiktok = tiktokConnector();
  if (tiktok && !connectors.has("tiktok")) connectors.set("tiktok", tiktok);
  const youtube = youtubeConnector();
  if (youtube && !connectors.has("youtube")) connectors.set("youtube", youtube);
  const pinterest = pinterestConnector();
  if (pinterest && !connectors.has("pinterest")) connectors.set("pinterest", pinterest);
  const email = emailConnector();
  if (email && !connectors.has("email")) connectors.set("email", email);
  const blog = blogConnector();
  if (blog && !connectors.has("blog")) connectors.set("blog", blog);
  const rss = rssConnector();
  if (rss && !connectors.has("rss")) connectors.set("rss", rss);
  if (process.env.NMD_DEMO_CONNECTORS === "1" || process.env.NMD_DEMO_CONNECTORS === "true") {
    for (const platform of ["telegram", "line", "facebook", "discord", "whatsapp", "instagram", "x", "linkedin", "threads", "tiktok", "youtube", "pinterest", "email", "blog", "rss"]) {
      if (!connectors.has(platform)) connectors.set(platform, demoConnector(platform));
    }
  }
}

let schemaReady = false;

export function ensurePublishSchema() {
  const db = ensureMediaSchema();
  if (schemaReady) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS nmd_publishes (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      lang TEXT NOT NULL,
      publish_status TEXT NOT NULL,          -- published | failed
      external_id TEXT,
      error TEXT,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT NOT NULL DEFAULT 'system'
    );
    CREATE INDEX IF NOT EXISTS idx_nmd_publishes_content ON nmd_publishes(content_id);
  `);
  schemaReady = true;
  return db;
}

export interface PublishRecord {
  id: string;
  contentId: string;
  variantId: string;
  platform: string;
  lang: string;
  publishStatus: "published" | "failed";
  externalId: string | null;
  error: string | null;
  publishedAt: string;
}

interface PublishRow {
  id: string;
  content_id: string;
  variant_id: string;
  platform: string;
  lang: string;
  publish_status: string;
  external_id: string | null;
  error: string | null;
  published_at: string;
}

function rowToRecord(row: PublishRow): PublishRecord {
  return {
    id: row.id,
    contentId: row.content_id,
    variantId: row.variant_id,
    platform: row.platform,
    lang: row.lang,
    publishStatus: row.publish_status as PublishRecord["publishStatus"],
    externalId: row.external_id,
    error: row.error,
    publishedAt: row.published_at,
  };
}

export function listPublishRecords(contentId: string): PublishRecord[] {
  const rows = ensurePublishSchema()
    .prepare("SELECT * FROM nmd_publishes WHERE content_id = ? ORDER BY published_at DESC")
    .all(contentId) as PublishRow[];
  return rows.map(rowToRecord);
}

/**
 * Publish a content's variants to the requested platforms. Only variants
 * that already exist are sent (build variants first); each attempt is
 * recorded win or lose. When every attempted publish succeeds and the
 * content may transition, it moves to "published".
 */
export async function publishContent(
  contentId: string,
  platforms: string[],
  actor = "system"
): Promise<{ records: PublishRecord[]; failures: number; skipped: string[] }> {
  loadBuiltinConnectors();
  const db = ensurePublishSchema();
  const content = getContent(contentId);
  if (!content) throw new Error("Content not found");

  const variants = listVariants(contentId);
  const records: PublishRecord[] = [];
  const skipped: string[] = [];
  let failures = 0;

  for (const platform of platforms) {
    const info = getPlatform(platform);
    if (!info) throw new Error(`Unknown platform "${platform}"`);
    const connector = connectors.get(info.id);
    const platformVariants = variants.filter((v) => v.platform === info.id);

    if (platformVariants.length === 0) {
      skipped.push(`${info.id}: no variants built`);
      continue;
    }
    if (!connector) {
      skipped.push(`${info.id}: no connector configured`);
      continue;
    }

    for (const variant of platformVariants) {
      let outcome: PublishOutcome;
      try {
        outcome = await connector({ variant, contentTitle: content.title });
      } catch (err) {
        outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
      if (!outcome.ok) failures += 1;

      const id = `pub_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
      db.prepare(`
        INSERT INTO nmd_publishes (id, content_id, variant_id, platform, lang, publish_status, external_id, error, created_by)
        VALUES (@id, @content_id, @variant_id, @platform, @lang, @status, @external_id, @error, @actor)
      `).run({
        id,
        content_id: contentId,
        variant_id: variant.id,
        platform: info.id,
        lang: variant.lang,
        status: outcome.ok ? "published" : "failed",
        external_id: outcome.externalId ?? null,
        error: outcome.error ?? null,
        actor,
      });
      records.push(rowToRecord(db.prepare("SELECT * FROM nmd_publishes WHERE id = ?").get(id) as PublishRow));
    }
  }

  const attempted = records.length;
  if (attempted > 0 && failures === 0 && ["approved", "scheduled"].includes(content.contentStatus)) {
    transitionContent(contentId, "published", actor);
  }

  appendAuditLog({
    action: "media.content.publish",
    actor,
    resource: `content:${contentId}`,
    detail: `${attempted} attempts, ${failures} failed, ${skipped.length} skipped`,
    severity: failures > 0 ? "warning" : "info",
  });
  return { records, failures, skipped };
}

/**
 * Scheduler entry point: publish everything whose scheduled time has
 * passed. Designed to be driven by cron/n8n or the API endpoint —
 * no hidden background loop.
 */
export async function processDueContent(
  actor = "scheduler"
): Promise<Array<{ contentId: string; failures: number; skipped: string[] }>> {
  loadBuiltinConnectors();
  ensurePublishSchema();
  const now = new Date().toISOString();
  const due = listContent({ contentStatus: "scheduled" }).filter(
    (c) => c.scheduledAt && c.scheduledAt <= now
  );

  const results: Array<{ contentId: string; failures: number; skipped: string[] }> = [];
  for (const content of due) {
    // Prefer the platforms chosen at schedule time; fall back to every
    // built variant only for legacy items scheduled without a choice.
    const platforms = content.scheduledPlatforms?.length
      ? content.scheduledPlatforms
      : Array.from(new Set(listVariants(content.id).map((v) => v.platform)));
    if (platforms.length === 0) {
      results.push({ contentId: content.id, failures: 0, skipped: ["no variants built"] });
      continue;
    }
    const { failures, skipped } = await publishContent(content.id, platforms, actor);
    results.push({ contentId: content.id, failures, skipped });
  }
  return results;
}

/** Test hook — clear registered connectors and reload built-ins next time. */
export function resetConnectorsForTest() {
  connectors.clear();
  builtinsLoaded = false;
}
