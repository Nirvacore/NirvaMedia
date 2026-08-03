CREATE TABLE `workspace_entitlements` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`workspace_name` text NOT NULL,
	`solution_config_id` text,
	`bundle_id` text,
	`module_ids` text NOT NULL,
	`connector_ids` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`activated_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`solution_config_id`) REFERENCES `solution_configs`(`id`) ON UPDATE no action ON DELETE set null
);
