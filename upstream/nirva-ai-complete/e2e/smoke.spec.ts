import { test, expect } from "@playwright/test";

test.describe("Nirva Dashboard smoke tests", () => {
  test("home page loads with ecosystem branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("109 Agents. One Garden.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nirva Ecosystem" })).toBeVisible();
  });

  test("agents directory shows 109 agents", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByRole("button", { name: /ทั้งหมด \(109\)/ })).toBeVisible({ timeout: 10_000 });
  });

  test("ecosystem page loads", async ({ page }) => {
    await page.goto("/ecosystem");
    await expect(page.getByRole("heading", { name: "Nirva Ecosystem" })).toBeVisible();
    await expect(page.getByText("Nirva AI Core")).toBeVisible();
    await expect(page.getByText("Nirvaprocure")).toBeVisible();
  });

  test("workflows page shows templates", async ({ page }) => {
    await page.goto("/workflows");
    await expect(page.getByText("CODE → ARCH → SHIP")).toBeVisible();
  });

  test("API health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("API metrics endpoint responds", async ({ request }) => {
    await request.get("/api/health");
    const res = await request.get("/api/metrics");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.totalRequests).toBeGreaterThanOrEqual(0);
  });

  test("API auth endpoint responds", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("authenticated");
    expect(data).toHaveProperty("mode");
  });

  test("marketplace page loads curated packs", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible();
    await expect(page.getByText("Full-Stack Builder Pack")).toBeVisible({ timeout: 10_000 });
  });

  test("API marketplace endpoint responds", async ({ request }) => {
    const res = await request.get("/api/marketplace");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.listings.length).toBeGreaterThan(0);
    expect(data.stats.total).toBeGreaterThan(0);
  });

  test("organization page loads", async ({ page }) => {
    await page.goto("/organization");
    await expect(page.getByRole("heading", { name: "AI Organization" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Control Tower" })).toBeVisible();
  });

  test("API router analyzes intent", async ({ request }) => {
    const res = await request.post("/api/router/analyze", {
      data: { message: "สร้างระบบขายออนไลน์" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.agents).toContain("DESK");
    expect(data.confidence).toBeGreaterThan(0);
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Organization Reports" })).toBeVisible();
  });

  test("plugins page loads", async ({ page }) => {
    await page.goto("/plugins");
    await expect(page.getByRole("heading", { name: "Agent Plugins" })).toBeVisible({ timeout: 10_000 });
  });

  test("API tenants endpoint responds", async ({ request }) => {
    const res = await request.get("/api/tenants");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.tenants.length).toBeGreaterThanOrEqual(3);
  });

  test("API plugins endpoint responds", async ({ request }) => {
    const res = await request.get("/api/plugins");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.installed.length).toBeGreaterThan(0);
  });

  test("API OpenAPI spec responds", async ({ request }) => {
    const res = await request.get("/api/openapi.json");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.openapi).toBe("3.1.0");
    expect(data.info.version).toBe("0.11.0");
    expect(data.paths["/router/analyze"]).toBeDefined();
  });

  test("API docs page loads Swagger UI", async ({ request }) => {
    const res = await request.get("/api/docs");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("swagger-ui");
  });

  test("docs page loads", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: "API & Developer Tools" })).toBeVisible({ timeout: 10_000 });
  });

  test("demo hub page loads", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: /ดูตัวอย่าง/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Swagger UI")).toBeVisible();
  });

  test("API router classifier endpoint responds", async ({ request }) => {
    const res = await request.get("/api/router/classifier");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.methods).toContain("keyword");
    expect(data.methods).toContain("llm");
  });

  test("API model orchestration routes ERP to premium", async ({ request }) => {
    const res = await request.post("/api/orchestration/route", {
      data: { message: "สร้างระบบ ERP ใหม่ architecture", agent: "ARCH" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.recommendedTier).toBe("premium");
    expect(data.model.name).toBeTruthy();
  });

  test("orchestration page loads", async ({ page }) => {
    await page.goto("/orchestration");
    await expect(page.getByRole("heading", { name: "ROUTER — AI Resource Manager" })).toBeVisible({ timeout: 10_000 });
  });

  test("API orchestration recent returns history", async ({ request }) => {
    await request.post("/api/orchestration/route", {
      data: { message: "เขียน test", agent: "CODE" },
    });
    const res = await request.get("/api/orchestration/recent?limit=5");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.recent)).toBeTruthy();
    expect(data.recent.length).toBeGreaterThan(0);
  });

  test("API chat returns modelRouting when orchestration enabled", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: {
        message: "สร้างระบบ ERP architecture",
        agent: "ARCH",
        useOrchestration: true,
        useMemory: false,
      },
    });
    const data = await res.json();
    if (res.ok()) {
      expect(data.modelRouting).toBeTruthy();
      expect(data.modelRouting.recommendedTier).toBe("premium");
    } else {
      expect(data.error?.code).toBe("OLLAMA_UNAVAILABLE");
      expect(data.fallback).toBe(true);
    }
  });
});
