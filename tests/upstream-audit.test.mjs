import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("records the selective upstream snapshot without claiming a complete checkout", async () => {
  const inventory = JSON.parse(
    await readFile(new URL("../docs/upstream-source-inventory.json", import.meta.url), "utf8"),
  );

  assert.equal(inventory.source.commit, "12b703434d724b1aff04675602d52356ee9c2198");
  assert.equal(inventory.snapshot.completeCheckout, false);
  assert.equal(inventory.snapshot.upstreamFileCount, 437);
  assert.equal(inventory.snapshot.localFileCount, 94);
  assert.equal(inventory.snapshot.upstreamFilesNotPreserved, 343);
  assert.ok(inventory.inventory.executable.length > 0);
  assert.ok(inventory.inventory.roadmap.length > 0);
  assert.ok(inventory.inventory.missing.length > 0);
  assert.equal(inventory.capabilityTruth.providerTranslation, "credential_required");
  assert.equal(inventory.capabilityTruth.translationMemory, "active_d1");
  assert.equal(inventory.capabilityTruth.upstreamMediaRuntime, "dependency_incomplete");
});

test("exposes only the selected provider-free NLE adapter as active", async () => {
  const [adapter, languageRoute, statusRoute] = await Promise.all([
    readFile(new URL("../lib/nle/localization.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/languages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/upstream-status/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(adapter, /detectLanguageByScript/);
  assert.match(adapter, /Intl\.NumberFormat/);
  assert.match(adapter, /Intl\.DateTimeFormat/);
  assert.doesNotMatch(adapter, /OLLAMA|OPENAI_API_KEY|nle_translations/);
  assert.match(languageRoute, /scriptDetection: "active"/);
  assert.match(languageRoute, /provider\.available \? "active" : "unavailable"/);
  assert.match(statusRoute, /upstream-source-inventory\.json/);
});
