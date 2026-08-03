CREATE TABLE `campaign_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`channel` text NOT NULL,
	`format` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`scheduled_at` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_campaign_posts_campaign_id` ON `campaign_posts` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_campaign_posts_status` ON `campaign_posts` (`status`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`brief` text NOT NULL,
	`language` text NOT NULL,
	`tone` text NOT NULL,
	`channels` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_created_at` ON `campaigns` (`created_at`);