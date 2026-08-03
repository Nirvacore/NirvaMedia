import { describe, it, expect, beforeAll } from "vitest";
import { getDb, listAuditLogs } from "../db/index.ts";
import {
  ensureMediaSchema,
  createContent,
  getContent,
  listContent,
  transitionContent,
  generateContent,
  setWriterProvider,
  buildVariants,
  listVariants,
  getBrandBrief,
  saveBrandBrief,
  brandContextPrompt,
} from "../media/index.ts";
import { setTranslationProvider } from "../language/index.ts";
import {
  PLATFORMS,
  getPlatform,
  canTransition,
  adaptTextForPlatform,
} from "../../shared/media.ts";

describe("NMD media pipeline", () => {
  beforeAll(() => {
    getDb();
    ensureMediaSchema();
  });

  it("registers the 18 vision platforms with constraints", () => {
    expect(PLATFORMS).toHaveLength(18);
    expect(getPlatform("x")?.maxLength).toBe(280);
    expect(getPlatform("LINE")?.supportsHashtags).toBe(false);
    expect(getPlatform("nope")).toBeNull();
  });

  it("enforces the content status flow", () => {
    expect(canTransition("draft", "review")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("review", "draft")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(false);
  });

  it("adapts text per platform: truncation at word boundary + hashtag stripping", () => {
    const long = "word ".repeat(100).trim();
    const forX = adaptTextForPlatform(long, "x");
    expect(forX.truncated).toBe(true);
    expect(forX.body.length).toBeLessThanOrEqual(280);
    expect(forX.body.endsWith("…")).toBe(true);

    const tagged = "Big launch today #nirva #ai check it out";
    const forLine = adaptTextForPlatform(tagged, "line");
    expect(forLine.body).not.toContain("#nirva");
    const forFacebook = adaptTextForPlatform(tagged, "facebook");
    expect(forFacebook.body).toContain("#nirva");
    expect(forFacebook.truncated).toBe(false);

    expect(() => adaptTextForPlatform("x", "myspace")).toThrow();
  });

  it("creates, reads, and lists content", () => {
    const content = createContent({ title: "Hello", body: "World", tags: ["launch"], actor: "tester" });
    expect(content.id).toMatch(/^cnt_/);
    expect(content.contentStatus).toBe("draft");
    expect(getContent(content.id)?.tags).toEqual(["launch"]);
    expect(listContent().some((c) => c.id === content.id)).toBe(true);
    expect(listContent({ contentStatus: "published" }).some((c) => c.id === content.id)).toBe(false);
  });

  it("moves content through the pipeline and rejects invalid jumps", () => {
    const content = createContent({ title: "Flow", body: "test", actor: "tester" });

    const invalid = transitionContent(content.id, "published", "tester");
    expect(invalid.error).toContain("Cannot move");

    expect(transitionContent(content.id, "review", "tester").content?.contentStatus).toBe("review");
    expect(transitionContent(content.id, "approved", "tester").content?.contentStatus).toBe("approved");

    const noDate = transitionContent(content.id, "scheduled", "tester");
    expect(noDate.error).toContain("scheduledAt");

    const scheduled = transitionContent(content.id, "scheduled", "tester", "2026-08-01T09:00:00Z");
    expect(scheduled.content?.contentStatus).toBe("scheduled");
    expect(scheduled.content?.scheduledAt).toBe("2026-08-01T09:00:00Z");

    // Re-scheduling an already-scheduled post updates the time (scheduled -> scheduled)
    const rescheduled = transitionContent(content.id, "scheduled", "tester", "2026-08-02T18:30:00Z");
    expect(rescheduled.error).toBeUndefined();
    expect(rescheduled.content?.scheduledAt).toBe("2026-08-02T18:30:00Z");

    expect(transitionContent("cnt_missing", "review", "tester").error).toContain("not found");
  });

  it("generates content through a swappable writer provider", async () => {
    setWriterProvider("fake-writer", async (req) => ({
      title: `Draft: ${req.brief.slice(0, 20)}`,
      body: `(${req.lang}) ${req.brief}`,
    }));
    const { content, error } = await generateContent({ brief: "เปิดตัว Nirva Media", contentType: "post", lang: "th" }, "tester");
    expect(error).toBeUndefined();
    expect(content?.title).toContain("Draft:");
    expect(content?.sourceLang).toBe("th");
  });

  it("reports writer provider failure without throwing", async () => {
    setWriterProvider("broken-writer", async () => {
      throw new Error("model offline");
    });
    const { content, error } = await generateContent({ brief: "x", contentType: "post", lang: "en" }, "tester");
    expect(content).toBeNull();
    expect(error).toContain("Writer provider unavailable");
  });

  it("fans out to platform × language variants through NLE", async () => {
    setTranslationProvider("fake-media", async (req) => ({ translated: `[${req.targetLang}] ${req.text}` }));
    const content = createContent({ title: "Fanout", body: "Launch day #nirva", sourceLang: "en", actor: "tester" });

    const { variants, failures } = await buildVariants(content.id, ["x", "line"], ["en", "th"], "tester");
    expect(failures).toHaveLength(0);
    expect(variants).toHaveLength(4);

    const lineTh = variants.find((v) => v.platform === "line" && v.lang === "th");
    expect(lineTh?.body).toContain("[th]");
    expect(lineTh?.body).not.toContain("#nirva");
    expect(lineTh?.translationProvider).toBe("fake-media");

    const xEn = variants.find((v) => v.platform === "x" && v.lang === "en");
    expect(xEn?.translationProvider).toBeNull();

    // Rebuild is idempotent — upsert, not duplicate.
    const again = await buildVariants(content.id, ["x", "line"], ["en", "th"], "tester");
    expect(again.variants).toHaveLength(4);
    expect(listVariants(content.id)).toHaveLength(4);
  });

  it("reports failed languages instead of dropping them silently", async () => {
    setTranslationProvider("half-broken", async (req) => {
      if (req.targetLang === "ja") throw new Error("no ja model");
      return { translated: `[${req.targetLang}] ${req.text}` };
    });
    const content = createContent({ title: "Partial", body: "hello", sourceLang: "en", actor: "tester" });
    const { variants, failures } = await buildVariants(content.id, ["x"], ["th", "ja"], "tester");
    expect(variants).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].lang).toBe("ja");
  });

  it("rejects unknown platforms in fan-out", async () => {
    const content = createContent({ title: "Bad", body: "x", actor: "tester" });
    await expect(buildVariants(content.id, ["myspace"], [], "tester")).rejects.toThrow("Unknown platform");
  });

  it("saves and upserts the brand brief (the per-client brain layer)", () => {
    const org = `org-brief-${Date.now()}`;
    expect(getBrandBrief(org)).toBeNull();

    const brief = saveBrandBrief({
      organizationId: org,
      brandName: "พันนา",
      product: "น้ำมันสมุนไพรบำบัดสายพรีเมียม",
      audience: "คนทำงานออฟฟิศ 25-45",
      tone: "อบอุ่น พรีเมียม ไม่ขายแข็ง",
      competitors: "ยาหม่องทั่วไป",
      bannedWords: ["ถูกที่สุด", "ยาแก้ปวดคนแก่"],
      notes: "แคมเปญหลัก: พักสีเขียว",
    }, "tester");
    expect(brief.brandName).toBe("พันนา");
    expect(getBrandBrief(org)?.bannedWords).toEqual(["ถูกที่สุด", "ยาแก้ปวดคนแก่"]);

    saveBrandBrief({ ...brief, tone: "สนุก เป็นกันเอง" }, "tester");
    expect(getBrandBrief(org)?.tone).toBe("สนุก เป็นกันเอง");
    expect(getBrandBrief(org)?.brandName).toBe("พันนา");
  });

  it("injects the brand brief into the writer (two-layer brain)", async () => {
    const org = `org-writer-${Date.now()}`;
    saveBrandBrief({
      organizationId: org,
      brandName: "พันนา",
      product: "น้ำมันสมุนไพร",
      audience: "ออฟฟิศ",
      tone: "พรีเมียม",
      competitors: "",
      bannedWords: ["ถูกที่สุด"],
      notes: "",
    }, "tester");

    let seenBrand: unknown = null;
    setWriterProvider("brand-aware", async (req) => {
      seenBrand = req.brand;
      return { title: "on-brand", body: `เขียนตามโทน ${req.brand?.tone}` };
    });

    const { content } = await generateContent(
      { brief: "โพสต์เปิดตัวแคมเปญ", contentType: "post", lang: "th", organizationId: org },
      "tester"
    );
    expect((seenBrand as { brandName: string }).brandName).toBe("พันนา");
    expect(content?.body).toContain("พรีเมียม");

    const prompt = brandContextPrompt(getBrandBrief(org)!);
    expect(prompt).toContain("NEVER use these words: ถูกที่สุด");
    expect(prompt).toContain("Brand: พันนา");
  });

  it("writes audit logs for media mutations", () => {
    const actions = listAuditLogs({ limit: 300 }).map((entry) => entry.action);
    for (const expected of ["media.content.create", "media.content.transition", "media.variants.build"]) {
      expect(actions).toContain(expected);
    }
  });
});
