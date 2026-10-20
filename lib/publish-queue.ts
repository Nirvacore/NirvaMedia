import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { getDb } from "../db";
import { publishJobs, type PublishJobStatus } from "../db/schema";

type Database = ReturnType<typeof getDb>;

/**
 * Internal publish-queue contract shared by cancellation and any future
 * publishing worker. No worker runs today and nothing is sent to external
 * platforms; this fixes how the two sides exclude each other once one exists.
 *
 * - A job is internal-only while `attempts = 0`: no external attempt has ever
 *   started, so cancelling it cannot leave a partial post on a platform.
 * - A future worker must reserve a job with `claimPublishJobQuery` before any
 *   external call. Reservation moves `queued` to `publishing` and increments
 *   attempts atomically, so a second worker cannot reserve an in-flight job,
 *   even after reading the new attempt count. The cancel batch competes on
 *   the same row and exactly one of the two operations wins.
 * - No worker or retry/recovery transition runs today. A later retry must
 *   explicitly move a finished attempt back to `queued` under review.
 * - Cancelled jobs are kept for audit but detached from their post
 *   (`post_id = NULL`), so the unique post guard allows a new schedule.
 */
export const CANCELLABLE_JOB_STATUSES = ["queued", "blocked_auth"] as const satisfies readonly PublishJobStatus[];

export function isCancellableJob(job: { status: string; attempts: number; postId: string | null }) {
  return job.postId !== null && job.attempts === 0 && (CANCELLABLE_JOB_STATUSES as readonly string[]).includes(job.status);
}

/** Reserves one external attempt for a queued job. Only a job still linked to
 * a post, still `queued` and still at the count the worker read can be
 * reserved. `publishing` prevents another claim until a future completion or
 * retry flow explicitly changes that state. */
export function claimPublishJobQuery(db: Database, jobId: string, expectedAttempts: number) {
  return db
    .update(publishJobs)
    .set({ status: "publishing", attempts: sql`${publishJobs.attempts} + 1`, updatedAt: new Date() })
    .where(and(
      eq(publishJobs.id, jobId),
      eq(publishJobs.status, "queued"),
      eq(publishJobs.attempts, expectedAttempts),
      isNotNull(publishJobs.postId),
    ))
    .returning({ id: publishJobs.id });
}

export async function claimPublishJob(db: Database, jobId: string, expectedAttempts: number) {
  const claimed = await claimPublishJobQuery(db, jobId, expectedAttempts);
  return claimed.length === 1;
}
