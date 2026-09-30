ALTER TABLE `logged_sets` ADD `side` text DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE `logged_sets` ADD `reps_type` text DEFAULT 'count' NOT NULL;--> statement-breakpoint
ALTER TABLE `logged_sets` ADD `duration_sec` real;--> statement-breakpoint
ALTER TABLE `logged_sets` ADD `distance_m` real;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `is_unilateral` integer DEFAULT false NOT NULL;