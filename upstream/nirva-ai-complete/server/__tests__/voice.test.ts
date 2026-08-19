import { describe, it, expect, afterEach, vi } from "vitest";
import {
  transcribeAudio,
  setSttProvider,
  getSttProviderName,
} from "../language/voice.ts";

describe("NLE voice (STT)", () => {
  afterEach(() => {
    delete process.env.NLE_STT_PROVIDER;
    delete process.env.NLE_STT_URL;
    delete process.env.NLE_STT_MODEL;
    delete process.env.NLE_STT_KEY;
    vi.unstubAllGlobals();
  });

  it("transcribes through a swappable provider", async () => {
    setSttProvider("fake-stt", async (req) => ({
      text: `heard ${req.audio.length} bytes of ${req.mimeType} in ${req.lang ?? "auto"}`,
    }));
    expect(getSttProviderName()).toBe("fake-stt");
    const result = await transcribeAudio({ audio: Buffer.from("abc"), mimeType: "audio/webm", lang: "th" });
    expect(result.text).toBe("heard 3 bytes of audio/webm in th");
    expect(result.provider).toBe("fake-stt");
    expect(result.error).toBeUndefined();
  });

  it("rejects empty audio", async () => {
    setSttProvider("fake-stt", async () => ({ text: "x" }));
    const result = await transcribeAudio({ audio: Buffer.alloc(0), mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toContain("Empty audio");
  });

  it("rejects audio over the size limit", async () => {
    setSttProvider("fake-stt", async () => ({ text: "x" }));
    const result = await transcribeAudio({ audio: Buffer.alloc(16 * 1024 * 1024), mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toContain("15 MB");
  });

  it("degrades gracefully when the provider fails", async () => {
    setSttProvider("broken-stt", async () => {
      throw new Error("model offline");
    });
    const result = await transcribeAudio({ audio: Buffer.from("abc"), mimeType: "audio/webm" });
    expect(result.text).toBeNull();
    expect(result.error).toContain("STT provider unavailable: model offline");
  });

  it("resolves a self-hosted open-source whisper server via NLE_STT_URL", async () => {
    process.env.NLE_STT_URL = "http://localhost:8000";
    process.env.NLE_STT_MODEL = "Systran/faster-whisper-small";
    vi.resetModules();
    const fresh = await import("../language/voice.ts");
    expect(fresh.getSttProviderName()).toBe("local-whisper");

    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push(url);
      const form = init.body as FormData;
      expect(String(form.get("model"))).toBe("Systran/faster-whisper-small");
      return new Response(JSON.stringify({ text: "สวัสดีจาก whisper ฟรี" }), { status: 200 });
    });

    const result = await fresh.transcribeAudio({ audio: Buffer.from("audio"), mimeType: "audio/webm", lang: "th" });
    expect(result.text).toBe("สวัสดีจาก whisper ฟรี");
    expect(result.provider).toBe("local-whisper");
    expect(calls[0]).toBe("http://localhost:8000/v1/audio/transcriptions");
  });

  it("built-in echo provider resolves via NLE_STT_PROVIDER without external services", async () => {
    process.env.NLE_STT_PROVIDER = "echo";
    vi.resetModules();
    const fresh = await import("../language/voice.ts");
    expect(fresh.getSttProviderName()).toBe("echo");
    const result = await fresh.transcribeAudio({ audio: Buffer.alloc(2048), mimeType: "audio/webm" });
    expect(result.text).toContain("[echo transcript]");
    expect(result.provider).toBe("echo");
  });
});
