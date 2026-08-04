import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("persists workspace Translation Memory with a deterministic unique key", async () => {
  const [schema, migration, memory] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_tidy_azazel.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/nle/translation-memory.ts", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /translationMemories/);
  assert.match(schema, /idx_translation_memories_workspace_hash/);
  assert.match(migration, /CREATE TABLE `translation_memories`/);
  assert.match(migration, /CREATE UNIQUE INDEX `idx_translation_memories_workspace_hash`/);
  assert.match(memory, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(memory, /TRANSLATION_TEXT_LIMIT = 20_000/);
});

test("keeps translation provider calls behind a credential-aware adapter", async () => {
  const provider = await readFile(
    new URL("../lib/nle/translation-provider.ts", import.meta.url),
    "utf8",
  );

  assert.match(provider, /OPENAI_API_KEY/);
  assert.match(provider, /status: "unavailable"/);
  assert.match(provider, /reason: "missing_credential"/);
  assert.match(provider, /store: false/);
  assert.match(provider, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.doesNotMatch(provider, /mock|fallback translation|demo translation/i);
});

test("implements translate, remember, and list contracts without fabricated output", async () => {
  const [translations, remember] = await Promise.all([
    readFile(new URL("../app/api/translations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/translations/remember/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(translations, /export async function GET/);
  assert.match(translations, /export async function POST/);
  assert.match(translations, /export async function PUT/);
  assert.match(translations, /sourceText, sourceLanguage, and targetLanguage are required/);
  assert.match(translations, /source: "memory"/);
  assert.match(translations, /source: "provider"/);
  assert.match(translations, /source: "unavailable"/);
  assert.match(translations, /TRANSLATION_PROVIDER_UNAVAILABLE/);
  assert.match(remember, /translatedText/);
  assert.match(remember, /source: "manual"/);
  assert.match(remember, /source: "memory"/);
  assert.doesNotMatch(`${translations}\n${remember}`, /mock translation|fake translation/i);
});
