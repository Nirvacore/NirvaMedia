-- The earlier two-request Studio flow could enqueue one post more than once.
-- Keep the earliest job attached to each post. Later duplicates are detached
-- rather than deleted, pending ones are failed so they can never publish, and
-- every change is audited before the unique guard is created.
INSERT INTO `connector_events` (`id`, `workspace_id`, `connector_account_id`, `event_type`, `payload`, `created_at`)
SELECT 'migration-0006-' || `id`, `workspace_id`, `connector_account_id`, 'publish_job.duplicate_detached',
	json_object('publishJobId', `id`, 'postId', `post_id`, 'previousStatus', `status`, 'migration', '0006_publish_job_post_guard'),
	CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM `publish_jobs`
WHERE `post_id` IS NOT NULL AND EXISTS (
	SELECT 1 FROM `publish_jobs` AS `keeper`
	WHERE `keeper`.`post_id` = `publish_jobs`.`post_id`
		AND (`keeper`.`created_at` < `publish_jobs`.`created_at`
			OR (`keeper`.`created_at` = `publish_jobs`.`created_at` AND `keeper`.`id` < `publish_jobs`.`id`))
);--> statement-breakpoint
UPDATE `publish_jobs` SET
	`status` = CASE WHEN `status` IN ('queued', 'blocked_auth') THEN 'failed' ELSE `status` END,
	`last_error` = 'Duplicate publish job for post ' || `post_id` || ' detached by migration 0006',
	`post_id` = NULL,
	`updated_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE `post_id` IS NOT NULL AND EXISTS (
	SELECT 1 FROM `publish_jobs` AS `keeper`
	WHERE `keeper`.`post_id` = `publish_jobs`.`post_id`
		AND (`keeper`.`created_at` < `publish_jobs`.`created_at`
			OR (`keeper`.`created_at` = `publish_jobs`.`created_at` AND `keeper`.`id` < `publish_jobs`.`id`))
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_publish_jobs_post_id` ON `publish_jobs` (`post_id`);
