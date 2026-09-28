import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const owner = () => text("user_id").notNull();
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const created = () => text("created_at").notNull().default(now);
const updated = () => text("updated_at").notNull().default(now);
const date = () => text("date").notNull().default(sql`(date('now'))`);

export const appMeta = sqliteTable("app_meta", { key: text("key").primaryKey(), value: text("value").notNull() });
export const profiles = sqliteTable("profiles", {
  user_id: owner().primaryKey(), display_name: text("display_name"), height_cm: real("height_cm"),
  weight_kg: real("weight_kg"), date_of_birth: text("date_of_birth"), sex: text("sex"),
  activity_level: text("activity_level"), created_at: created(), updated_at: updated(),
});
export const weightLogs = sqliteTable("weight_logs", {
  id: id(), user_id: owner(), weight_kg: real("weight_kg").notNull(), logged_at: text("logged_at").notNull().default(now),
}, t => [index("idx_weight_logs_user_time").on(t.user_id, t.logged_at)]);
export const exercises = sqliteTable("exercises", {
  id: id(), user_id: text("user_id"), name: text("name").notNull(), muscle_group: text("muscle_group"),
  equipment: text("equipment"), category: text("category"), is_default: integer("is_default", {mode:"boolean"}).notNull().default(false), created_at: created(),
}, t => [index("idx_exercises_user_name").on(t.user_id, t.name)]);
export const programs = sqliteTable("training_programs", {
  id:id(), user_id:owner(), name:text("name").notNull(), sport:text("sport"), duration_weeks:integer("duration_weeks").notNull().default(1),
  current_week:integer("current_week").notNull().default(1), start_date:text("start_date"), created_at:created(), updated_at:updated(),
}, t=>[index("idx_programs_user").on(t.user_id)]);
export const templates = sqliteTable("workout_templates", {
  id:id(), user_id:owner(), name:text("name").notNull(), program_id:text("program_id").references(()=>programs.id,{onDelete:"cascade"}),
  program_week:integer("program_week"), session_key:text("session_key"), created_at:created(), updated_at:updated(),
},t=>[index("idx_templates_user").on(t.user_id)]);
export const templateExercises = sqliteTable("template_exercises", {
  id:id(),user_id:owner(),template_id:text("template_id").notNull().references(()=>templates.id,{onDelete:"cascade"}),
  exercise_id:text("exercise_id").notNull().references(()=>exercises.id,{onDelete:"restrict"}),order_index:integer("order_index").notNull().default(0),
  objective:text("objective"),rir:text("rir"),alternative:text("alternative"), target_sets:integer("target_sets").notNull().default(3),
  target_reps:real("target_reps"), reps_type:text("reps_type").notNull().default("count"),reps_display:text("reps_display"),
  target_weight_kg:real("target_weight_kg"),rest_seconds:integer("rest_seconds").notNull().default(90),created_at:created(),
},t=>[index("idx_template_exercises_owner_parent").on(t.user_id,t.template_id,t.order_index)]);
export const sessions = sqliteTable("workout_sessions", {
  id:id(),user_id:owner(),template_id:text("template_id").references(()=>templates.id,{onDelete:"set null"}),
  started_at:text("started_at").notNull().default(now),ended_at:text("ended_at"),avg_hr:real("avg_hr"),rpe:real("rpe"),calories_burned:real("calories_burned"),
},t=>[index("idx_sessions_user_time").on(t.user_id,t.started_at),
  uniqueIndex("idx_single_open_guided_workout").on(t.user_id,t.template_id).where(sql`${t.ended_at} is null and ${t.template_id} is not null`),
  uniqueIndex("idx_single_open_free_workout").on(t.user_id).where(sql`${t.ended_at} is null and ${t.template_id} is null`),
  check("session_time_order",sql`${t.ended_at} is null or ${t.ended_at} >= ${t.started_at}`),
]);
export const loggedSets = sqliteTable("logged_sets", {
  id:id(),user_id:owner(),session_id:text("session_id").notNull().references(()=>sessions.id,{onDelete:"cascade"}),
  exercise_id:text("exercise_id").notNull().references(()=>exercises.id,{onDelete:"restrict"}), set_number:integer("set_number").notNull(),
  weight_kg:real("weight_kg").notNull().default(0),reps:real("reps").notNull().default(0),completed_at:text("completed_at").notNull().default(now),rest_taken_sec:real("rest_taken_sec"),
},t=>[index("idx_sets_owner_session").on(t.user_id,t.session_id),
  uniqueIndex("idx_set_identity").on(t.session_id,t.exercise_id,t.set_number),
  check("set_values",sql`${t.weight_kg} >= 0 and ${t.reps} >= 0 and ${t.set_number} > 0`),
]);
export const testTypes = sqliteTable("test_types", {
  id:id(),user_id:text("user_id"),name:text("name").notNull(),result_type:text("result_type").notNull(),distance_m:real("distance_m"),duration_sec:real("duration_sec"),
  is_custom:integer("is_custom",{mode:"boolean"}).notNull().default(false),created_at:created(),
},t=>[index("idx_test_types_user").on(t.user_id)]);
export const tests = sqliteTable("tests", {
  id:id(),user_id:owner(),test_type_id:text("test_type_id").notNull().references(()=>testTypes.id,{onDelete:"restrict"}),date:date(),time_sec:real("time_sec"),
  distance_covered_m:real("distance_covered_m"),avg_hr:real("avg_hr"),weather:text("weather"),notes:text("notes"),observations:text("observations"),
  calories_burned:real("calories_burned"),created_at:created(),
},t=>[index("idx_tests_owner_type_date").on(t.user_id,t.test_type_id,t.date)]);
export const races = sqliteTable("races", {
  id:id(),user_id:owner(),name:text("name").notNull(),date:date(),distance_m:real("distance_m").notNull(),time_sec:real("time_sec").notNull(),
  location:text("location"),placement:integer("placement"),category:text("category"),avg_hr:real("avg_hr"),notes:text("notes"),calories_burned:real("calories_burned"),created_at:created(),
},t=>[index("idx_races_owner_date").on(t.user_id,t.date)]);
export const intervalSessions = sqliteTable("interval_sessions", {
  id:id(),user_id:owner(),date:date(),signature:text("signature"),notes:text("notes"),calories_burned:real("calories_burned"),created_at:created(),updated_at:updated(),
},t=>[index("idx_intervals_owner_date").on(t.user_id,t.date)]);
export const intervalReps = sqliteTable("interval_reps", {
  id:id(),user_id:owner(),session_id:text("session_id").notNull().references(()=>intervalSessions.id,{onDelete:"cascade"}),
  rep_number:integer("rep_number").notNull(),distance_m:real("distance_m").notNull(),time_sec:real("time_sec").notNull(),rest_sec:real("rest_sec"),created_at:created(),
},t=>[index("idx_interval_reps_owner_parent").on(t.user_id,t.session_id)]);
export const performanceLog = sqliteTable("performance_log", {
  id:id(),user_id:owner(),source:text("source").notNull(),source_id:text("source_id").notNull(),distance_m:real("distance_m").notNull(),
  time_sec:real("time_sec").notNull(),date:date(),created_at:created(),
},t=>[uniqueIndex("idx_performance_source").on(t.source,t.source_id),index("idx_performance_user_date").on(t.user_id,t.date)]);
export const preferences = sqliteTable("preferences", {
  id:id(), user_id:owner(), key:text("key").notNull(), value:text("value").notNull(),updated_at:updated(),
},t=>[uniqueIndex("idx_preferences_user_key").on(t.user_id,t.key)]);
