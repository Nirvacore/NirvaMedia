import { canonicalPublicationBlock } from "../../../../lib/mahasunyata/localization-guard";
import { and, eq, notExists } from "drizzle-orm";
import { getDb } from "../../../../db";
import { campaignPosts, publishJobs } from "../../../../db/schema";
import { canMoveContentStatus } from "../../../../lib/upstream-media-adapter";
import { internalErrorResponse } from "../../../../lib/api-errors";

// Schedule and publication state belongs to the publish queue, so a post can
// never claim a schedule or publication without a matching job and audit event.
function publishQueueRequired(error: string) {
  return Response.json({ error, code: "PUBLISH_QUEUE_REQUIRED" }, { status: 409 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
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
    const payload = (parsed !== null && typeof parsed === "object" ? parsed : {}) as { scheduledAt?: string; status?: string; canonical?: unknown };
    const scheduledAt = payload.scheduledAt?.trim() ?? "";
    const targetStatus = scheduledAt ? "scheduled" : payload.status?.trim() ?? "";
    if (!targetStatus) return Response.json({ error: "status or scheduledAt is required" }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select().from(campaignPosts).where(eq(campaignPosts.id, id)).limit(1);
    if (!existing) return Response.json({ error: "post not found" }, { status: 404 });
    if (["approved", "scheduled", "published"].includes(targetStatus)) {
      const blocked = canonicalPublicationBlock(existing.canonical ?? payload.canonical);
      if (blocked) return blocked;
    }
    if (Object.hasOwn(payload, "canonical")) {
      return Response.json({ error: "canonical association is immutable on saved posts; set it when creating the campaign" }, { status: 400 });
    }
    if (targetStatus === "scheduled") {
      return publishQueueRequired("schedule approved posts through POST /api/publish-jobs so the post, publish job and audit event are saved together");
    }
    if (targetStatus === "published") {
      return publishQueueRequired("published status is reserved for confirmed external publishing, which is not connected yet");
    }
    const [job] = await db.select({ id: publishJobs.id }).from(publishJobs).where(eq(publishJobs.postId, id)).limit(1);
    if (job) {
      return publishQueueRequired("this post has an active publish job; cancel it with POST /api/publish-jobs/:id/cancel first (re-timing is not available yet)");
    }
    if (!canMoveContentStatus(existing.status, targetStatus)) {
      return Response.json({
        error: `cannot transition post from ${existing.status} to ${targetStatus}`,
        source: "claude-upstream-status-flow",
      }, { status: 409 });
    }

    // Apply only to the state validated above and only while no publish job
    // exists, so a concurrent schedule cannot be overwritten or orphaned.
    const [post] = await db
      .update(campaignPosts)
      .set({
        status: targetStatus,
        // A legacy post scheduled without a job returns to approved unscheduled.
        ...(existing.status === "scheduled" && targetStatus === "approved" ? { scheduledAt: null } : {}),
      })
      .where(and(
        eq(campaignPosts.id, id),
        eq(campaignPosts.status, existing.status),
        notExists(db.select({ id: publishJobs.id }).from(publishJobs).where(eq(publishJobs.postId, id))),
      ))
      .returning();
    if (!post) {
      return Response.json({ error: "post changed while updating; reload and try again", code: "POST_STATE_CHANGED" }, { status: 409 });
    }

    return Response.json({ post, continuity: { source: "claude-upstream-status-flow" } });
  } catch (error) {
    return internalErrorResponse("PATCH /api/posts/:id", error, "Campaign storage is being prepared. Please retry shortly.");
  }
}
