import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  connectorAccounts,
  connectorEvents,
  publishJobs,
  workspaceEntitlements,
} from "../../../db/schema";
import {
  connectorChannels,
  productBundles,
} from "../../../lib/product-catalog";

const workspaceId = "nirva-workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

const connectorForChannel = new Map(
  Object.entries(connectorChannels).flatMap(([connectorId, channels]) =>
    channels.map((channel) => [channel, connectorId] as const),
  ),
);

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "Publishing storage is being prepared. Please retry shortly.";
  }
  return message;
}

function parseScheduledAt(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET() {
  try {
    const db = getDb();
    const jobs = await db
      .select()
      .from(publishJobs)
      .where(eq(publishJobs.workspaceId, workspaceId))
      .orderBy(desc(publishJobs.createdAt))
      .limit(50);

    return Response.json({ jobs });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const channel = typeof payload.channel === "string" ? payload.channel.trim() : "";
    const connectorId = connectorForChannel.get(channel);
    if (!connectorId) {
      return Response.json({ error: "a supported channel is required" }, { status: 400 });
    }

    const scheduledAt = parseScheduledAt(payload.scheduledAt);
    if (scheduledAt === undefined) {
      return Response.json({ error: "scheduledAt must be a valid date" }, { status: 400 });
    }

    const db = getDb();
    const [entitlement] = await db
      .select()
      .from(workspaceEntitlements)
      .where(eq(workspaceEntitlements.workspaceId, workspaceId))
      .limit(1);
    const entitledConnectorIds = entitlement?.connectorIds ?? [...defaultBundle.connectorIds];
    if (!entitledConnectorIds.includes(connectorId)) {
      return Response.json(
        { error: `${channel} is not included in the active workspace solution` },
        { status: 403 },
      );
    }

    const requestedAccountId =
      typeof payload.connectorAccountId === "string" ? payload.connectorAccountId.trim() : "";
    const postId = typeof payload.postId === "string" ? payload.postId.trim() || null : null;
    const accountConditions = [
      eq(connectorAccounts.workspaceId, workspaceId),
      eq(connectorAccounts.connectorId, connectorId),
      eq(connectorAccounts.status, "connected"),
    ];
    if (requestedAccountId) {
      accountConditions.push(eq(connectorAccounts.id, requestedAccountId));
    }
    const [connectedAccount] = await db
      .select()
      .from(connectorAccounts)
      .where(and(...accountConditions))
      .limit(1);

    const now = new Date();
    const job = {
      id: crypto.randomUUID(),
      workspaceId,
      postId,
      connectorAccountId: connectedAccount?.id ?? null,
      channel,
      status: connectedAccount ? ("queued" as const) : ("blocked_auth" as const),
      scheduledAt,
      attempts: 0,
      lastError: connectedAccount ? null : `Connect ${connectorId} before publishing`,
      createdAt: now,
      updatedAt: now,
    };
    const event = {
      id: crypto.randomUUID(),
      workspaceId,
      connectorAccountId: job.connectorAccountId,
      eventType: connectedAccount ? "publish_job.queued" : "publish_job.blocked_auth",
      payload: {
        publishJobId: job.id,
        postId: job.postId,
        channel,
        connectorId,
        scheduledAt: scheduledAt?.toISOString() ?? null,
      },
      createdAt: now,
    };

    await db.batch([
      db.insert(publishJobs).values(job),
      db.insert(connectorEvents).values(event),
    ]);

    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
