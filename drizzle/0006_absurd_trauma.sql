ALTER TABLE `interval_sessions` ADD `interval_kind` text;
--> statement-breakpoint
DROP TRIGGER interval_performance_insert;
--> statement-breakpoint
CREATE TRIGGER interval_performance_insert AFTER INSERT ON interval_reps WHEN NEW.time_sec > 0 BEGIN
 INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
 SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id AND COALESCE(interval_kind,'standard')='standard';
END;
--> statement-breakpoint
DROP TRIGGER interval_performance_update;
--> statement-breakpoint
CREATE TRIGGER interval_performance_update AFTER UPDATE ON interval_reps BEGIN
 DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id=OLD.id;
 INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
 SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id AND NEW.time_sec > 0 AND COALESCE(interval_kind,'standard')='standard';
END;
--> statement-breakpoint
CREATE TRIGGER interval_kind_update AFTER UPDATE OF interval_kind ON interval_sessions BEGIN
 DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id IN (SELECT id FROM interval_reps WHERE session_id=NEW.id);
 INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
 SELECT 'rep-'||id,user_id,'TRAINING_REP',id,distance_m,time_sec,NEW.date FROM interval_reps WHERE session_id=NEW.id AND time_sec>0 AND COALESCE(NEW.interval_kind,'standard')='standard';
END;

