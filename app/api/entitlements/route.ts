import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { solutionConfigs, workspaceEntitlements } from "../../../db/schema";
import { productBundles } from "../../../lib/product-catalog";

const workspaceId = "nirva-workspace";
const workspaceName = "Nirva Workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as { solutionConfigId?: string };
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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
