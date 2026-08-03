import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { solutionConfigs } from "../../../db/schema";
import { connectorIds, moduleIds, productBundles } from "../../../lib/product-catalog";

export async function GET() {
  try {
    const db = getDb();
    const solutions = await db.select().from(solutionConfigs).orderBy(desc(solutionConfigs.createdAt)).limit(12);
    return Response.json({ solutions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      bundleId?: string | null;
      moduleIds?: string[];
      connectorIds?: string[];
    };
    const name = payload.name?.trim() ?? "";
    const selectedModules = Array.from(new Set(payload.moduleIds ?? [])).filter((id) => moduleIds.has(id));
    const selectedConnectors = Array.from(new Set(payload.connectorIds ?? [])).filter((id) => connectorIds.has(id));
    const bundleId = productBundles.some((bundle) => bundle.id === payload.bundleId) ? payload.bundleId! : null;

    if (!name) return Response.json({ error: "name is required" }, { status: 400 });
    if (!selectedModules.length) return Response.json({ error: "at least one module is required" }, { status: 400 });

    const now = new Date();
    const solution = {
      id: crypto.randomUUID(),
      name,
      bundleId,
      moduleIds: selectedModules,
      connectorIds: selectedConnectors,
      status: "saved",
      createdAt: now,
      updatedAt: now,
    };
    const db = getDb();
    await db.insert(solutionConfigs).values(solution);
    return Response.json({ solution }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
