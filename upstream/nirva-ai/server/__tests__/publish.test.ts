import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { getDb, listAuditLogs } from "../db/index.ts";
import { createContent, transitionContent, buildVariants, getContent } from "../media/index.ts";
import { setTranslationProvider } from "../language/index.ts";
import {
  ensurePublishSchema,
  registerConnector,
  listConnectedPlatforms,
  publishContent,
  listPublishRecords,
  processDueContent,
  resetConnectorsForTest,
} from "../media/publish.ts";

async function makeApprovedContent(body = "Publish me #now") {
  setTranslationProvider("pub-fake", async (req) => ({ translated: `[${req.targetLang}] ${req.text}` }));
  const content = createContent({ title: "Pub", body, sourceLang: "en", actor: "tester" });
  await buildVariants(content.id, ["telegram", "x"], ["en"], "tester");
  transitionContent(content.id, "review", "tester");
  transitionContent(content.id, "approved", "tester");
  return content;
}

describe("NMD publish engine", () => {
  beforeAll(() => {
    getDb();
    ensurePublishSchema();
  });

  beforeEach(() => {
    resetConnectorsForTest();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_TO;
    delete process.env.FB_PAGE_ID;
    delete process.env.FB_PAGE_ACCESS_TOKEN;
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.WHATSAPP_PHONE_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_TO;
    delete process.env.INSTAGRAM_ACCOUNT_ID;
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.X_BEARER_TOKEN;
    delete process.env.LINKEDIN_ACCESS_TOKEN;
    delete process.env.LINKEDIN_URN;
    delete process.env.THREADS_ACCOUNT_ID;
    delete process.env.THREADS_ACCESS_TOKEN;
    delete process.env.TIKTOK_ACCESS_TOKEN;
    delete process.env.YOUTUBE_ACCESS_TOKEN;
    delete process.env.PINTEREST_ACCESS_TOKEN;
    delete process.env.PINTEREST_BOARD_ID;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_TO;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.BLOG_PROVIDER;
    delete process.env.BLOG_BASE_URL;
    delete process.env.BLOG_API_TOKEN;
    delete process.env.RSS_WEBHOOK_URL;
    delete process.env.NMD_DEMO_CONNECTORS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers connectors only for known platforms", () => {
    registerConnector("telegram", async () => ({ ok: true }));
    expect(listConnectedPlatforms()).toContain("telegram");
    expect(() => registerConnector("myspace", async () => ({ ok: true }))).toThrow("Unknown platform");
  });

  it("publishes variants and transitions content to published on full success", async () => {
    const sent: string[] = [];
    registerConnector("telegram", async ({ variant }) => {
      sent.push(variant.body);
      return { ok: true, externalId: "msg_1" };
    });
    registerConnector("x", async () => ({ ok: true, externalId: "tweet_1" }));

    const content = await makeApprovedContent();
    const { records, failures, skipped } = await publishContent(content.id, ["telegram", "x"], "tester");

    expect(failures).toBe(0);
    expect(skipped).toHaveLength(0);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.publishStatus === "published")).toBe(true);
    expect(sent[0]).toContain("Publish me");
    expect(getContent(content.id)?.contentStatus).toBe("published");
    expect(listPublishRecords(content.id)).toHaveLength(2);
  });

  it("records failures, keeps status, and reports missing connectors as skipped", async () => {
    registerConnector("telegram", async () => ({ ok: false, error: "chat not found" }));
    // no connector for x on purpose

    const content = await makeApprovedContent();
    const { records, failures, skipped } = await publishContent(content.id, ["telegram", "x"], "tester");

    expect(failures).toBe(1);
    expect(records[0].publishStatus).toBe("failed");
    expect(records[0].error).toBe("chat not found");
    expect(skipped.some((s) => s.includes("x: no connector"))).toBe(true);
    expect(getContent(content.id)?.contentStatus).toBe("approved");
  });

  it("catches connectors that throw instead of crashing", async () => {
    registerConnector("telegram", async () => {
      throw new Error("network down");
    });
    const content = await makeApprovedContent();
    const { records, failures } = await publishContent(content.id, ["telegram"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("network down");
  });

  it("skips platforms whose variants were never built", async () => {
    registerConnector("line", async () => ({ ok: true }));
    const content = await makeApprovedContent();
    const { records, skipped } = await publishContent(content.id, ["line"], "tester");
    expect(records).toHaveLength(0);
    expect(skipped.some((s) => s.includes("line: no variants"))).toBe(true);
  });

  it("processes due scheduled content and leaves future content alone", async () => {
    registerConnector("telegram", async () => ({ ok: true, externalId: "sched_1" }));
    registerConnector("x", async () => ({ ok: true }));

    const dueContent = await makeApprovedContent(`due ${Date.now()}`);
    transitionContent(dueContent.id, "scheduled", "tester", new Date(Date.now() - 60_000).toISOString());

    const futureContent = await makeApprovedContent(`future ${Date.now()}`);
    transitionContent(futureContent.id, "scheduled", "tester", new Date(Date.now() + 86_400_000).toISOString());

    const results = await processDueContent("scheduler");
    const ids = results.map((r) => r.contentId);
    expect(ids).toContain(dueContent.id);
    expect(ids).not.toContain(futureContent.id);
    expect(getContent(dueContent.id)?.contentStatus).toBe("published");
    expect(getContent(futureContent.id)?.contentStatus).toBe("scheduled");
  });

  it("built-in LINE OA connector broadcasts via the Messaging API", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200, headers: { "x-line-request-id": "line-req-123" } });
    });

    const content = createContent({ title: "Line post", body: "สวัสดี LINE OA #nirva", sourceLang: "th", actor: "tester" });
    setTranslationProvider("line-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["line"], ["th"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["line"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("line-req-123");

    expect(calls[0].url).toContain("api.line.me/v2/bot/message/broadcast");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-line-token");
    const body = JSON.parse(String(calls[0].init.body)) as { messages: Array<{ text: string }> };
    expect(body.messages[0].text).toContain("สวัสดี LINE OA");
    expect(body.messages[0].text).not.toContain("#nirva"); // LINE variants strip hashtags
    expect(getContent(content.id)?.contentStatus).toBe("published");
  });

  it("built-in LINE connector pushes to LINE_TO when configured", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
    process.env.LINE_TO = "U1234567890";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response("{}", { status: 200, headers: { "x-line-request-id": "line-req-456" } });
    });

    const content = createContent({ title: "Line push", body: "push test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("line-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["line"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["line"], "tester");
    expect(records[0].publishStatus).toBe("published");
    expect(calls[0].url).toContain("/message/push");
    expect(JSON.parse(calls[0].body).to).toBe("U1234567890");
  });

  it("reports LINE API errors as failed records", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "Invalid access token" }), { status: 401 })
    );

    const content = createContent({ title: "Line fail", body: "x", sourceLang: "en", actor: "tester" });
    setTranslationProvider("line-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["line"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["line"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid access token");
  });

  it("built-in Facebook Page connector posts to the Graph API feed", async () => {
    process.env.FB_PAGE_ID = "123456789";
    process.env.FB_PAGE_ACCESS_TOKEN = "test-fb-token";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: "123456789_987" }), { status: 200 });
    });

    const content = createContent({ title: "FB post", body: "Launch day #nirva", sourceLang: "en", actor: "tester" });
    setTranslationProvider("fb-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["facebook"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["facebook"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("123456789_987");
    expect(calls[0].url).toBe("https://graph.facebook.com/v21.0/123456789/feed");
    const payload = JSON.parse(calls[0].body) as { message: string; access_token: string };
    expect(payload.access_token).toBe("test-fb-token");
    expect(payload.message).toContain("#nirva"); // facebook keeps hashtags
  });

  it("reports Facebook Graph API errors as failed records", async () => {
    process.env.FB_PAGE_ID = "123456789";
    process.env.FB_PAGE_ACCESS_TOKEN = "expired";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Error validating access token" } }), { status: 400 })
    );
    const content = createContent({ title: "FB fail", body: "x", sourceLang: "en", actor: "tester" });
    setTranslationProvider("fb-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["facebook"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["facebook"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Error validating access token");
  });

  it("built-in Discord webhook connector posts to a channel", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(null, { status: 204 });
    });

    const content = createContent({ title: "Discord post", body: "Launch day #nirva", sourceLang: "en", actor: "tester" });
    setTranslationProvider("discord-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["discord"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["discord"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(calls[0].url).toBe("https://discord.com/api/webhooks/123/abc");
    const payload = JSON.parse(calls[0].body) as { content: string; username: string };
    expect(payload.username).toBe("Nirva Media");
    expect(payload.content).toContain("Launch day #nirva");
  });

  it("Discord connector truncates long messages at 2000 chars", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/abc";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(null, { status: 204 });
    });

    const longBody = "x".repeat(3000);
    const content = createContent({ title: "Long", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("discord-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["discord"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["discord"], "tester");
    expect(records[0].publishStatus).toBe("published");
    const payload = JSON.parse(calls[0].body) as { content: string };
    expect(payload.content.length).toBe(2000);
  });

  it("reports Discord API errors as failed records", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/123/expired";
    vi.stubGlobal("fetch", async () => new Response("Invalid Webhook Token", { status: 401 }));

    const content = createContent({ title: "Discord fail", body: "x", sourceLang: "en", actor: "tester" });
    setTranslationProvider("discord-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["discord"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["discord"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Discord HTTP 401");
  });

  it("built-in WhatsApp Business connector sends via Cloud API", async () => {
    process.env.WHATSAPP_PHONE_ID = "123456789";
    process.env.WHATSAPP_ACCESS_TOKEN = "test-wa-token";
    process.env.WHATSAPP_TO = "+66812345678";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ messages: [{ id: "wamid_123" }] }), { status: 200 });
    });

    const content = createContent({ title: "WA post", body: "สวัสดี WhatsApp", sourceLang: "th", actor: "tester" });
    setTranslationProvider("wa-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["whatsapp"], ["th"], "tester");

    const { records, failures } = await publishContent(content.id, ["whatsapp"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("wamid_123");
    expect(calls[0].url).toContain("graph.instagram.com");
    const payload = JSON.parse(calls[0].body) as { to: string; text: { body: string } };
    expect(payload.to).toBe("+66812345678");
    expect(payload.text.body).toBe("สวัสดี WhatsApp");
  });

  it("WhatsApp connector truncates messages at 4096 char limit", async () => {
    process.env.WHATSAPP_PHONE_ID = "123456789";
    process.env.WHATSAPP_ACCESS_TOKEN = "test-wa-token";
    process.env.WHATSAPP_TO = "+66812345678";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ messages: [{ id: "wamid_456" }] }), { status: 200 });
    });

    const longBody = "x".repeat(5000);
    const content = createContent({ title: "Long WA", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("wa-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["whatsapp"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["whatsapp"], "tester");
    expect(records[0].publishStatus).toBe("published");
    const payload = JSON.parse(calls[0].body) as { text: { body: string } };
    expect(payload.text.body.length).toBe(4096);
  });

  it("reports WhatsApp API errors as failed records", async () => {
    process.env.WHATSAPP_PHONE_ID = "bad-id";
    process.env.WHATSAPP_ACCESS_TOKEN = "bad-token";
    process.env.WHATSAPP_TO = "+66812345678";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Invalid phone number ID" } }), { status: 400 })
    );

    const content = createContent({ title: "WA fail", body: "x", sourceLang: "en", actor: "tester" });
    setTranslationProvider("wa-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["whatsapp"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["whatsapp"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid phone number ID");
  });

  it("built-in Instagram connector posts captions to Business Account", async () => {
    process.env.INSTAGRAM_ACCOUNT_ID = "789456123";
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-ig-token";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: "ig_media_123" }), { status: 200 });
    });

    const content = createContent({ title: "Summer Vibes", body: "#สวัสดี #instagram", sourceLang: "th", actor: "tester" });
    setTranslationProvider("ig-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["instagram"], ["th"], "tester");

    const { records, failures } = await publishContent(content.id, ["instagram"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("ig_media_123");
    expect(calls[0].url).toContain("789456123/media");
    const payload = JSON.parse(calls[0].body) as { caption: string };
    expect(payload.caption).toContain("Summer Vibes");
    expect(payload.caption).toContain("#สวัสดี");
  });

  it("Instagram connector truncates captions at 2200 char limit", async () => {
    process.env.INSTAGRAM_ACCOUNT_ID = "789456123";
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-ig-token";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: "ig_media_456" }), { status: 200 });
    });

    const longBody = "x".repeat(3000);
    const content = createContent({ title: "Long post", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("ig-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["instagram"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["instagram"], "tester");
    expect(records[0].publishStatus).toBe("published");
    const payload = JSON.parse(calls[0].body) as { caption: string };
    expect(payload.caption.length).toBeLessThanOrEqual(2200);
  });

  it("reports Instagram API errors as failed records", async () => {
    process.env.INSTAGRAM_ACCOUNT_ID = "bad-account";
    process.env.INSTAGRAM_ACCESS_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Invalid Instagram Business Account" } }), { status: 401 })
    );

    const content = createContent({ title: "IG fail", body: "x", sourceLang: "en", actor: "tester" });
    setTranslationProvider("ig-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["instagram"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["instagram"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid Instagram Business Account");
  });

  it("built-in X (Twitter) connector posts tweets via v2 API", async () => {
    process.env.X_BEARER_TOKEN = "test-x-bearer-token";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ data: { id: "1234567890" } }), { status: 200 });
    });

    const content = createContent({ title: "X post", body: "Breaking: Nirva Media goes live! 🚀 #media #ai", sourceLang: "en", actor: "tester" });
    setTranslationProvider("x-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["x"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["x"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("1234567890");
    expect(calls[0].url).toBe("https://api.twitter.com/2/tweets");
    const payload = JSON.parse(calls[0].body) as { text: string };
    expect(payload.text).toContain("Breaking");
    expect(payload.text).toContain("#media");
  });

  it("X connector enforces 280 char tweet limit", async () => {
    process.env.X_BEARER_TOKEN = "test-x-bearer-token";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ data: { id: "tweet_123" } }), { status: 200 });
    });

    const longBody = "x".repeat(500);
    const content = createContent({ title: "Long X", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("x-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["x"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["x"], "tester");
    expect(records[0].publishStatus).toBe("published");
    const payload = JSON.parse(calls[0].body) as { text: string };
    expect(payload.text.length).toBe(280);
  });

  it("reports X API errors as failed records", async () => {
    process.env.X_BEARER_TOKEN = "invalid-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ errors: [{ message: "Unauthorized" }] }), { status: 401 })
    );

    const content = createContent({ title: "X fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("x-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["x"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["x"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Unauthorized");
  });

  it("built-in LinkedIn connector posts to profile/organization via Share API", async () => {
    process.env.LINKEDIN_ACCESS_TOKEN = "test-linkedin-token";
    process.env.LINKEDIN_URN = "urn:li:organization:12345";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: "li_share_123" }), { status: 201 });
    });

    const content = createContent({ title: "B2B Update", body: "Join us at the conference! #B2B #leadership", sourceLang: "en", actor: "tester" });
    setTranslationProvider("li-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["linkedin"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["linkedin"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("li_share_123");
    expect(calls[0].url).toContain("api.linkedin.com/v2/shares");
    const payload = JSON.parse(calls[0].body) as { owner: string; text: { text: string } };
    expect(payload.owner).toBe("urn:li:organization:12345");
    expect(payload.text.text).toContain("B2B Update");
  });

  it("LinkedIn connector respects 3000 char limit with title prepending", async () => {
    process.env.LINKEDIN_ACCESS_TOKEN = "test-linkedin-token";
    process.env.LINKEDIN_URN = "urn:li:person:9999";
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ id: "li_share_456" }), { status: 201 });
    });

    const longBody = "x".repeat(4000);
    const content = createContent({ title: "Long LinkedIn", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("li-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["linkedin"], ["en"], "tester");

    const { records } = await publishContent(content.id, ["linkedin"], "tester");
    expect(records[0].publishStatus).toBe("published");
    const payload = JSON.parse(calls[0].body) as { text: { text: string } };
    expect(payload.text.text.length).toBeLessThanOrEqual(3000);
  });

  it("reports LinkedIn API errors as failed records", async () => {
    process.env.LINKEDIN_ACCESS_TOKEN = "bad-token";
    process.env.LINKEDIN_URN = "urn:li:invalid";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "Invalid access token" }), { status: 401 })
    );

    const content = createContent({ title: "LI fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("li-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["linkedin"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["linkedin"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid access token");
  });

  it("built-in Threads connector posts text via Meta Graph API", async () => {
    process.env.THREADS_ACCOUNT_ID = "123456789";
    process.env.THREADS_ACCESS_TOKEN = "test-threads-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "thread_1" }), { status: 200 });
    });

    const content = createContent({ title: "Thread", body: "Join the conversation #threadstalk", sourceLang: "en", actor: "tester" });
    setTranslationProvider("threads-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["threads"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["threads"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("thread_1");

    const payload = JSON.parse(calls[0].body);
    expect(payload.text).toContain("Thread");
  });

  it("Threads connector respects 500 char limit", async () => {
    process.env.THREADS_ACCOUNT_ID = "123456789";
    process.env.THREADS_ACCESS_TOKEN = "test-threads-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "thread_2" }), { status: 200 });
    });

    const longBody = "A".repeat(600);
    const content = createContent({ title: "Long", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("threads-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["threads"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["threads"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.text.length).toBeLessThanOrEqual(500);
  });

  it("reports Threads API errors as failed records", async () => {
    process.env.THREADS_ACCOUNT_ID = "invalid";
    process.env.THREADS_ACCESS_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Invalid account" } }), { status: 400 })
    );

    const content = createContent({ title: "TH fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("threads-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["threads"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["threads"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid account");
  });

  it("built-in TikTok connector posts via Content Posting API", async () => {
    process.env.TIKTOK_ACCESS_TOKEN = "test-tiktok-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ data: { publish_id: "tt_pub_123" } }), { status: 200 });
    });

    const content = createContent({ title: "TikTok", body: "Check out this trend #viral", sourceLang: "en", actor: "tester" });
    setTranslationProvider("tiktok-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["tiktok"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["tiktok"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("tt_pub_123");

    const payload = JSON.parse(calls[0].body);
    expect(payload.data.title).toContain("TikTok");
  });

  it("TikTok connector respects 2200 char limit", async () => {
    process.env.TIKTOK_ACCESS_TOKEN = "test-tiktok-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ data: { publish_id: "tt_pub_124" } }), { status: 200 });
    });

    const longBody = "B".repeat(2500);
    const content = createContent({ title: "TK Long", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("tiktok-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["tiktok"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["tiktok"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.data.title.length).toBeLessThanOrEqual(2200);
  });

  it("reports TikTok API errors as failed records", async () => {
    process.env.TIKTOK_ACCESS_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 })
    );

    const content = createContent({ title: "TK fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("tiktok-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["tiktok"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["tiktok"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid token");
  });

  it("built-in YouTube connector posts to Community tab via Data API", async () => {
    process.env.YOUTUBE_ACCESS_TOKEN = "test-youtube-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "yt_activity_123" }), { status: 200 });
    });

    const content = createContent({ title: "YouTube", body: "New video coming soon! #youtubecommunity", sourceLang: "en", actor: "tester" });
    setTranslationProvider("youtube-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["youtube"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["youtube"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("yt_activity_123");

    const payload = JSON.parse(calls[0].body);
    expect(payload.snippet.description).toContain("YouTube");
  });

  it("YouTube connector respects 5000 char limit", async () => {
    process.env.YOUTUBE_ACCESS_TOKEN = "test-youtube-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "yt_activity_124" }), { status: 200 });
    });

    const longBody = "C".repeat(5500);
    const content = createContent({ title: "YT Long", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("youtube-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["youtube"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["youtube"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.snippet.description.length).toBeLessThanOrEqual(5000);
  });

  it("reports YouTube API errors as failed records", async () => {
    process.env.YOUTUBE_ACCESS_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 403 })
    );

    const content = createContent({ title: "YT fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("youtube-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["youtube"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["youtube"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Unauthorized");
  });

  it("built-in Pinterest connector creates pins via API", async () => {
    process.env.PINTEREST_ACCESS_TOKEN = "test-pinterest-token";
    process.env.PINTEREST_BOARD_ID = "board_123";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "pin_1" }), { status: 200 });
    });

    const content = createContent({ title: "Pin", body: "Beautiful design inspiration #pinterest", sourceLang: "en", actor: "tester" });
    setTranslationProvider("pinterest-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["pinterest"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["pinterest"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("pin_1");

    const payload = JSON.parse(calls[0].body);
    expect(payload.description).toContain("Pin");
    expect(payload.board_id).toBe("board_123");
  });

  it("Pinterest connector respects 500 char limit", async () => {
    process.env.PINTEREST_ACCESS_TOKEN = "test-pinterest-token";
    process.env.PINTEREST_BOARD_ID = "board_456";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: "pin_2" }), { status: 200 });
    });

    const longBody = "D".repeat(700);
    const content = createContent({ title: "P Long", body: longBody, sourceLang: "en", actor: "tester" });
    setTranslationProvider("pinterest-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["pinterest"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["pinterest"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.description.length).toBeLessThanOrEqual(500);
  });

  it("reports Pinterest API errors as failed records", async () => {
    process.env.PINTEREST_ACCESS_TOKEN = "bad-token";
    process.env.PINTEREST_BOARD_ID = "invalid";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "Board not found" }), { status: 404 })
    );

    const content = createContent({ title: "P fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("pinterest-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["pinterest"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["pinterest"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Board not found");
  });

  it("built-in Email connector sends campaigns via SendGrid", async () => {
    process.env.EMAIL_PROVIDER = "sendgrid";
    process.env.EMAIL_FROM = "campaigns@brand.com";
    process.env.EMAIL_TO = "subscriber1@example.com,subscriber2@example.com";
    process.env.SENDGRID_API_KEY = "test-sg-key";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(null, { status: 202, headers: { "x-message-id": "email_sg_123" } });
    });

    const content = createContent({ title: "Campaign", body: "Check our latest offers!", sourceLang: "en", actor: "tester" });
    setTranslationProvider("email-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["email"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["email"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("email_sg_123");

    const payload = JSON.parse(calls[0].body);
    expect(payload.subject).toBe("Campaign");
    expect(payload.from.email).toBe("campaigns@brand.com");
    expect(payload.personalizations[0].to).toHaveLength(2);
  });

  it("Email connector supports multiple recipients and HTML content", async () => {
    process.env.EMAIL_PROVIDER = "sendgrid";
    process.env.EMAIL_FROM = "promo@store.com";
    process.env.EMAIL_TO = "list@subscribers.com";
    process.env.SENDGRID_API_KEY = "test-sg-key-2";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(null, { status: 202, headers: { "x-message-id": "email_sg_124" } });
    });

    const htmlContent = "<h1>Newsletter</h1><p>Top stories this week</p>";
    const content = createContent({ title: "Weekly", body: htmlContent, sourceLang: "en", actor: "tester" });
    setTranslationProvider("email-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["email"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["email"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.content[0].type).toBe("text/html");
    expect(payload.content[0].value).toContain("Newsletter");
  });

  it("reports Email API errors as failed records", async () => {
    process.env.EMAIL_PROVIDER = "sendgrid";
    process.env.EMAIL_FROM = "bad@example.com";
    process.env.EMAIL_TO = "invalid";
    process.env.SENDGRID_API_KEY = "bad-key";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ errors: [{ message: "Invalid sender email" }] }), { status: 400 })
    );

    const content = createContent({ title: "Email fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("email-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["email"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["email"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid sender email");
  });

  it("built-in Blog connector publishes to WordPress site", async () => {
    process.env.BLOG_PROVIDER = "wordpress";
    process.env.BLOG_BASE_URL = "https://myblog.com";
    process.env.BLOG_API_TOKEN = "test-wp-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: 12345 }), { status: 201 });
    });

    const content = createContent({ title: "Blog Post", body: "<h1>Welcome</h1><p>New article content</p>", sourceLang: "en", actor: "tester" });
    setTranslationProvider("blog-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["blog"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["blog"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("12345");

    const payload = JSON.parse(calls[0].body);
    expect(payload.title).toBe("Blog Post");
    expect(payload.content).toContain("Welcome");
    expect(payload.status).toBe("draft");
  });

  it("Blog connector saves as draft initially", async () => {
    process.env.BLOG_PROVIDER = "wordpress";
    process.env.BLOG_BASE_URL = "https://example.com";
    process.env.BLOG_API_TOKEN = "test-token";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ id: 99 }), { status: 201 });
    });

    const content = createContent({ title: "Draft", body: "Content", sourceLang: "en", actor: "tester" });
    setTranslationProvider("blog-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["blog"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["blog"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.status).toBe("draft");
    expect(records[0].publishStatus).toBe("published");
  });

  it("reports Blog API errors as failed records", async () => {
    process.env.BLOG_PROVIDER = "wordpress";
    process.env.BLOG_BASE_URL = "https://invalid.com";
    process.env.BLOG_API_TOKEN = "bad-token";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
    );

    const content = createContent({ title: "Blog fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("blog-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["blog"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["blog"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Unauthorized");
  });

  it("built-in RSS connector publishes via webhook to feed services", async () => {
    process.env.RSS_WEBHOOK_URL = "https://zapier.example.com/feed/update";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ guid: "rss_item_123" }), { status: 200 });
    });

    const content = createContent({ title: "Feed Item", body: "New article about <strong>technology</strong>", sourceLang: "en", actor: "tester" });
    setTranslationProvider("rss-fake", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["rss"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records, failures } = await publishContent(content.id, ["rss"], "tester");
    expect(failures).toBe(0);
    expect(records[0].publishStatus).toBe("published");
    expect(records[0].externalId).toBe("rss_item_123");

    const payload = JSON.parse(calls[0].body);
    expect(payload.title).toBe("Feed Item");
    expect(payload.description).toContain("technology");
  });

  it("RSS connector strips HTML from description for feed compatibility", async () => {
    process.env.RSS_WEBHOOK_URL = "https://zapier.example.com/feed";
    const calls: Array<{ body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ body: init.body as string });
      return new Response(JSON.stringify({ guid: "rss_item_124" }), { status: 200 });
    });

    const htmlContent = "<p>Check <a href='#'>this link</a> for more info.</p>";
    const content = createContent({ title: "Link", body: htmlContent, sourceLang: "en", actor: "tester" });
    setTranslationProvider("rss-fake2", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["rss"], ["en"], "tester");
    transitionContent(content.id, "review", "tester");
    transitionContent(content.id, "approved", "tester");

    const { records } = await publishContent(content.id, ["rss"], "tester");
    const payload = JSON.parse(calls[0].body);
    expect(payload.description).not.toContain("<");
    expect(payload.description).not.toContain(">");
    expect(payload.content).toContain("<a href");
  });

  it("reports RSS webhook errors as failed records", async () => {
    process.env.RSS_WEBHOOK_URL = "https://zapier.example.com/bad";
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ message: "Invalid webhook" }), { status: 400 })
    );

    const content = createContent({ title: "RSS fail", body: "test", sourceLang: "en", actor: "tester" });
    setTranslationProvider("rss-fake3", async (req) => ({ translated: req.text }));
    await buildVariants(content.id, ["rss"], ["en"], "tester");

    const { records, failures } = await publishContent(content.id, ["rss"], "tester");
    expect(failures).toBe(1);
    expect(records[0].error).toBe("Invalid webhook");
  });

  it("demo connectors publish locally at zero cost when NMD_DEMO_CONNECTORS=1", async () => {
    process.env.NMD_DEMO_CONNECTORS = "1";
    const content = await makeApprovedContent(`demo ${Date.now()}`);
    const { records, failures, skipped } = await publishContent(content.id, ["telegram", "x"], "tester");
    expect(failures).toBe(0);
    expect(skipped).toHaveLength(0);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.publishStatus === "published")).toBe(true);
    expect(records[0].externalId).toMatch(/^demo_/);
    expect(getContent(content.id)?.contentStatus).toBe("published");
  });

  it("scheduler honors platforms chosen at schedule time, not all built variants", async () => {
    const sent: string[] = [];
    registerConnector("telegram", async ({ variant }) => {
      sent.push(`telegram:${variant.lang}`);
      return { ok: true };
    });
    registerConnector("x", async ({ variant }) => {
      sent.push(`x:${variant.lang}`);
      return { ok: true };
    });

    // Variants exist for BOTH platforms (e.g. from an earlier publish)...
    const content = await makeApprovedContent(`choice ${Date.now()}`);
    // ...but the schedule targets telegram only.
    const scheduled = transitionContent(
      content.id, "scheduled", "tester",
      new Date(Date.now() - 60_000).toISOString(), ["telegram"]
    );
    expect(scheduled.content?.scheduledPlatforms).toEqual(["telegram"]);

    await processDueContent("scheduler");
    expect(sent.some((s) => s.startsWith("telegram"))).toBe(true);
    expect(sent.some((s) => s.startsWith("x"))).toBe(false);
    expect(getContent(content.id)?.contentStatus).toBe("published");
  });

  it("audits publish attempts", () => {
    const actions = listAuditLogs({ limit: 300 }).map((entry) => entry.action);
    expect(actions).toContain("media.content.publish");
  });
});
