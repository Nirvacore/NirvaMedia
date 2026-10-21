import { canonicalPublicationBlock } from "../../../../../lib/mahasunyata/localization-guard";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { campaignPosts, connectorEvents, publishJobs, workspaceEntitlements } from "../../../../../db/schema";
import { connectorChannels, productBundles } from "../../../../../lib/product-catalog";
import { CANCELLABLE_JOB_STATUSES, isCancellableJob } from "../../../../../lib/publish-queue";
import { internalErrorResponse } from "../../../../../lib/api-errors";

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

const route = "POST /api/publish-jobs/:id/cancel";
const storageNotReady = "Publishing storage is being prepared. Please retry shortly.";

function conflict(code: string, error: string, job: PublishJob | null, post: CampaignPost | null) {
  return Response.json({ error, code, job, post }, { status: 409 });
}

async function readJob(db: Database, jobId: string) {
  const [job] = await db
    .select()
    .from(publishJobs)
    .where(and(eq(publishJobs.id, jobId), eq(publishJobs.workspaceId, workspaceId)))
    .limit(1);
  return job ?? null;
}

/** The post as it is now, with the job currently linked to it (or null). The
 * requested job may be an older one, e.g. when an old cancel is retried after
 * the post was scheduled again, so clients must not infer queue state from it.
 * One statement reads both, so a schedule or cancel committing in between
 * cannot pair one moment's post status with another moment's job. The unique
 * post index allows at most one linked job. */
async function readPost(db: Database, postId: string) {
  const [row] = await db
    .select({ post: campaignPosts, linkedJobId: publishJobs.id, linkedJobStatus: publishJobs.status })
    .from(campaignPosts)
    .leftJoin(publishJobs, eq(publishJobs.postId, campaignPosts.id))
    .where(eq(campaignPosts.id, postId))
    .limit(1);
  if (!row) return null;
  const publishJob = row.linkedJobId !== null && row.linkedJobStatus !== null
    ? { id: row.linkedJobId, status: row.linkedJobStatus }
    : null;
  return { ...row.post, publishJob };
}

/** A detached cancelled job whose audit event names this post is a replay. */
async function cancelledFor(db: Database, job: PublishJob, postId: string) {
  if (job.status !== "cancelled" || job.postId !== null) return false;
  const [event] = await db
    .select({ id: connectorEvents.id })
    .from(connectorEvents)
    .where(and(
      eq(connectorEvents.workspaceId, workspaceId),
      eq(connectorEvents.eventType, "publish_job.cancelled"),
      sql`json_extract(${connectorEvents.payload}, '$.publishJobId') = ${job.id}`,
      sql`json_extract(${connectorEvents.payload}, '$.postId') = ${postId}`,
    ))
    .limit(1);
  return Boolean(event);
}

const notCancellable =
  "only an internal queue job of this post that has not started an external publish attempt can be cancelled";

