import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { campaignPosts } from "../../../../db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { scheduledAt?: string };
    const scheduledAt = payload.scheduledAt?.trim() ?? "";
    if (!scheduledAt) return Response.json({ error: "scheduledAt is required" }, { status: 400 });

    const db = getDb();
    const [post] = await db
      .update(campaignPosts)
      .set({ scheduledAt, status: "scheduled" })
      .where(eq(campaignPosts.id, id))
      .returning();

    if (!post) return Response.json({ error: "post not found" }, { status: 404 });
    return Response.json({ post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
