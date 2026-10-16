import { CONTINUOUS_RUN } from "./continuous-run.ts";
export type RunMeta = {
  effort: string;
  rpe: number | null;
  route: string;
  elevation: number | null;
};
export function readRunMeta(notes: string | null): RunMeta {
  try {
    if (notes?.startsWith("@PRYME_RUN:"))
      return {
        ...{ effort: "unknown", rpe: null, route: "", elevation: null },
        ...JSON.parse(notes.split("\n")[0].slice(11)),
      };
  } catch {}
  return { effort: "unknown", rpe: null, route: "", elevation: null };
}
export function packRunNotes(meta: RunMeta, notes: string) {
  return "@PRYME_RUN:" + JSON.stringify(meta) + "\n" + notes;
}
type Session = {
  id: string;
  date: string;
  created_at: string;
  signature: string | null;
  notes: string | null;
  interval_reps: {
    distance_m: number;
    time_sec: number | null;
    rest_mode?: string | null;
    rest_distance_m?: number | null;
    rest_sec: number | null;
  }[];
};
export function similarRuns<T extends Session>(current: T, all: T[]): T[] {
  if (
    !current.interval_reps.length ||
    current.interval_reps.some((r) => r.time_sec == null || r.time_sec <= 0)
  )
    return [];
  const continuous = current.signature === CONTINUOUS_RUN;
  const distance = current.interval_reps.reduce((n, r) => n + r.distance_m, 0);
  const meta = readRunMeta(current.notes);
  return all
    .filter((s) => {
      if (s.interval_reps.some((r) => r.time_sec == null || r.time_sec <= 0)) return false;
      if (
        s.id === current.id ||
        s.date > current.date ||
        (s.date === current.date && s.created_at >= current.created_at)
      )
        return false;
      if ((s.signature === CONTINUOUS_RUN) !== continuous) return false;
      if (continuous) {
        const d = s.interval_reps.reduce((n, r) => n + r.distance_m, 0);
        return (
          distance > 0 &&
          Math.abs(d - distance) / distance <= 0.1 &&
          readRunMeta(s.notes).effort === meta.effort
        );
      }
      return (
        s.interval_reps.length === current.interval_reps.length &&
        s.interval_reps.every(
          (r, i) =>
            r.distance_m === current.interval_reps[i].distance_m &&
            (r.rest_mode ?? (r.rest_sec == null ? "free" : "time")) ===
              (current.interval_reps[i].rest_mode ??
                (current.interval_reps[i].rest_sec == null ? "free" : "time")) &&
            (r.rest_distance_m ?? null) === (current.interval_reps[i].rest_distance_m ?? null) &&
            ((r.rest_sec === null && current.interval_reps[i].rest_sec === null) ||
              (r.rest_sec !== null &&
                current.interval_reps[i].rest_sec !== null &&
                Math.abs(r.rest_sec - current.interval_reps[i].rest_sec!) <=
                  Math.max(10, current.interval_reps[i].rest_sec! * 0.1))),
        )
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}
export function runningMetric(s: Session) {
  if (!s.interval_reps.length || s.interval_reps.some((r) => r.time_sec == null || r.time_sec <= 0))
    return NaN;
  const t = s.interval_reps.reduce((n, r) => n + (r.time_sec ?? 0), 0);
  return s.signature === CONTINUOUS_RUN
    ? t / (s.interval_reps.reduce((n, r) => n + r.distance_m, 0) / 1000)
    : t / s.interval_reps.length;
}
