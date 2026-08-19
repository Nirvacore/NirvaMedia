import { describe, it, expect } from "vitest";
import { getOpenApiSpec, OPENAPI_VERSION } from "../../server/openapi/spec.ts";
import { getClassifierInfo } from "../../server/router/classifier.ts";
import { analyzeIntent } from "../../server/router/index.ts";

describe("OpenAPI spec", () => {
  it("exports valid OpenAPI 3.1 document", () => {
    const spec = getOpenApiSpec("/api");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.version).toBe(OPENAPI_VERSION);
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/router/analyze"]).toBeDefined();
    expect(spec.paths["/openapi.json"]).toBeUndefined();
  });

  it("documents tenant and plugin endpoints", () => {
    const spec = getOpenApiSpec("/api");
    expect(spec.paths["/tenants"]).toBeDefined();
    expect(spec.paths["/plugins"]).toBeDefined();
    expect(spec.components.schemas.RouteAnalysis).toBeDefined();
  });
});

describe("LLM classifier info", () => {
  it("lists keyword and llm methods", () => {
    const info = getClassifierInfo();
    expect(info.methods).toContain("keyword");
    expect(info.methods).toContain("llm");
    expect(info.pipelines.length).toBeGreaterThan(5);
  });
});

describe("router classifierMethod field", () => {
  it("keyword analysis includes classifierMethod", () => {
    const result = analyzeIntent("build REST API with typescript");
    expect(result.classifierMethod).toBe("keyword");
    expect(result.intent).toBe("build-software");
  });
});
