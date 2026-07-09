import { supabase } from "@/integrations/supabase/client";

export type Exercise = { id: string; name: string };
export type Template = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
export type TemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number | null;
  rest_seconds: number;
  exercise: Exercise;
};
export type Session = {
  id: string;
  template_id: string | null;
  started_at: string;
  ended_at: string | null;
};
export type LoggedSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
  rest_taken_sec: number | null;
};

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from("exercises").select("id,name").order("name");
  if (error) throw error;
  return data as Exercise[];
}

export async function fetchTemplates(): Promise<
  Array<Template & { exercise_count: number; last_used_at: string | null }>
> {
  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select("id,name,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const ids = (templates ?? []).map((t) => t.id);
  if (ids.length === 0) return [];

  const [{ data: teRows }, { data: sessRows }] = await Promise.all([
    supabase.from("template_exercises").select("template_id").in("template_id", ids),
    supabase
      .from("workout_sessions")
      .select("template_id,started_at")
      .in("template_id", ids)
      .order("started_at", { ascending: false }),
  ]);

  const countMap = new Map<string, number>();
  (teRows ?? []).forEach((r: { template_id: string }) => {
    countMap.set(r.template_id, (countMap.get(r.template_id) ?? 0) + 1);
  });
  const lastMap = new Map<string, string>();
  (sessRows ?? []).forEach((r: { template_id: string; started_at: string }) => {
    if (!lastMap.has(r.template_id)) lastMap.set(r.template_id, r.started_at);
  });

  return (templates ?? []).map((t) => ({
    ...(t as Template),
    exercise_count: countMap.get(t.id) ?? 0,
    last_used_at: lastMap.get(t.id) ?? null,
  }));
}

export async function fetchTemplate(id: string): Promise<{
  template: Template;
  exercises: TemplateExercise[];
}> {
  const { data: t, error: te } = await supabase
    .from("workout_templates")
    .select("id,name,created_at,updated_at")
    .eq("id", id)
    .single();
  if (te) throw te;
  const { data: ex, error: ee } = await supabase
    .from("template_exercises")
    .select(
      "id,template_id,exercise_id,order_index,target_sets,target_reps,target_weight_kg,rest_seconds,exercise:exercises(id,name)",
    )
    .eq("template_id", id)
    .order("order_index");
  if (ee) throw ee;
  return {
    template: t as Template,
    exercises: (ex ?? []) as unknown as TemplateExercise[],
  };
}

/** For a set of exercise IDs, return the most recent completed set per (exercise, set_number). */
export async function fetchPreviousSets(
  exerciseIds: string[],
): Promise<Map<string, Map<number, { weight_kg: number; reps: number }>>> {
  const map = new Map<string, Map<number, { weight_kg: number; reps: number }>>();
  if (exerciseIds.length === 0) return map;
  // Get user id
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return map;
  const { data, error } = await supabase
    .from("logged_sets")
    .select(
      "exercise_id,set_number,weight_kg,reps,completed_at,workout_sessions!inner(user_id)",
    )
    .in("exercise_id", exerciseIds)
    .eq("workout_sessions.user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  // Keep first-seen (most recent) per (exercise, set_number)
  const seenSession = new Map<string, string>(); // exercise -> session_id? Not exposed here; use completed_at bucket
  // Simpler: pick most recent session per exercise, then take its sets
  const latestSessionForExercise = new Map<string, string>();
  const rowsByExerciseSession = new Map<
    string,
    Array<{ set_number: number; weight_kg: number; reps: number; completed_at: string }>
  >();
  void seenSession;
  // We didn't select session_id; refetch with session_id included:
  // fallback: group by exercise, take rows whose completed_at is within the most recent session date bucket.
  // Simpler correct approach: refetch including session_id.
  const { data: data2 } = await supabase
    .from("logged_sets")
    .select(
      "session_id,exercise_id,set_number,weight_kg,reps,completed_at,workout_sessions!inner(user_id,started_at)",
    )
    .in("exercise_id", exerciseIds)
    .eq("workout_sessions.user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1000);
  (data2 ?? []).forEach((row) => {
    const r = row as unknown as {
      session_id: string;
      exercise_id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      completed_at: string;
    };
    if (!latestSessionForExercise.has(r.exercise_id)) {
      latestSessionForExercise.set(r.exercise_id, r.session_id);
    }
    if (latestSessionForExercise.get(r.exercise_id) !== r.session_id) return;
    const key = r.exercise_id + "::" + r.session_id;
    if (!rowsByExerciseSession.has(key)) rowsByExerciseSession.set(key, []);
    rowsByExerciseSession.get(key)!.push(r);
  });
  latestSessionForExercise.forEach((sessionId, exerciseId) => {
    const rows = rowsByExerciseSession.get(exerciseId + "::" + sessionId) ?? [];
    const inner = new Map<number, { weight_kg: number; reps: number }>();
    rows.forEach((r) => inner.set(r.set_number, { weight_kg: Number(r.weight_kg), reps: r.reps }));
    map.set(exerciseId, inner);
  });
  // silence unused
  void data;
  return map;
}

export async function fetchMaxWeights(exerciseIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (exerciseIds.length === 0) return map;
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return map;
  const { data } = await supabase
    .from("logged_sets")
    .select("exercise_id,weight_kg,workout_sessions!inner(user_id)")
    .in("exercise_id", exerciseIds)
    .eq("workout_sessions.user_id", userId);
  (data ?? []).forEach((row) => {
    const r = row as unknown as { exercise_id: string; weight_kg: number };
    const w = Number(r.weight_kg);
    if (w > (map.get(r.exercise_id) ?? -Infinity)) map.set(r.exercise_id, w);
  });
  return map;
}
