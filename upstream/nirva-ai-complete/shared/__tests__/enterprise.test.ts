import { describe, it, expect } from "vitest";
import {
  DEPLOYMENT_TEMPLATES,
  ERP_CONNECTOR_IDS,
  getErpConnectorCatalog,
  getPlanPricing,
  AUDIT_ACTIONS,
} from "../enterprise.ts";

describe("enterprise catalog", () => {
  it("has 3 deployment templates", () => {
    expect(DEPLOYMENT_TEMPLATES).toHaveLength(3);
    expect(DEPLOYMENT_TEMPLATES.map((t) => t.id)).toEqual(["manus", "contabo", "docker-local"]);
  });

  it("lists ERP connectors from ecosystem", () => {
    const connectors = getErpConnectorCatalog();
    expect(connectors.length).toBe(ERP_CONNECTOR_IDS.length);
    expect(connectors.some((c) => c.id === "nirvaprocure")).toBe(true);
  });

  it("maps enterprise plan pricing", () => {
    const { brainPlan, limits } = getPlanPricing("enterprise");
    expect(brainPlan.id).toBe("enterprise");
    expect(limits.maxAgents).toBe(109);
  });

  it("defines audit action constants", () => {
    expect(AUDIT_ACTIONS.WORKSPACE_EXECUTE).toBe("workspace.execute");
    expect(AUDIT_ACTIONS.MORNING_EXECUTE).toBe("morning.execute");
  });
});
