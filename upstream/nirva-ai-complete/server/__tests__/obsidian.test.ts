import { describe, it, expect } from "vitest";
import { listVaultFiles } from "../obsidian/index.ts";

describe("obsidian module", () => {
  it("listVaultFiles filters to markdown only", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ files: ["note.md", "folder/", "readme.txt", "deep/nested.md"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const files = await listVaultFiles("http://obsidian.test", "key");
      expect(files).toEqual(["note.md", "deep/nested.md"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("isObsidianRunning returns false when unreachable", async () => {
    const { isObsidianRunning } = await import("../obsidian/index.ts");
    const running = await isObsidianRunning("http://127.0.0.1:1", "");
    expect(running).toBe(false);
  });
});
