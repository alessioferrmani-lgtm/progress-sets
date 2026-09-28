CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`muscle_group` text,
	`equipment` text,
	`category` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exercises_user_name` ON `exercises` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `interval_reps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`rep_number` integer NOT NULL,
	`distance_m` real NOT NULL,
	`time_sec` real NOT NULL,
	`rest_sec` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interval_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_interval_reps_owner_parent` ON `interval_reps` (`user_id`,`session_id`);--> statement-breakpoint
CREATE TABLE `interval_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`signature` text,
	`notes` text,
	`calories_burned` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intervals_owner_date` ON `interval_sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `logged_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight_kg` real DEFAULT 0 NOT NULL,
	`reps` real DEFAULT 0 NOT NULL,
	`completed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`rest_taken_sec` real,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "set_values" CHECK("logged_sets"."weight_kg" >= 0 and "logged_sets"."reps" >= 0 and "logged_sets"."set_number" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_sets_owner_session` ON `logged_sets` (`user_id`,`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_set_identity` ON `logged_sets` (`session_id`,`exercise_id`,`set_number`);--> statement-breakpoint
CREATE TABLE `performance_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`distance_m` real NOT NULL,
	`time_sec` real NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_performance_source` ON `performance_log` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_performance_user_date` ON `performance_log` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_preferences_user_key` ON `preferences` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`height_cm` real,
	`weight_kg` real,
	`date_of_birth` text,
	`sex` text,
	`activity_level` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`sport` text,
	`duration_weeks` integer DEFAULT 1 NOT NULL,
	`current_week` integer DEFAULT 1 NOT NULL,
	`start_date` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_programs_user` ON `training_programs` (`user_id`);--> statement-breakpoint
CREATE TABLE `races` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`distance_m` real NOT NULL,
	`time_sec` real NOT NULL,
	`location` text,
	`placement` integer,
	`category` text,
	`avg_hr` real,
	`notes` text,
	`calories_burned` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_races_owner_date` ON `races` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`ended_at` text,
	`avg_hr` real,
	`rpe` real,
	`calories_burned` real,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "session_time_order" CHECK("workout_sessions"."ended_at" is null or "workout_sessions"."ended_at" >= "workout_sessions"."started_at")
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_time` ON `workout_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_open_guided_workout` ON `workout_sessions` (`user_id`,`template_id`) WHERE "workout_sessions"."ended_at" is null and "workout_sessions"."template_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_open_free_workout` ON `workout_sessions` (`user_id`) WHERE "workout_sessions"."ended_at" is null and "workout_sessions"."template_id" is null;--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`objective` text,
	`rir` text,
	`alternative` text,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`target_reps` real,
	`reps_type` text DEFAULT 'count' NOT NULL,
	`reps_display` text,
	`target_weight_kg` real,
	`rest_seconds` integer DEFAULT 90 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_template_exercises_owner_parent` ON `template_exercises` (`user_id`,`template_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`program_id` text,
	`program_week` integer,
	`session_key` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `training_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_templates_user` ON `workout_templates` (`user_id`);--> statement-breakpoint
CREATE TABLE `test_types` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`result_type` text NOT NULL,
	`distance_m` real,
	`duration_sec` real,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_test_types_user` ON `test_types` (`user_id`);--> statement-breakpoint
CREATE TABLE `tests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`test_type_id` text NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`time_sec` real,
	`distance_covered_m` real,
	`avg_hr` real,
	`weather` text,
	`notes` text,
	`observations` text,
	`calories_burned` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`test_type_id`) REFERENCES `test_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_tests_owner_type_date` ON `tests` (`user_id`,`test_type_id`,`date`);--> statement-breakpoint
CREATE TABLE `weight_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weight_kg` real NOT NULL,
	`logged_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_weight_logs_user_time` ON `weight_logs` (`user_id`,`logged_at`);