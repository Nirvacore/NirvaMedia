import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { solutionConfigs } from "../../../db/schema";
import { internalErrorResponse } from "../../../lib/api-errors";
import { connectorIds, moduleIds, productBundles } from "../../../lib/product-catalog";

const storageNotReady = "Solution storage is being prepared. Please retry shortly.";

export async function GET() {
  try {
    const db = getDb();
    const solutions = await db.select().from(solutionConfigs).orderBy(desc(solutionConfigs.createdAt)).limit(12);
    return Response.json({ solutions });
  } catch (error) {
    return internalErrorResponse("GET /api/solutions", error, storageNotReady);
  }
}
export async function POST(request: Request) {
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
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as {
      name?: unknown;
      bundleId?: string | null;
      moduleIds?: string[];
      connectorIds?: string[];
    };
    // Only a string can be a name; any other type is treated as a missing name.
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) return Response.json({ error: "name is required" }, { status: 400 });

    const selectedModules = Array.from(new Set(payload.moduleIds ?? [])).filter((id) => moduleIds.has(id));
    const selectedConnectors = Array.from(new Set(payload.connectorIds ?? [])).filter((id) => connectorIds.has(id));
    const bundleId = productBundles.some((bundle) => bundle.id === payload.bundleId) ? payload.bundleId! : null;

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
    return internalErrorResponse("POST /api/solutions", error, storageNotReady);
  }
}
