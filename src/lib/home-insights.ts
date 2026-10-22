import { intervalKind } from "./interval-kind.ts";
export type InsightSet = {
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  completed_at: string;
  side?: string;
  reps_type?: string;
};
export function strengthInsight(sets: InsightSet[], completedIds: Set<string>) {
  const ordered = sets
    .filter(
      (s) =>
        completedIds.has(s.session_id) &&
        (s.reps_type ?? "count") === "count" &&
        s.reps > 0 &&
        s.weight_kg > 0,
    )
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  const latest = ordered[0]?.session_id;
  if (!latest) return null;
  const improvements: Array<{
    name: string;
    sessionId: string;
    previousDate: string;
    previous: number;
    current: number;
    reps: number;
    delta: number;
    mode: "load" | "reps";
    weight: number;
  }> = [];
  for (const current of ordered.filter((s) => s.session_id === latest)) {
    const history = ordered.filter(
      (s) =>
        s.session_id !== latest &&
        s.completed_at < current.completed_at &&
        s.exercise_id === current.exercise_id &&
        s.reps === current.reps &&
        (s.side ?? "both") === (current.side ?? "both"),
    );
    const previousId = history[0]?.session_id;
    if (!previousId) continue;
    const previous = Math.max(
      ...history.filter((s) => s.session_id === previousId).map((s) => s.weight_kg),
    );
    if (current.weight_kg > previous)
      improvements.push({
        name: current.exercise_name,
        sessionId: latest,
        previousDate: history[0].completed_at,
        previous,
        current: current.weight_kg,
        reps: current.reps,
        delta: current.weight_kg - previous,
        mode: "load",
        weight: current.weight_kg,
      });
  }
  if (!improvements.length)
    for (const current of ordered.filter((s) => s.session_id === latest)) {
      const history = ordered.filter(
        (s) =>
          s.session_id !== latest &&
          s.completed_at < current.completed_at &&
          s.exercise_id === current.exercise_id &&
          (s.side ?? "both") === (current.side ?? "both"),
      );
      const previousId = history[0]?.session_id;
      const comparable = history.filter(
        (s) => s.session_id === previousId && s.weight_kg === current.weight_kg,
      );
      if (!comparable.length) continue;
      const previous = Math.max(...comparable.map((s) => s.reps));
      if (current.reps > previous)
        improvements.push({
          name: current.exercise_name,
          sessionId: latest,
          previousDate: comparable[0].completed_at,
          previous,
          current: current.reps,
          reps: current.reps,
          delta: current.reps - previous,
          mode: "reps",
          weight: current.weight_kg,
        });
    }
  return improvements.sort((a, b) => b.delta - a.delta)[0] ?? null;
}
export type DayPlan = { kind: "gym" | "run" | "rest"; templateId?: string };
export function parseDayPlan(value: unknown): DayPlan | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.kind === "rest" || v.kind === "run") return { kind: v.kind };
  if (v.kind === "gym" && typeof v.templateId === "string")
    return { kind: "gym", templateId: v.templateId };
  return null;
}
export function parseWeekPlan(value: unknown): Array<DayPlan | null> {
  return Array.from({ length: 7 }, (_, i) => parseDayPlan(Array.isArray(value) ? value[i] : null));
}

export type InsightInterval = {
  interval_kind?: string | null;
  id: string;
  date: string;
  interval_reps: Array<{ distance_m: number; time_sec: number | null; rest_sec: number | null }>;
};
export function runningInsight(sessions: InsightInterval[]) {
  const ordered = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const latest = ordered[0];
  if (
    !latest ||
    latest.interval_reps.length < 2 ||
    latest.interval_reps.some(
      (r) => r.distance_m <= 0 || r.time_sec == null || r.time_sec <= 0 || r.rest_sec == null,
    )
  )
    return null;
  const signature = (s: InsightInterval) =>
    JSON.stringify(s.interval_reps.map((r) => [r.distance_m, r.rest_sec]));
  const previous = ordered
    .slice(1)
    .find(
      (s) =>
        s.date < latest.date &&
        signature(s) === signature(latest) &&
        intervalKind(s.interval_kind) === intervalKind(latest.interval_kind) &&
        s.interval_reps.every((r) => r.time_sec != null && r.time_sec > 0),
    );
  if (!previous) return null;
  const mean = (s: InsightInterval) =>
    s.interval_reps.reduce((n, r) => n + (r.time_sec ?? 0), 0) / s.interval_reps.length;
  const now = mean(latest),
    before = mean(previous);
  if (before - now < 0.1) return null;
  return {
    date: latest.date,
    previousDate: previous.date,
    delta: before - now,
    count: latest.interval_reps.length,
    distance: latest.interval_reps.every((r) => r.distance_m === latest.interval_reps[0].distance_m)
      ? latest.interval_reps[0].distance_m
      : null,
  };
}
