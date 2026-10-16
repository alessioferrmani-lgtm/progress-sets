DROP TRIGGER interval_date_update;--> statement-breakpoint
CREATE TABLE `__new_interval_reps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`rep_number` integer NOT NULL,
	`distance_m` real NOT NULL,
	`time_sec` real,
	`rest_sec` real,
	`rest_mode` text,
	`rest_distance_m` real,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interval_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_interval_reps`("id", "user_id", "session_id", "rep_number", "distance_m", "time_sec", "rest_sec", "rest_mode", "rest_distance_m", "notes", "created_at") SELECT "id", "user_id", "session_id", "rep_number", "distance_m", "time_sec", "rest_sec", NULL, NULL, NULL, "created_at" FROM `interval_reps`;--> statement-breakpoint
DROP TABLE `interval_reps`;--> statement-breakpoint
ALTER TABLE `__new_interval_reps` RENAME TO `interval_reps`;--> statement-breakpoint
CREATE INDEX `idx_interval_reps_owner_parent` ON `interval_reps` (`user_id`,`session_id`);--> statement-breakpoint
ALTER TABLE `interval_sessions` ADD `duration_sec` real;
--> statement-breakpoint
CREATE TRIGGER interval_performance_insert AFTER INSERT ON interval_reps WHEN NEW.time_sec > 0 BEGIN
 INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
 SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_performance_update AFTER UPDATE ON interval_reps BEGIN
 DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id=OLD.id;
 INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
 SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id AND NEW.time_sec > 0;
END;
--> statement-breakpoint
CREATE TRIGGER interval_performance_delete AFTER DELETE ON interval_reps BEGIN
 DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id=OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_date_update AFTER UPDATE OF date ON interval_sessions BEGIN
 UPDATE performance_log SET date=NEW.date WHERE source='TRAINING_REP' AND source_id IN (SELECT id FROM interval_reps WHERE session_id=NEW.id);
END;

