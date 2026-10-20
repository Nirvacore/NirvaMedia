import { canonicalPublicationBlock } from "../../../lib/mahasunyata/localization-guard";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  campaignPosts,
  connectorAccounts,
  connectorEvents,
  publishJobs,
  workspaceEntitlements,
} from "../../../db/schema";
import {
  connectorChannels,
  productBundles,
} from "../../../lib/product-catalog";
import { internalErrorResponse } from "../../../lib/api-errors";

const workspaceId = "nirva-workspace";
const defaultBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

const connectorForChannel = new Map(
  Object.entries(connectorChannels).flatMap(([connectorId, channels]) =>
    channels.map((channel) => [channel, connectorId] as const),
  ),
);

type Database = ReturnType<typeof getDb>;
type CampaignPost = typeof campaignPosts.$inferSelect;
type PublishJob = typeof publishJobs.$inferSelect;

const storageNotReady = "Publishing storage is being prepared. Please retry shortly.";

function parseScheduledAt(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function sameInstant(stored: string | null, expected: Date) {
  return stored !== null && Date.parse(stored) === expected.getTime();
}

/** `job` is present (possibly null) only when this request read the queue, so
 * clients can tell "no job" from "not checked". */
function conflict(code: string, error: string, post: CampaignPost | null, job?: PublishJob | null) {
  return Response.json({ error, code, post, ...(job === undefined ? {} : { job }) }, { status: 409 });
}

/** A retry of the same schedule returns the job that already exists. Any other
 * request would re-time or re-route a queued post, which is not available yet. */
function replayOrConflict(post: CampaignPost, job: PublishJob, channel: string, scheduledAt: Date) {
  const replay =
    post.status === "scheduled" &&
    post.channel === channel &&
    job.channel === channel &&
    job.scheduledAt?.getTime() === scheduledAt.getTime() &&
    sameInstant(post.scheduledAt, scheduledAt);
  if (replay) return Response.json({ job, post, replayed: true });
  return conflict(
    "PUBLISH_JOB_EXISTS",
    "post already has a publish job for a different channel or schedule; re-timing queued posts is not available yet",
    post,
    job,
  );
}

async function currentState(db: Database, postId: string) {
  // One statement reads the post and the job linked to it, so a cancel or
  // schedule committing meanwhile cannot pair two moments.
  const [row] = await db
    .select({ post: campaignPosts, job: publishJobs })
    .from(campaignPosts)
    .leftJoin(publishJobs, eq(publishJobs.postId, campaignPosts.id))
    .where(eq(campaignPosts.id, postId))
    .limit(1);
  if (row) return { post: row.post, job: row.job ?? null };
  // Without a post there is no pair to keep consistent; report any job still
  // pointing at the id, as before.
  const [job] = await db.select().from(publishJobs).where(eq(publishJobs.postId, postId)).limit(1);
  return { post: null, job: job ?? null };
}

export async function GET() {
  try {
    const db = getDb();
    const jobs = await db
      .select()
      .from(publishJobs)
      .where(eq(publishJobs.workspaceId, workspaceId))
      // Newest first; the unique id breaks creation-time ties so the same 50
      // jobs are listed whichever plan SQLite uses.
      .orderBy(desc(publishJobs.createdAt), asc(publishJobs.id))
      .limit(50);

    return Response.json({ jobs });
  } catch (error) {
    return internalErrorResponse("GET /api/publish-jobs", error, storageNotReady);
  }
}

/**
 * Schedules a saved, approved post. The post status and schedule, the publish
 * job and its audit event are written in one D1 batch, so none of them can
 * exist without the others.
 */
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
    const entitledModuleIds = entitlement?.moduleIds ?? [...defaultBundle.moduleIds];
    if (!entitledModuleIds.includes("smart-publisher")) {
      return Response.json(
        { error: "Smart Publisher is not included in the active workspace solution", code: "MODULE_NOT_ENTITLED" },
        { status: 403 },
      );
    }
    const entitledConnectorIds = entitlement?.connectorIds ?? [...defaultBundle.connectorIds];
    if (!entitledConnectorIds.includes(connectorId)) {
      return Response.json(
        { error: `${channel} is not included in the active workspace solution` },
        { status: 403 },
      );
    }

    const payloadBlock = canonicalPublicationBlock(payload.canonical);
    if (payloadBlock) return payloadBlock;

    // The saved post, not the caller, is the source of truth for channel,
    // approval and schedule.
    const postId = typeof payload.postId === "string" ? payload.postId.trim() : "";
    if (!postId) {
      return Response.json({ error: "postId of a saved, approved post is required" }, { status: 400 });
    }
    const [post] = await db.select().from(campaignPosts).where(eq(campaignPosts.id, postId)).limit(1);
    if (!post) return Response.json({ error: "post not found" }, { status: 404 });
    const blocked = canonicalPublicationBlock(post.canonical);
    if (blocked) return blocked;
    if (post.channel !== channel) return Response.json({ error: "channel must match the saved post" }, { status: 400 });
    if (post.status !== "approved" && post.status !== "scheduled") {
      return conflict("POST_NOT_APPROVED", `post must be approved before scheduling (current status: ${post.status})`, post);
    }
    if (!scheduledAt) {
      return Response.json({ error: "scheduledAt is required to schedule a post" }, { status: 400 });
    }

    const [existingJob] = await db.select().from(publishJobs).where(eq(publishJobs.postId, post.id)).limit(1);
    if (existingJob) return replayOrConflict(post, existingJob, channel, scheduledAt);

    // The earlier two-request flow could schedule a post without queueing it.
    // Retrying that exact schedule repairs the missing job; any other time
    // would be a re-time.
    const storedSchedule = post.status === "scheduled" ? post.scheduledAt : null;
    if (post.status === "scheduled" && !sameInstant(storedSchedule, scheduledAt)) {
      return conflict(
        "SCHEDULE_MISMATCH",
        "post is already scheduled for a different time; re-timing is not available yet",
        post,
        null,
      );
    }
    const scheduledIso = storedSchedule ?? scheduledAt.toISOString();

    const requestedAccountId =
      typeof payload.connectorAccountId === "string" ? payload.connectorAccountId.trim() : "";
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
      postId: post.id,
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
        postId: post.id,
        channel,
        connectorId,
        scheduledAt: scheduledAt.toISOString(),
        postStatusFrom: post.status,
        postStatusTo: "scheduled",
      },
      createdAt: now,
    };

    // The job copies its channel from the post row inside the transaction. If
    // the post is no longer scheduled for this channel and time, the value is
    // NULL, the NOT NULL constraint aborts the batch and nothing is written.
    // The unique post index rejects a second job for the same post.
    const insertJob = db.insert(publishJobs).values({
      ...job,
      channel: sql`(SELECT ${campaignPosts.channel} FROM ${campaignPosts} WHERE ${campaignPosts.id} = ${post.id} AND ${campaignPosts.status} = 'scheduled' AND ${campaignPosts.channel} = ${channel} AND ${campaignPosts.scheduledAt} = ${scheduledIso})`,
    });
    const insertEvent = db.insert(connectorEvents).values(event);
    try {
      if (post.status === "approved") {
        await db.batch([
          db
            .update(campaignPosts)
            .set({ status: "scheduled", scheduledAt: scheduledIso })
            .where(and(eq(campaignPosts.id, post.id), eq(campaignPosts.status, "approved"))),
          insertJob,
          insertEvent,
        ]);
      } else {
        await db.batch([insertJob, insertEvent]);
      }
    } catch (error) {
      // The batch rolled back as a unit; report whichever state won.
      const current = await currentState(db, post.id);
      if (current.post && current.job) return replayOrConflict(current.post, current.job, channel, scheduledAt);
      if (
        current.post?.status !== post.status ||
        current.post?.channel !== post.channel ||
        current.post?.scheduledAt !== post.scheduledAt
      ) {
        return conflict("POST_STATE_CHANGED", "post changed while scheduling; reload and try again", current.post, current.job);
      }
      throw error;
    }

    return Response.json(
      { job, post: { ...post, status: "scheduled", scheduledAt: scheduledIso } },
      { status: 201 },
    );
  } catch (error) {
    return internalErrorResponse("POST /api/publish-jobs", error, storageNotReady);
  }
}
