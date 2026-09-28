CREATE TRIGGER profile_weight_insert AFTER INSERT ON profiles WHEN NEW.weight_kg IS NOT NULL BEGIN
  INSERT INTO weight_logs(id,user_id,weight_kg) VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.weight_kg);
END;
--> statement-breakpoint
CREATE TRIGGER profile_weight_update AFTER UPDATE OF weight_kg ON profiles WHEN NEW.weight_kg IS NOT NULL AND NEW.weight_kg IS NOT OLD.weight_kg BEGIN
  INSERT INTO weight_logs(id,user_id,weight_kg) VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.weight_kg);
END;
--> statement-breakpoint
CREATE TRIGGER race_performance_insert AFTER INSERT ON races BEGIN
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date) VALUES('race-'||NEW.id,NEW.user_id,'RACE',NEW.id,NEW.distance_m,NEW.time_sec,NEW.date);
END;
--> statement-breakpoint
CREATE TRIGGER race_performance_update AFTER UPDATE ON races BEGIN
  DELETE FROM performance_log WHERE source='RACE' AND source_id=OLD.id;
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date) VALUES('race-'||NEW.id,NEW.user_id,'RACE',NEW.id,NEW.distance_m,NEW.time_sec,NEW.date);
END;
--> statement-breakpoint
CREATE TRIGGER race_performance_delete AFTER DELETE ON races BEGIN
  DELETE FROM performance_log WHERE source='RACE' AND source_id=OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER test_performance_insert AFTER INSERT ON tests BEGIN
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
  SELECT 'test-'||NEW.id,NEW.user_id,'TEST',NEW.id,
    CASE WHEN result_type='TIME' THEN distance_m ELSE NEW.distance_covered_m END,
    CASE WHEN result_type='TIME' THEN NEW.time_sec ELSE duration_sec END,NEW.date
  FROM test_types WHERE id=NEW.test_type_id
    AND (CASE WHEN result_type='TIME' THEN distance_m ELSE NEW.distance_covered_m END)>0
    AND (CASE WHEN result_type='TIME' THEN NEW.time_sec ELSE duration_sec END)>0;
END;
--> statement-breakpoint
CREATE TRIGGER test_performance_update AFTER UPDATE ON tests BEGIN
  DELETE FROM performance_log WHERE source='TEST' AND source_id=OLD.id;
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
  SELECT 'test-'||NEW.id,NEW.user_id,'TEST',NEW.id,
    CASE WHEN result_type='TIME' THEN distance_m ELSE NEW.distance_covered_m END,
    CASE WHEN result_type='TIME' THEN NEW.time_sec ELSE duration_sec END,NEW.date
  FROM test_types WHERE id=NEW.test_type_id
    AND (CASE WHEN result_type='TIME' THEN distance_m ELSE NEW.distance_covered_m END)>0
    AND (CASE WHEN result_type='TIME' THEN NEW.time_sec ELSE duration_sec END)>0;
END;
--> statement-breakpoint
CREATE TRIGGER test_performance_delete AFTER DELETE ON tests BEGIN
  DELETE FROM performance_log WHERE source='TEST' AND source_id=OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_performance_insert AFTER INSERT ON interval_reps BEGIN
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
  SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_performance_update AFTER UPDATE ON interval_reps BEGIN
  DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id=OLD.id;
  INSERT INTO performance_log(id,user_id,source,source_id,distance_m,time_sec,date)
  SELECT 'rep-'||NEW.id,NEW.user_id,'TRAINING_REP',NEW.id,NEW.distance_m,NEW.time_sec,date FROM interval_sessions WHERE id=NEW.session_id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_performance_delete AFTER DELETE ON interval_reps BEGIN
  DELETE FROM performance_log WHERE source='TRAINING_REP' AND source_id=OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER interval_date_update AFTER UPDATE OF date ON interval_sessions BEGIN
  UPDATE performance_log SET date=NEW.date WHERE source='TRAINING_REP' AND source_id IN (SELECT id FROM interval_reps WHERE session_id=NEW.id);
END;
