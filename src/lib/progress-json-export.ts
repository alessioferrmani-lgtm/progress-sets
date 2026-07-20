import { supabase } from "@/integrations/supabase/client";

type QueryResult<T> = { data: T | null; error: { message: string } | null };

function rowsOrThrow<T>(result: QueryResult<T[]>, label: string): T[] {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

function oneOrNull<T>(result: QueryResult<T>, label: string): T | null {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? null;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function loadProgressExport() {
  const auth = await supabase.auth.getUser();
  if (auth.error) throw new Error(`Accesso: ${auth.error.message}`);
  const userId = auth.data.user?.id;
  if (!userId) throw new Error("Sessione scaduta: accedi di nuovo");

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
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("weight_logs").select("*").eq("user_id", userId).order("logged_at"),
    supabase.from("workout_templates").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("workout_sessions").select("*").eq("user_id", userId).order("started_at"),
    supabase.from("tests").select("*").eq("user_id", userId).order("date"),
    supabase.from("races").select("*").eq("user_id", userId).order("date"),
    supabase.from("interval_sessions").select("*").eq("user_id", userId).order("date"),
    supabase.from("performance_log").select("*").eq("user_id", userId).order("date"),
  ]);

  const profile = oneOrNull(profileResult, "Profilo");
  const weightHistory = rowsOrThrow(weightResult, "Storico peso");
  const workoutTemplates = rowsOrThrow(templatesResult, "Schede palestra");
  const workoutSessions = rowsOrThrow(sessionsResult, "Allenamenti palestra");
  const tests = rowsOrThrow(testsResult, "Test atletici");
  const races = rowsOrThrow(racesResult, "Gare");
  const intervalSessions = rowsOrThrow(intervalsResult, "Sessioni di ripetute");
  const performanceLog = rowsOrThrow(performanceResult, "Registro prestazioni");

  const templateIds = workoutTemplates.map((row) => row.id);
  const sessionIds = workoutSessions.map((row) => row.id);
  const intervalSessionIds = intervalSessions.map((row) => row.id);
  const testTypeIds = unique(tests.map((row) => row.test_type_id));

  const [templateExercisesResult, loggedSetsResult, intervalRepsResult, testTypesResult] =
    await Promise.all([
      templateIds.length
        ? supabase
            .from("template_exercises")
            .select("*")
            .in("template_id", templateIds)
            .order("order_index")
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase
            .from("logged_sets")
            .select("*")
            .in("session_id", sessionIds)
            .order("completed_at")
        : Promise.resolve({ data: [], error: null }),
      intervalSessionIds.length
        ? supabase
            .from("interval_reps")
            .select("*")
            .in("session_id", intervalSessionIds)
            .order("rep_number")
        : Promise.resolve({ data: [], error: null }),
      testTypeIds.length
        ? supabase.from("test_types").select("*").in("id", testTypeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const templateExercises = rowsOrThrow(templateExercisesResult, "Esercizi delle schede");
  const loggedSets = rowsOrThrow(loggedSetsResult, "Serie palestra");
  const intervalReps = rowsOrThrow(intervalRepsResult, "Ripetute atletica");
  const testTypes = rowsOrThrow(testTypesResult, "Tipi di test");

  const exerciseIds = unique([
    ...templateExercises.map((row) => row.exercise_id),
    ...loggedSets.map((row) => row.exercise_id),
  ]);
  const exercises = exerciseIds.length
    ? rowsOrThrow(
        await supabase.from("exercises").select("*").in("id", exerciseIds).order("name"),
        "Catalogo esercizi utilizzati",
      )
    : [];

  return {
    schema_version: 1,
    application: "Progress Sets",
    exported_at: new Date().toISOString(),
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
