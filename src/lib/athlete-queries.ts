import { subDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { TrainingActivity } from "@/lib/athlete-insights";

export type AthleteCheckin = Tables<"athlete_checkins">;
export type TrainingPlanItem = Tables<"training_plan_items">;

export function todayKey(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export async function fetchTodayCheckin(date = todayKey()): Promise<AthleteCheckin | null> {
  const { data, error } = await supabase
    .from("athlete_checkins")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCheckin(
  values: Omit<TablesInsert<"athlete_checkins">, "user_id" | "date"> & { date?: string },
): Promise<AthleteCheckin> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessione non autenticata");
  const payload: TablesInsert<"athlete_checkins"> = {
    ...values,
    user_id: auth.user.id,
    date: values.date ?? todayKey(),
  };
  const { data, error } = await supabase
    .from("athlete_checkins")
    .upsert(payload, { onConflict: "user_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTrainingPlan(
  from = todayKey(),
  to = todayKey(),
): Promise<TrainingPlanItem[]> {
  const { data, error } = await supabase
    .from("training_plan_items")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveTrainingPlanItem(
  values: Omit<TablesInsert<"training_plan_items">, "user_id">,
): Promise<TrainingPlanItem> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessione non autenticata");
  const payload: TablesInsert<"training_plan_items"> = { ...values, user_id: auth.user.id };
  const { data, error } = await supabase
    .from("training_plan_items")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrainingPlanItem(
  id: string,
  values: TablesUpdate<"training_plan_items">,
): Promise<TrainingPlanItem> {
  const { data, error } = await supabase
    .from("training_plan_items")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Fetches the activities used by the readiness and load model. */
export async function fetchAthleteActivities(days = 35): Promise<TrainingActivity[]> {
  const since = subDays(new Date(), days).toISOString();
  const [sessions, intervals, tests, races] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("started_at,ended_at,rpe")
      .gte("started_at", since)
      .not("ended_at", "is", null),
    supabase
      .from("interval_sessions")
      .select("date,interval_reps(time_sec,rest_sec)")
      .gte("date", format(subDays(new Date(), days), "yyyy-MM-dd")),
    supabase
      .from("tests")
      .select("date,time_sec,avg_hr")
      .gte("date", format(subDays(new Date(), days), "yyyy-MM-dd")),
    supabase
      .from("races")
      .select("date,time_sec,avg_hr")
      .gte("date", format(subDays(new Date(), days), "yyyy-MM-dd")),
  ]);
  for (const result of [sessions, intervals, tests, races]) {
    if (result.error) throw result.error;
  }

  const activities: TrainingActivity[] = [];
  (sessions.data ?? []).forEach((session) => {
    if (!session.ended_at) return;
    activities.push({
      date: session.started_at,
      durationMin: Math.max(
        0,
        (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000,
      ),
      kind: "strength",
      rpe: session.rpe,
    });
  });
  (intervals.data ?? []).forEach((session) => {
    const reps = (session.interval_reps ?? []) as Array<{
      time_sec: number;
      rest_sec: number | null;
    }>;
    const durationMin =
      reps.reduce((total, rep) => total + rep.time_sec + (rep.rest_sec ?? 0), 0) / 60;
    if (durationMin > 0)
      activities.push({ date: `${session.date}T12:00:00`, durationMin, kind: "running", rpe: 7 });
  });
  (tests.data ?? []).forEach((test) => {
    if (test.time_sec && test.time_sec > 0) {
      activities.push({
        date: `${test.date}T12:00:00`,
        durationMin: test.time_sec / 60,
        kind: "test",
        rpe: 8,
      });
    }
  });
  (races.data ?? []).forEach((race) => {
    if (race.time_sec && race.time_sec > 0) {
      activities.push({
        date: `${race.date}T12:00:00`,
        durationMin: race.time_sec / 60,
        kind: "race",
        rpe: 9,
      });
    }
  });
  return activities;
}
