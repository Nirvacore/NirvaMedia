import { canonicalPublicationBlock } from "../../../../lib/mahasunyata/localization-guard";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { campaignPosts } from "../../../../db/schema";
import { canMoveContentStatus } from "../../../../lib/upstream-media-adapter";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { scheduledAt?: string; status?: string; canonical?: unknown };
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
    if (!canMoveContentStatus(existing.status, targetStatus)) {
      return Response.json({
        error: `cannot transition post from ${existing.status} to ${targetStatus}`,
        source: "claude-upstream-status-flow",
      }, { status: 409 });
    }

    const [post] = await db
      .update(campaignPosts)
      .set({
        status: targetStatus,
        ...(scheduledAt ? { scheduledAt } : {}),
      })
      .where(eq(campaignPosts.id, id))
      .returning();

    return Response.json({ post, continuity: { source: "claude-upstream-status-flow" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
