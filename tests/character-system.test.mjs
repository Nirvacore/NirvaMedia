import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Nirva Character Universe as a truthful versioned demo", async () => {
  const [page, registry, system, home] = await Promise.all([
    readFile(new URL("../app/characters/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/nirva-character-registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../lib/character-system.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.equal(registry.schemaVersion, 1);
  assert.deepEqual(registry.rolloutTruth.demoActive, ["Nirva Media"]);
  assert.equal(registry.rolloutTruth.designReady.length, 7);
  assert.equal(registry.rolloutTruth.conceptRegistered.length, 8);
  assert.equal((system.match(/product: "/g) ?? []).length, 16);
  assert.match(page, /ทุกโปรแกรมมี/);
  assert.match(page, /Demo active today/);
  assert.match(home, /NIRVA CHARACTER UNIVERSE/);
  assert.match(home, /1 verified demo/);
  await Promise.all([
    access(new URL("../public/characters/nirva-media-creator-v1.png", import.meta.url)),
    access(new URL("../public/characters/nirva-ecosystem-founders-v1.png", import.meta.url)),
    access(new URL("../docs/brand-references/nirva-media-creator-dna-source.jpg", import.meta.url)),
  ]);
});
