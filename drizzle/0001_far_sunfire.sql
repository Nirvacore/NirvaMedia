CREATE TABLE `solution_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bundle_id` text,
	`module_ids` text NOT NULL,
	`connector_ids` text NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_solution_configs_created_at` ON `solution_configs` (`created_at`);