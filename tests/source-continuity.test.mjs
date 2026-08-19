import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

test("reuses the preserved Claude media core through an explicit active adapter", async () => {
  const [registry, adapter, upstream, campaigns, posts, continuityPage] = await Promise.all([
    readFile(new URL("../docs/source-provenance-registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../lib/upstream-media-adapter.ts", import.meta.url), "utf8"),
    readFile(new URL("../upstream/nirva-ai/shared/media.ts", import.meta.url)),
    readFile(new URL("../app/api/campaigns/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/continuity/page.tsx", import.meta.url), "utf8"),
  ]);

  const mediaSource = registry.sources.find((source) => source.id === "claude-media-platform-core");
  assert.equal(registry.updatedAt, "2026-08-19");
  assert.equal(mediaSource.status, "adapted-active");
  assert.equal(sha256(upstream), mediaSource.sha256);
  assert.match(adapter, /from "\.\.\/upstream\/nirva-ai\/shared\/media"/);
  assert.match(adapter, /adaptTextForPlatform/);
  assert.match(adapter, /canTransition/);
  assert.match(campaigns, /adaptActiveChannelText/);
  assert.match(posts, /canMoveContentStatus/);
  assert.match(continuityPage, /CLAUDE × CODEX × JIDLADA/);
});
