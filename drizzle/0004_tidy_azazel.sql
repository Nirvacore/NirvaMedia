CREATE TABLE `translation_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source_hash` text NOT NULL,
	`source_language` text NOT NULL,
	`target_language` text NOT NULL,
	`source_text` text NOT NULL,
	`translated_text` text NOT NULL,
	`source` text NOT NULL,
	`provider_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_translation_memories_workspace_hash` ON `translation_memories` (`workspace_id`,`source_hash`);--> statement-breakpoint
CREATE INDEX `idx_translation_memories_workspace_updated_at` ON `translation_memories` (`workspace_id`,`updated_at`);