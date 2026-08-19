import { describe, it, expect } from "vitest";
import {
  appendAuditLog,
  listAuditLogs,
} from "../db/index.ts";
import {
  getSsoStatus,
  getBillingSummary,
  recordAuditEvent,
} from "../enterprise/index.ts";

describe("audit logs", () => {
  it("appends and lists audit entries", () => {
    const id = appendAuditLog({
      tenantId: "tenant_nirva_default",
      action: "test.action",
      actor: "test@nirva.one",
      detail: "unit test",
    });
    expect(id).toMatch(/^audit_/);
    const logs = listAuditLogs({ tenantId: "tenant_nirva_default", limit: 5 });
    expect(logs.some((l) => l.id === id)).toBe(true);
  });

  it("recordAuditEvent delegates to appendAuditLog", () => {
    const id = recordAuditEvent({ action: "test.delegate", detail: "ok" });
    expect(id).toMatch(/^audit_/);
  });
});

describe("enterprise services", () => {
  it("returns SSO status", () => {
    const sso = getSsoStatus();
    expect(["oauth", "demo"]).toContain(sso.provider);
    expect(typeof sso.enabled).toBe("boolean");
  });

  it("returns billing summary for enterprise tenant", () => {
    const billing = getBillingSummary("tenant_nirva_default", "enterprise");
    expect(billing.planLabel).toBe("Enterprise");
    expect(billing.maxAgents).toBe(109);
    expect(typeof billing.todayCostUsd).toBe("number");
  });
});
