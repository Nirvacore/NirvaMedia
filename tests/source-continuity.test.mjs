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

test("preserves and indexes the complete 437-file Claude source", async () => {
  const [manifest, registry, explorer, api] = await Promise.all([
    readFile(new URL("../docs/complete-source-manifest.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../docs/source-provenance-registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../app/continuity/CompleteSourceExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-provenance/route.ts", import.meta.url), "utf8"),
  ]);

  assert.equal(manifest.totals.files, 437);
  assert.equal(manifest.totals.images, 10);
  assert.equal(manifest.files.length, 437);
  assert.equal(manifest.source.commit, "12b703434d724b1aff04675602d52356ee9c2198");
  assert.equal(registry.sources.find((source) => source.id === "claude-full-source").rootChecksum, manifest.integrity.rootChecksum);
  assert.match(explorer, /ทุกไฟล์ที่ Claude สร้าง/);
  assert.match(api, /completeSource/);

  await Promise.all(manifest.files.map(async (file) => {
    const sourceUrl = new URL(`../upstream/nirva-ai-complete/${file.path}`, import.meta.url);
    const source = await readFile(sourceUrl);
    assert.equal(source.byteLength, file.bytes, file.path);
    assert.equal(sha256(source), file.sha256, file.path);
  }));

  const claudeImages = registry.sources
    .find((source) => source.id === "claude-original-pwa-artifacts")
    .assets.map((asset) => ({ ...asset, path: `../public/upstream/claude-icons/${asset.file}` }));
  const characterImages = registry.sources
    .filter((source) => source.publicPath && source.sha256)
    .map((source) => ({ path: `../${source.publicPath}`, sha256: source.sha256 }));
  const imageVault = [...claudeImages, ...characterImages];
  assert.equal(imageVault.length, 13);
  await Promise.all(imageVault.map(async (asset) => {
    const image = await readFile(new URL(asset.path, import.meta.url));
    assert.equal(sha256(image), asset.sha256, asset.path);
  }));
});
