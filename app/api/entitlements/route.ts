import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { solutionConfigs, workspaceEntitlements } from "../../../db/schema";
import { internalErrorResponse } from "../../../lib/api-errors";
import { productBundles } from "../../../lib/product-catalog";

const workspaceId = "nirva-workspace";
const workspaceName = "Nirva Workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;
const storageNotReady = "Entitlement storage is being prepared. Please retry shortly.";

function fallbackEntitlement() {
  return {
    workspaceId,
    workspaceName,
    solutionConfigId: null,
    bundleId: defaultBundle.id,
    moduleIds: [...defaultBundle.moduleIds],
    connectorIds: [...defaultBundle.connectorIds],
    status: "trial",
    activatedAt: null,
    updatedAt: null,
  };
}

export async function GET() {
  try {
    const db = getDb();
    const [entitlement] = await db.select().from(workspaceEntitlements).where(eq(workspaceEntitlements.workspaceId, workspaceId)).limit(1);
    return Response.json({ entitlement: entitlement ?? fallbackEntitlement() });
  } catch (error) {
    return internalErrorResponse("GET /api/entitlements", error, storageNotReady);
  }
}

export async function PUT(request: Request) {
  try {
    // Read the body first and parse it second: a failure while reading is
    // internal whatever error type the stream reports (the 500 below), and
    // only a syntax error in the bytes the client sent is malformed JSON.
    const bodyText = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ error: "request body must be valid JSON" }, { status: 400 });
      throw error;
    }
    // JSON that is not an object, null included, has none of the required input.
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as { solutionConfigId?: string };
    const solutionConfigId = payload.solutionConfigId?.trim() ?? "";
    if (!solutionConfigId) return Response.json({ error: "solutionConfigId is required" }, { status: 400 });

    const db = getDb();
    const [solution] = await db.select().from(solutionConfigs).where(eq(solutionConfigs.id, solutionConfigId)).limit(1);
    if (!solution) return Response.json({ error: "solution not found" }, { status: 404 });

    const now = new Date();
    const entitlement = {
      workspaceId,
      workspaceName,
      solutionConfigId: solution.id,
      bundleId: solution.bundleId,
      moduleIds: solution.moduleIds,
      connectorIds: solution.connectorIds,
      status: "active",
      activatedAt: now,
      updatedAt: now,
    };

    await db.insert(workspaceEntitlements).values(entitlement).onConflictDoUpdate({
      target: workspaceEntitlements.workspaceId,
      set: {
        solutionConfigId: entitlement.solutionConfigId,
        bundleId: entitlement.bundleId,
        moduleIds: entitlement.moduleIds,
        connectorIds: entitlement.connectorIds,
        status: entitlement.status,
        activatedAt: entitlement.activatedAt,
        updatedAt: entitlement.updatedAt,
      },
    });

    return Response.json({ entitlement });
  } catch (error) {
    return internalErrorResponse("PUT /api/entitlements", error, storageNotReady);
  }
}
