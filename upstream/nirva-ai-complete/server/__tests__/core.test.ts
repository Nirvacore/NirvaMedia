import { describe, it, expect } from "vitest";
import { fallbackEmbedding, embeddingDimension } from "../memory/embeddings.ts";
import { buildRagContext } from "../memory/index.ts";
import { getWorkflowTemplates, WORKFLOW_TEMPLATES } from "../n8n/index.ts";

describe("embeddings", () => {
  it("produces normalized vectors of correct dimension", () => {
    const { vector } = { vector: fallbackEmbedding("hello world") };
    expect(vector).toHaveLength(embeddingDimension());
    const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("produces deterministic output for same input", () => {
    const a = fallbackEmbedding("test input");
    const b = fallbackEmbedding("test input");
    expect(a).toEqual(b);
  });

  it("produces different vectors for different inputs", () => {
    const a = fallbackEmbedding("hello");
    const b = fallbackEmbedding("world");
    expect(a).not.toEqual(b);
  });
});

describe("RAG context builder", () => {
  it("returns empty string for no results", () => {
    expect(buildRagContext([])).toBe("");
  });

  it("includes memory snippets when results exist", () => {
    const ctx = buildRagContext([
      { id: "1", agent: "DESK", title: "Prefs", content: "User likes Thai", source: "manual", score: 0.9, createdAt: "" },
    ]);
    expect(ctx).toContain("Relevant memory");
    expect(ctx).toContain("User likes Thai");
  });
});

describe("workflow templates", () => {
  it("has 6 pre-built templates", () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(6);
  });

  it("includes CODE → ARCH → SHIP pipeline", () => {
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === "code-arch-ship");
    expect(tpl?.agents).toContain("CODE");
    expect(tpl?.agents).toContain("ARCH");
    expect(tpl?.steps.length).toBeGreaterThan(2);
  });

  it("filters by category", () => {
    const ecosystem = getWorkflowTemplates("ecosystem");
    expect(ecosystem.every((t) => t.category === "ecosystem")).toBe(true);
    expect(ecosystem.length).toBeGreaterThan(0);
  });
});

describe("websocket broadcast", () => {
  it("broadcast does not throw when server not initialized", async () => {
    const { broadcast } = await import("../ws/index.ts");
    expect(() => broadcast({ type: "system_alert", payload: { test: true }, timestamp: new Date().toISOString() })).not.toThrow();
  });
});
