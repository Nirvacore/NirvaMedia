import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { getDb, listAuditLogs } from "../db/index.ts";
import { createContent, ensureMediaSchema, saveBrandBrief } from "../media/index.ts";
import { generateImage, listAssets, setImageProvider } from "../media/images.ts";

describe("NMD AI image", () => {
  beforeAll(() => {
    getDb();
    ensureMediaSchema();
  });

  beforeEach(() => {
    delete process.env.NMD_DEMO_CONNECTORS;
    delete process.env.NMD_IMAGE_URL;
    vi.unstubAllGlobals();
  });

  it("generates an image with brand context and attaches it to content", async () => {
    const org = `org-img-${Date.now()}`;
    saveBrandBrief({
      organizationId: org, brandName: "พันนา", product: "น้ำมันสมุนไพร",
      audience: "", tone: "พรีเมียม", competitors: "", bannedWords: [], notes: "",
    }, "tester");
    const content = createContent({ title: "โพสต์เปิดตัว", body: "x", organizationId: org, actor: "tester" });

    let seenPrompt = "";
    setImageProvider("fake-image", async (req) => {
      seenPrompt = req.prompt;
      return { dataUri: "data:image/png;base64,AAAA", model: "test-model" };
    });

    const result = await generateImage(
      { prompt: "ขวดโรลเลอร์บนโต๊ะ โทนเขียวมรกต", contentId: content.id, organizationId: org },
      "tester"
    );
    expect(result.error).toBeUndefined();
    expect(result.asset?.dataUri).toBe("data:image/png;base64,AAAA");
    expect(result.asset?.provider).toBe("fake-image:test-model");
    expect(seenPrompt).toContain("พันนา"); // brand context enriched the prompt
    expect(seenPrompt).toContain("พรีเมียม");

    const assets = listAssets(content.id);
    expect(assets).toHaveLength(1);
    expect(assets[0].prompt).toContain("ขวดโรลเลอร์");
    expect(listAuditLogs({ limit: 300 }).map((e) => e.action)).toContain("media.image.generate");
  });

  it("demo provider returns a branded SVG at zero cost", async () => {
    process.env.NMD_DEMO_CONNECTORS = "1";
    vi.resetModules();
    const fresh = await import("../media/images.ts");
    const result = await fresh.generateImage({ prompt: "green break poster" }, "tester");
    expect(result.error).toBeUndefined();
    expect(result.provider).toBe("demo");
    expect(result.asset?.dataUri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const svg = Buffer.from(result.asset!.dataUri.split(",")[1], "base64").toString();
    expect(svg).toContain("green break poster");
  });

  it("rejects unknown content, empty prompts, and oversized images", async () => {
    setImageProvider("fake-image2", async () => ({ dataUri: "data:image/png;base64,AAAA" }));
    const missing = await generateImage({ prompt: "x", contentId: "cnt_missing" }, "tester");
    expect(missing.error).toBe("Content not found");

    const empty = await generateImage({ prompt: "   " }, "tester");
    expect(empty.error).toContain("prompt is required");

    setImageProvider("huge", async () => ({ dataUri: `data:image/png;base64,${"A".repeat(9 * 1024 * 1024)}` }));
    const huge = await generateImage({ prompt: "big" }, "tester");
    expect(huge.error).toContain("8 MB");
  });

  it("degrades gracefully when the provider fails", async () => {
    setImageProvider("broken-image", async () => {
      throw new Error("model offline");
    });
    const result = await generateImage({ prompt: "x" }, "tester");
    expect(result.asset).toBeNull();
    expect(result.error).toContain("Image provider unavailable");
  });
});
