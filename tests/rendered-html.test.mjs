import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://nirvamedia.example${path}`, {
      headers: { accept: "text/html", host: "nirvamedia.example" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Nirva Media product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Nirva Media/);
  assert.match(html, /หนึ่งไอเดีย/);
  assert.match(html, /AI Content Operating System/);
  assert.match(html, /NIRVA LANGUAGE ENGINE/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("server-renders the Campaign Studio continuation", async () => {
  const response = await render("/studio");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Campaign Studio/);
  assert.match(html, /Campaign brief/);
  assert.match(html, /Generated content/);
  assert.match(html, /Nirva AI connected/);
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