/**
 * Cancels the internal queue job of a scheduled post. Nothing has been sent
 * externally: the job must still be `queued` or `blocked_auth` with zero
 * attempts. The audit event, the post's return to `approved` and the job's
 * cancellation are one D1 batch, and every write re-checks that state, so a
 * worker claim (lib/publish-queue.ts) and a cancel cannot both succeed.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobId } = await context.params;
    // Keep body-read failures in the outer 500 handler. Only malformed JSON
    // supplied by the client gets a fixed 400 without echoing parser text.
    const bodyText = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ error: "request body must be valid JSON" }, { status: 400 });
      throw error;
    }
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const postId = typeof payload.postId === "string" ? payload.postId.trim() : "";
    if (!postId) return Response.json({ error: "postId of the scheduled post is required" }, { status: 400 });

    // Cancelling is a Smart Publisher action on the job's connector, gated
    // exactly like scheduling.
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

    const job = await readJob(db, jobId);
    if (!job) return Response.json({ error: "publish job not found" }, { status: 404 });
    const connectorId = connectorForChannel.get(job.channel);
    const entitledConnectorIds = entitlement?.connectorIds ?? [...defaultBundle.connectorIds];
    if (!connectorId || !entitledConnectorIds.includes(connectorId)) {
      return Response.json({ error: `${job.channel} is not included in the active workspace solution` }, { status: 403 });
    }

    if (await cancelledFor(db, job, postId)) {
      return Response.json({ cancelled: true, replayed: true, job, post: await readPost(db, postId) });
    }
    if (job.postId !== postId || !isCancellableJob(job)) {
      return conflict("JOB_NOT_CANCELLABLE", notCancellable, job, await readPost(db, postId));
    }
    const post = await readPost(db, postId);
    if (!post) return Response.json({ error: "post not found" }, { status: 404 });
    // Returning to approved is an approval state, which canonical content
    // cannot reach without trusted human review.
    const blocked = canonicalPublicationBlock(post.canonical);
    if (blocked) return blocked;
    if (post.status !== "scheduled") {
      return conflict("POST_NOT_SCHEDULED", `only scheduled posts can cancel their queue job (current status: ${post.status})`, job, post);
    }

    const jobStillCancellable = and(
      eq(publishJobs.id, job.id),
      eq(publishJobs.postId, post.id),
      inArray(publishJobs.status, [...CANCELLABLE_JOB_STATUSES]),
      eq(publishJobs.attempts, 0),
    );
    const postStillScheduled = and(eq(campaignPosts.id, post.id), eq(campaignPosts.status, "scheduled"));
    const now = new Date();
    const event = {
      id: crypto.randomUUID(),
      workspaceId,
      connectorAccountId: job.connectorAccountId,
      // NULL unless the job and post are still in the state checked above, so
      // the NOT NULL constraint aborts the whole batch after a worker claim or
      // any other concurrent change.
      eventType: sql`(SELECT 'publish_job.cancelled' WHERE EXISTS (SELECT 1 FROM ${publishJobs} WHERE ${jobStillCancellable}) AND EXISTS (SELECT 1 FROM ${campaignPosts} WHERE ${postStillScheduled}))`,
      payload: {
        publishJobId: job.id,
        postId: post.id,
        channel: job.channel,
        connectorId,
        scheduledAt: job.scheduledAt?.toISOString() ?? null,
        jobStatusFrom: job.status,
        postStatusFrom: "scheduled",
        postStatusTo: "approved",
        externalAttempts: 0,
      },
      createdAt: now,
    };

    try {
      await db.batch([
        db.insert(connectorEvents).values(event),
        db.update(campaignPosts).set({ status: "approved", scheduledAt: null }).where(postStillScheduled),
        // Kept for audit, detached so the unique post guard allows a new schedule.
        db
          .update(publishJobs)
          .set({
            status: "cancelled",
            postId: null,
            lastError: `Cancelled before any external publish attempt; detached from post ${post.id}`,
            updatedAt: now,
          })
          .where(jobStillCancellable),
      ]);
    } catch (error) {
      // The batch rolled back as a unit; report whichever state won.
      const currentJob = await readJob(db, job.id);
      const currentPost = await readPost(db, post.id);
      if (currentJob && await cancelledFor(db, currentJob, post.id)) {
        return Response.json({ cancelled: true, replayed: true, job: currentJob, post: currentPost });
      }
      if (!currentJob || currentJob.postId !== post.id || !isCancellableJob(currentJob)) {
        return conflict("JOB_NOT_CANCELLABLE", notCancellable, currentJob, currentPost);
      }
      if (currentPost?.status !== "scheduled") {
        return conflict("POST_STATE_CHANGED", "post changed while cancelling; reload and try again", currentJob, currentPost);
      }
      throw error;
    }

    return Response.json({ cancelled: true, job: await readJob(db, job.id), post: await readPost(db, post.id) });
  } catch (error) {
    return internalErrorResponse(route, error, storageNotReady);
  }
}
