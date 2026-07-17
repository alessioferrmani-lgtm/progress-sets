import { supabase } from "@/integrations/supabase/client";
import { startOfISOWeek, endOfISOWeek, subDays, formatISO } from "date-fns";

export type SessionRow = {
  id: string;
  template_id: string | null;
  template_name: string | null;
  started_at: string;
  ended_at: string | null;
  calories_burned: number | null;
};

export type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_muscle_group: string | null;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
};

export async function fetchRecentSessions(days = 120): Promise<SessionRow[]> {
  const since = subDays(new Date(), days).toISOString();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id,template_id,started_at,ended_at,calories_burned,template:workout_templates(name)")
    .gte("started_at", since)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      template_id: string | null;
      started_at: string;
      ended_at: string | null;
      calories_burned: number | string | null;
      template: { name: string } | null;
    };
    return {
      id: row.id,
      template_id: row.template_id,
      template_name: row.template?.name ?? null,
      started_at: row.started_at,
      ended_at: row.ended_at,
      calories_burned: row.calories_burned == null ? null : Number(row.calories_burned),
    };
  });
}

export async function fetchRecentSets(days = 120): Promise<SetRow[]> {
  const since = subDays(new Date(), days).toISOString();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("logged_sets")
    .select(
      "id,session_id,exercise_id,set_number,weight_kg,reps,completed_at,exercise:exercises(name,muscle_group),workout_sessions!inner(user_id)",
    )
    .eq("workout_sessions.user_id", userId)
    .gte("completed_at", since)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      session_id: string;
      exercise_id: string;
      set_number: number;
      weight_kg: number | string;
      reps: number;
      completed_at: string;
      exercise: { name: string; muscle_group: string | null } | null;
    };
    return {
      id: row.id,
      session_id: row.session_id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercise?.name ?? "Esercizio",
      exercise_muscle_group: row.exercise?.muscle_group ?? null,
      set_number: row.set_number,
      weight_kg: Number(row.weight_kg),
      reps: row.reps,
      completed_at: row.completed_at,
    };
  });
}

export type PR = {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  date: string;
  previous_weight_kg: number | null;
  delta: number | null;
};

/** All-time PR per exercise (max weight, first date achieved). */
export async function fetchAllTimePRs(): Promise<PR[]> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("logged_sets")
    .select(
      "exercise_id,weight_kg,completed_at,exercise:exercises(name),workout_sessions!inner(user_id)",
    )
    .eq("workout_sessions.user_id", userId)
    .order("completed_at", { ascending: true });
  if (error) throw error;

  type Bucket = {
    exercise_name: string;
    max: number;
    date: string;
    previous_max: number | null;
    previous_date: string | null;
  };
  const map = new Map<string, Bucket>();
  (data ?? []).forEach((r) => {
    const row = r as unknown as {
      exercise_id: string;
      weight_kg: number | string;
      completed_at: string;
      exercise: { name: string } | null;
    };
    const w = Number(row.weight_kg);
    if (!w) return;
    const cur = map.get(row.exercise_id);
    if (!cur) {
      map.set(row.exercise_id, {
        exercise_name: row.exercise?.name ?? "Esercizio",
        max: w,
        date: row.completed_at,
        previous_max: null,
        previous_date: null,
      });
    } else if (w > cur.max) {
      cur.previous_max = cur.max;
      cur.previous_date = cur.date;
      cur.max = w;
      cur.date = row.completed_at;
    }
  });
  const prs: PR[] = [];
  map.forEach((b, id) => {
    prs.push({
      exercise_id: id,
      exercise_name: b.exercise_name,
      weight_kg: b.max,
      date: b.date,
      previous_weight_kg: b.previous_max,
      delta: b.previous_max !== null ? Number((b.max - b.previous_max).toFixed(2)) : null,
    });
  });
  return prs;
}

/** Aggregate sessions/sets per ISO week for last N weeks. */
export type WeekBucket = {
  weekStart: string; // ISO date
  weekLabel: string; // dd/MM
  volume: number; // sum weight * reps (kg)
  reps: number; // total reps
  durationMin: number; // sum session durations
  hasSession: boolean;
};

export function bucketByWeek(sessions: SessionRow[], sets: SetRow[], weeks: number): WeekBucket[] {
  const out: WeekBucket[] = [];
  const now = new Date();
  const currentStart = startOfISOWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - i * 7);
    const end = endOfISOWeek(start);
    const label = `${String(start.getDate()).padStart(2, "0")}/${String(
      start.getMonth() + 1,
    ).padStart(2, "0")}`;
    let volume = 0;
    let reps = 0;
    let durationMin = 0;
    let hasSession = false;
    sessions.forEach((s) => {
      const t = new Date(s.started_at);
      if (t >= start && t <= end) {
        hasSession = true;
        if (s.ended_at) {
          durationMin +=
            (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
        }
      }
    });
    sets.forEach((st) => {
      const t = new Date(st.completed_at);
      if (t >= start && t <= end) {
        volume += st.weight_kg * st.reps;
        reps += st.reps;
      }
    });
    out.push({
      weekStart: formatISO(start, { representation: "date" }),
      weekLabel: label,
      volume: Math.round(volume),
      reps,
      durationMin: Math.round(durationMin),
      hasSession,
    });
  }
  return out;
}
