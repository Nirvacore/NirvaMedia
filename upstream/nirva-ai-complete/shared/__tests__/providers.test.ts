import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mergeProviderKeys, maskKey, PROVIDER_ENV_MAP } from "../providers.ts";

describe("mergeProviderKeys", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.MISTRAL_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers body keys over env", () => {
    process.env.OPENAI_API_KEY = "env-key";
    const keys = mergeProviderKeys({ openai: "body-key" });
    expect(keys.openai).toBe("body-key");
  });

  it("falls back to env when body empty", () => {
    process.env.ANTHROPIC_API_KEY = "env-ant";
    const keys = mergeProviderKeys({});
    expect(keys.anthropic).toBe("env-ant");
  });

  it("maps all cloud providers", () => {
    expect(Object.keys(PROVIDER_ENV_MAP)).toEqual(
      expect.arrayContaining(["openai", "anthropic", "google", "deepseek", "mistral"])
    );
  });
});

describe("maskKey", () => {
  it("masks long keys", () => {
    expect(maskKey("sk-abcdefghijklmnop")).toBe("sk-a••••mnop");
  });

  it("returns empty for missing key", () => {
    expect(maskKey()).toBe("");
    expect(maskKey("")).toBe("");
  });

  it("masks short keys fully", () => {
    expect(maskKey("short")).toBe("••••••••");
  });
});
