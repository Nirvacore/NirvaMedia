CREATE TABLE `connector_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`account_name` text NOT NULL,
	`status` text DEFAULT 'setup_required' NOT NULL,
	`external_account_id` text,
	`scopes` text NOT NULL,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_connector_accounts_workspace_connector` ON `connector_accounts` (`workspace_id`,`connector_id`);--> statement-breakpoint
CREATE TABLE `connector_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_account_id` text,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_connector_events_workspace_created_at` ON `connector_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `publish_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`post_id` text,
	`connector_account_id` text,
	`channel` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`scheduled_at` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connector_account_id`) REFERENCES `connector_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_publish_jobs_workspace_status` ON `publish_jobs` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_publish_jobs_scheduled_at` ON `publish_jobs` (`scheduled_at`);