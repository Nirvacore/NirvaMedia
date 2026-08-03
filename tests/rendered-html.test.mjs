import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("server-renders the Nirva Media product page", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Nirva Media/);
  assert.match(page, /หนึ่งไอเดีย/);
  assert.match(page, /AI Content Operating System/);
  assert.match(page, /NIRVA LANGUAGE ENGINE/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the Campaign Studio continuation", async () => {
  const page = await readFile(new URL("../app/studio/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Campaign Studio/);
  assert.match(page, /Campaign brief/);
  assert.match(page, /Generated content/);
  assert.match(page, /Nirva AI connected/);
  assert.match(page, /fetch\("\/api\/campaigns"/);
  assert.match(page, /งานล่าสุด/);
});

test("removes starter preview dependencies and keeps product metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /NirvaMedia/);
  assert.match(page, /Language Engine/);
  assert.match(layout, /Nirva Media/);
  assert.match(layout, /images:\s*\[\{ url: "\/og\.png"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.deepEqual(await readdir(new URL("../app/_sites-preview/", import.meta.url)), []);
});

test("persists Campaign Studio work with D1 and versioned migrations", async () => {
  const [hosting, schema, campaignsRoute, postsRoute, migration] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/campaigns/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_giant_captain_britain.sql", import.meta.url), "utf8"),
  ]);

  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(schema, /campaigns/);
  assert.match(schema, /campaignPosts/);
  assert.match(campaignsRoute, /export async function (GET|POST)/);
  assert.match(campaignsRoute, /db\.batch/);
  assert.match(postsRoute, /status: "scheduled"/);
  assert.match(migration, /CREATE TABLE `campaigns`/);
  assert.match(migration, /CREATE TABLE `campaign_posts`/);
});
