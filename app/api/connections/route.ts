import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { connectorAccounts, connectorEvents, workspaceEntitlements } from "../../../db/schema";
import { connectorCatalog, connectorIds, productBundles } from "../../../lib/product-catalog";
import { internalErrorResponse } from "../../../lib/api-errors";

const workspaceId = "nirva-workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

const storageNotReady = "Connector storage is being prepared. Please retry shortly.";

export async function GET() {
  try {
    const db = getDb();
    const accounts = await db
      .select()
      .from(connectorAccounts)
      .where(eq(connectorAccounts.workspaceId, workspaceId))
      .orderBy(desc(connectorAccounts.updatedAt));

    return Response.json({ accounts });
  } catch (error) {
    return internalErrorResponse("GET /api/connections", error, storageNotReady);
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
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const connectorId = typeof payload.connectorId === "string" ? payload.connectorId.trim() : "";
    const requestedName = typeof payload.accountName === "string" ? payload.accountName.trim() : "";

    if (!connectorIds.has(connectorId)) {
      return Response.json({ error: "a supported connectorId is required" }, { status: 400 });
    }

    const includesCredentials = Object.keys(payload).some((field) =>
      /(token|secret|credential|authorization)/i.test(field),
    );
    if (includesCredentials) {
      return Response.json(
        { error: "credentials are not accepted by this endpoint" },
        { status: 400 },
      );
    }

    const catalogEntry = connectorCatalog.find((connector) => connector.id === connectorId)!;
    const accountName = requestedName || `${catalogEntry.name} connection`;
    const db = getDb();
    const [entitlement] = await db
      .select()
      .from(workspaceEntitlements)
      .where(eq(workspaceEntitlements.workspaceId, workspaceId))
      .limit(1);
    const entitledConnectorIds = entitlement?.connectorIds ?? [...defaultBundle.connectorIds];
    if (!entitledConnectorIds.includes(connectorId)) {
      return Response.json(
        { error: `${catalogEntry.name} is not included in the active workspace solution` },
        { status: 403 },
      );
    }
    const now = new Date();
    const [existing] = await db
      .select()
      .from(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.workspaceId, workspaceId),
          eq(connectorAccounts.connectorId, connectorId),
        ),
      )
      .limit(1);

    const account = existing
      ? {
          ...existing,
          accountName,
          status: "setup_required" as const,
          externalAccountId: null,
          scopes: [] as string[],
          lastSyncedAt: null,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          workspaceId,
          connectorId,
          accountName,
          status: "setup_required" as const,
          externalAccountId: null,
          scopes: [] as string[],
          lastSyncedAt: null,
          createdAt: now,
          updatedAt: now,
        };

    const event = {
      id: crypto.randomUUID(),
      workspaceId,
      connectorAccountId: account.id,
      eventType: existing ? "connector.setup_restarted" : "connector.setup_requested",
      payload: {
        connectorId,
        accountName,
      },
      createdAt: now,
    };

    if (existing) {
      await db.batch([
        db
          .update(connectorAccounts)
          .set({
            accountName: account.accountName,
            status: account.status,
            externalAccountId: account.externalAccountId,
            scopes: account.scopes,
            lastSyncedAt: account.lastSyncedAt,
            updatedAt: account.updatedAt,
          })
          .where(eq(connectorAccounts.id, account.id)),
        db.insert(connectorEvents).values(event),
      ]);
    } else {
      await db.batch([
        db.insert(connectorAccounts).values(account),
        db.insert(connectorEvents).values(event),
      ]);
    }

    return Response.json({ account }, { status: existing ? 200 : 201 });
  } catch (error) {
    return internalErrorResponse("POST /api/connections", error, storageNotReady);
  }
}
