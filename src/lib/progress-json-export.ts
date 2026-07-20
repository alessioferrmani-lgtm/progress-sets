import { supabase } from "@/integrations/supabase/client";
import { safeExportOne, safeExportRows } from "@/lib/progress-export-safety";

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function loadProgressExport() {
  const auth = await supabase.auth.getUser();
  if (auth.error) throw new Error(`Accesso: ${auth.error.message}`);
  const userId = auth.data.user?.id;
  if (!userId) throw new Error("Sessione scaduta: accedi di nuovo");

  const warnings: string[] = [];

  const [
    profileResult,
    weightResult,
    templatesResult,
    sessionsResult,
    testsResult,
    racesResult,
    intervalsResult,
    performanceResult,
  ] = await Promise.all([
    safeExportOne(
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      "Profilo",
      warnings,
    ),
    safeExportRows(
      supabase.from("weight_logs").select("*").eq("user_id", userId).order("logged_at"),
      "Storico peso",
      warnings,
    ),
    safeExportRows(
      supabase.from("workout_templates").select("*").eq("user_id", userId).order("created_at"),
      "Schede palestra",
      warnings,
    ),
    safeExportRows(
      supabase.from("workout_sessions").select("*").eq("user_id", userId).order("started_at"),
      "Allenamenti palestra",
      warnings,
    ),
    safeExportRows(
      supabase.from("tests").select("*").eq("user_id", userId).order("date"),
      "Test atletici",
      warnings,
    ),
    safeExportRows(
      supabase.from("races").select("*").eq("user_id", userId).order("date"),
      "Gare",
      warnings,
    ),
    safeExportRows(
      supabase.from("interval_sessions").select("*").eq("user_id", userId).order("date"),
      "Sessioni di ripetute",
      warnings,
    ),
    safeExportRows(
      supabase.from("performance_log").select("*").eq("user_id", userId).order("date"),
      "Registro prestazioni",
      warnings,
    ),
  ]);

  const profile = profileResult;
  const weightHistory = weightResult;
  const workoutTemplates = templatesResult;
  const workoutSessions = sessionsResult;
  const tests = testsResult;
  const races = racesResult;
  const intervalSessions = intervalsResult;
  const performanceLog = performanceResult;

  const templateIds = workoutTemplates.map((row) => row.id);
  const sessionIds = workoutSessions.map((row) => row.id);
  const intervalSessionIds = intervalSessions.map((row) => row.id);
  const testTypeIds = unique(tests.map((row) => row.test_type_id));

  const [templateExercisesResult, loggedSetsResult, intervalRepsResult, testTypesResult] =
    await Promise.all([
      templateIds.length
        ? safeExportRows(
            supabase
              .from("template_exercises")
              .select("*")
              .in("template_id", templateIds)
              .order("order_index"),
            "Esercizi delle schede",
            warnings,
          )
        : [],
      sessionIds.length
        ? safeExportRows(
            supabase
              .from("logged_sets")
              .select("*")
              .in("session_id", sessionIds)
              .order("completed_at"),
            "Serie palestra",
            warnings,
          )
        : [],
      intervalSessionIds.length
        ? safeExportRows(
            supabase
              .from("interval_reps")
              .select("*")
              .in("session_id", intervalSessionIds)
              .order("rep_number"),
            "Ripetute atletica",
            warnings,
          )
        : [],
      testTypeIds.length
        ? safeExportRows(
            supabase.from("test_types").select("*").in("id", testTypeIds),
            "Tipi di test",
            warnings,
          )
        : [],
    ]);

  const templateExercises = templateExercisesResult;
  const loggedSets = loggedSetsResult;
  const intervalReps = intervalRepsResult;
  const testTypes = testTypesResult;

  const exerciseIds = unique([
    ...templateExercises.map((row) => row.exercise_id),
    ...loggedSets.map((row) => row.exercise_id),
  ]);
  const exercises = exerciseIds.length
    ? await safeExportRows(
        supabase.from("exercises").select("*").in("id", exerciseIds).order("name"),
        "Catalogo esercizi utilizzati",
        warnings,
      )
    : [];

  return {
    schema_version: 1,
    application: "Progress Sets",
    exported_at: new Date().toISOString(),
    export_complete: warnings.length === 0,
    export_warnings: warnings,
    profile,
    weight_history: weightHistory,
    gym: {
      templates: workoutTemplates,
      template_exercises: templateExercises,
      sessions: workoutSessions,
      logged_sets: loggedSets,
      exercises,
    },
    athletics: {
      tests,
      test_types: testTypes,
      races,
      interval_sessions: intervalSessions,
      interval_reps: intervalReps,
      performance_log: performanceLog,
    },
    totals: {
      weight_entries: weightHistory.length,
      gym_templates: workoutTemplates.length,
      gym_sessions: workoutSessions.length,
      gym_sets: loggedSets.length,
      tests: tests.length,
      races: races.length,
      interval_sessions: intervalSessions.length,
      interval_reps: intervalReps.length,
    },
  };
}

export async function loadProgressExportJson(): Promise<string> {
  return JSON.stringify(await loadProgressExport(), null, 2);
}
