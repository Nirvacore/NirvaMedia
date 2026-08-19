import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../db/index.ts";
import {
  ensureLanguageSchema,
  translateText,
  setTranslationProvider,
  getTranslationProviderName,
  getTranslationStats,
} from "../language/index.ts";
import {
  LANGUAGES,
  getLanguage,
  isRTL,
  detectLanguageByScript,
  formatCurrency,
  formatDate,
  formatNumber,
  localize,
} from "../../shared/language.ts";

describe("NLE language engine", () => {
  beforeAll(() => {
    getDb();
    ensureLanguageSchema();
  });

  it("registers 20+ languages with metadata", () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(20);
    expect(getLanguage("th")?.nativeName).toBe("ไทย");
    expect(getLanguage("TH")?.code).toBe("th");
    expect(getLanguage("xx")).toBeNull();
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("he")).toBe(true);
    expect(isRTL("th")).toBe(false);
  });

  it("detects languages by script", () => {
    expect(detectLanguageByScript("สวัสดีครับ ยินดีต้อนรับ").language).toBe("th");
    expect(detectLanguageByScript("こんにちは、元気ですか").language).toBe("ja");
    expect(detectLanguageByScript("你好世界").language).toBe("zh");
    expect(detectLanguageByScript("안녕하세요").language).toBe("ko");
    expect(detectLanguageByScript("مرحبا بالعالم").language).toBe("ar");
    expect(detectLanguageByScript("ສະບາຍດີ").language).toBe("lo");
    expect(detectLanguageByScript("សួស្តី").language).toBe("km");
    expect(detectLanguageByScript("Привет мир").language).toBe("ru");
    expect(detectLanguageByScript("").language).toBeNull();
    expect(detectLanguageByScript("12345 !!!").language).toBeNull();
  });

  it("gives Latin text low confidence (needs AI to refine)", () => {
    const result = detectLanguageByScript("Hello world, how are you?");
    expect(result.language).toBe("en");
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    const thai = detectLanguageByScript("สวัสดีครับ");
    expect(thai.confidence).toBeGreaterThan(0.9);
  });

  it("formats numbers, currency, and dates per locale", () => {
    expect(formatNumber(1234567.89, "en")).toBe("1,234,567.89");
    expect(formatCurrency(100, { locale: "th" })).toContain("฿");
    expect(formatCurrency(100, { locale: "en", currency: "USD" })).toBe("$100.00");
    const date = formatDate("2026-07-04T12:00:00Z", { locale: "en", timezone: "Asia/Bangkok" });
    expect(date).toContain("2026");
    expect(() => formatDate("not-a-date", { locale: "en" })).toThrow();
  });

  it("localizes a bundle in one call with RTL flag", () => {
    const bundle = localize(
      { number: 1000, currencyAmount: 50, date: "2026-01-15T00:00:00Z" },
      { locale: "ar" }
    );
    expect(bundle.rtl).toBe(true);
    expect(bundle.number).toBeTruthy();
    expect(bundle.currency).toBeTruthy();
    expect(bundle.date).toBeTruthy();
  });

  it("returns text unchanged when source equals target", async () => {
    const result = await translateText({ text: "same", sourceLang: "th", targetLang: "th" });
    expect(result.translated).toBe("same");
    expect(result.provider).toBe("identity");
  });

  it("rejects unsupported target languages", async () => {
    const result = await translateText({ text: "hi", sourceLang: "en", targetLang: "xx" });
    expect(result.translated).toBeNull();
    expect(result.error).toContain("Unsupported");
  });

  it("translates via a swappable provider and caches the result", async () => {
    setTranslationProvider("fake", async (req) => ({ translated: `[${req.targetLang}] ${req.text}` }));
    expect(getTranslationProviderName()).toBe("fake");

    const text = `hello cache ${Date.now()}`;
    const first = await translateText({ text, sourceLang: "en", targetLang: "th" });
    expect(first.translated).toBe(`[th] ${text}`);
    expect(first.cached).toBe(false);

    const second = await translateText({ text, sourceLang: "en", targetLang: "th" });
    expect(second.translated).toBe(`[th] ${text}`);
    expect(second.cached).toBe(true);

    const stats = getTranslationStats();
    expect(stats.entries).toBeGreaterThanOrEqual(1);
    expect(stats.cacheHits).toBeGreaterThanOrEqual(1);
  });

  it("keeps tones as separate cache entries", async () => {
    setTranslationProvider("fake-tone", async (req) => ({ translated: `${req.tone ?? "neutral"}: ${req.text}` }));
    const text = `tone test ${Date.now()}`;
    const formal = await translateText({ text, sourceLang: "en", targetLang: "th", tone: "formal" });
    const casual = await translateText({ text, sourceLang: "en", targetLang: "th", tone: "casual" });
    expect(formal.translated).toContain("formal");
    expect(casual.translated).toContain("casual");
  });

  it("degrades gracefully when the provider is down", async () => {
    setTranslationProvider("broken", async () => {
      throw new Error("connection refused");
    });
    const result = await translateText({ text: `fail ${Date.now()}`, sourceLang: "en", targetLang: "th" });
    expect(result.translated).toBeNull();
    expect(result.error).toContain("provider unavailable");
  });
});
