import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProviderHub } from "../providers/index.ts";

describe("getProviderHub", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("lists ollama + 5 cloud providers", async () => {
    const hub = await getProviderHub({}, "http://localhost:11434");
    expect(hub).toHaveLength(6);
    expect(hub[0]?.id).toBe("ollama");
    expect(hub[0]?.status).toBe("online");
  });

  it("marks cloud providers configured when keys present", async () => {
    const hub = await getProviderHub({ openai: "sk-test", google: "AIza-test" }, "http://localhost:11434");
    const openai = hub.find((p) => p.id === "openai");
    const google = hub.find((p) => p.id === "google");
    const anthropic = hub.find((p) => p.id === "anthropic");
    expect(openai?.configured).toBe(true);
    expect(openai?.status).toBe("online");
    expect(google?.configured).toBe(true);
    expect(anthropic?.configured).toBe(false);
    expect(anthropic?.status).toBe("unconfigured");
  });

  it("marks ollama offline when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline")) as typeof fetch;
    const hub = await getProviderHub({}, "http://localhost:11434");
    expect(hub[0]?.status).toBe("offline");
  });
});
