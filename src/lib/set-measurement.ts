export type SetSide = "both" | "left" | "right";
export type Measurement = "count" | "time" | "distance" | "unspecified";
export type SetClock = { elapsedMs: number; startedAt: number | null; stopped?: boolean };
export type SetMetadata = {
  side?: SetSide;
  reps_type?: Measurement;
  duration_sec?: number | null;
  distance_m?: number | null;
};
export type WorkoutRow = SetMetadata & {
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
  completedAt?: number;
  logId?: string;
  clock?: SetClock;
};

// set_number remains a stable, unique sequence within the exercise. Unilateral
// pairs are 1 SX, 1 DX, 2 SX, 2 DX ...; old records remain bilateral unchanged.
export function sideFor(index: number, unilateral: boolean): SetSide {
  return unilateral ? (index % 2 === 0 ? "left" : "right") : "both";
}
export function setLabel(row: { set_number: number; side?: SetSide }) {
  return row.side && row.side !== "both"
    ? `${Math.ceil(row.set_number / 2)} ${row.side === "left" ? "SX" : "DX"}`
    : String(row.set_number);
}
export function measurementValue(set: SetMetadata & { reps: number }) {
  return set.reps_type === "time"
    ? (set.duration_sec ?? 0)
    : set.reps_type === "distance"
      ? (set.distance_m ?? 0)
      : set.reps;
}
export function measurementUnit(type?: Measurement) {
  return type === "time" ? "sec" : type === "distance" ? "m" : "rip.";
}
export function targetValue(
  display: string | null | undefined,
  type: Measurement,
  fallback?: number | null,
) {
  const raw = Number(display?.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
  const value = Number.isFinite(raw) ? raw : (fallback ?? 0);
  return type === "time" && /\bmin(?:uti|uto)?\b/i.test(display ?? "")
    ? value * 60
    : type === "distance" && /\bkm\b/i.test(display ?? "")
      ? value * 1000
      : value;
}
export function elapsedClock(clock: SetClock | undefined, now = Date.now()) {
  if (!clock) return 0;
  const stored = Number.isFinite(clock.elapsedMs) ? Math.max(0, clock.elapsedMs) : 0;
  return (
    stored +
    (clock.startedAt != null && Number.isFinite(clock.startedAt)
      ? Math.max(0, now - clock.startedAt)
      : 0)
  );
}
export function pauseClock(clock: SetClock | undefined, now = Date.now()): SetClock {
  return { elapsedMs: elapsedClock(clock, now), startedAt: null };
}
export function recordedMeasurement(
  row: Pick<WorkoutRow, "weight" | "reps" | "reps_type" | "side" | "clock">,
) {
  if (row.clock && !row.clock.stopped && (row.clock.startedAt != null || row.clock.elapsedMs > 0))
    throw new Error("Premi Stop sul cronometro prima di confermare la serie");
  const weight = Number((row.weight || "0").replace(",", "."));
  const value = Number(row.reps.replace(",", "."));
  const type = row.reps_type === "unspecified" ? "count" : (row.reps_type ?? "count");
  if (
    !Number.isFinite(weight) ||
    weight < 0 ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (type === "count" && !Number.isInteger(value))
  )
    throw new Error("Inserisci carico e valore della serie validi");
  return {
    weight_kg: weight,
    reps: type === "count" ? value : 0,
    reps_type: type,
    side: row.side ?? "both",
    duration_sec: type === "time" ? value : null,
    distance_m: type === "distance" ? value : null,
  };
}
export function addWorkoutSet(rows: WorkoutRow[]): WorkoutRow[] {
  const unilateral = rows[0]?.side !== undefined && rows[0].side !== "both";
  const extra = Array.from({ length: unilateral ? 2 : 1 }, (_, i) => {
    const side = sideFor(rows.length + i, unilateral);
    const reference = [...rows].reverse().find((row) => (row.side ?? "both") === side) ?? rows[0];
    return {
      set_number: rows.length + i + 1,
      side,
      reps_type: reference?.reps_type ?? "count",
      weight: reference?.weight ?? "",
      reps: reference?.reps ?? "",
      completed: false,
    } as WorkoutRow;
  });
  return [...rows, ...extra];
}
export function configureRows(
  rows: WorkoutRow[],
  unilateral: boolean,
  type: Measurement,
): WorkoutRow[] {
  if (rows.some((row) => row.completed || row.clock?.startedAt != null)) return rows;
  const wasUnilateral = rows[0]?.side != null && rows[0].side !== "both";
  const count = Math.max(1, Math.ceil(rows.length / (wasUnilateral ? 2 : 1)));
  return Array.from({ length: count * (unilateral ? 2 : 1) }, (_, i) => {
    const logical = Math.floor(i / (unilateral ? 2 : 1));
    const old =
      rows[logical * (wasUnilateral ? 2 : 1) + (wasUnilateral && unilateral ? i % 2 : 0)] ??
      rows[0];
    return {
      ...old,
      set_number: i + 1,
      side: sideFor(i, unilateral),
      reps_type: type,
      reps: old?.reps_type === type ? old.reps : "",
      weight: old?.weight ?? "",
      completed: false,
      clock: undefined,
    };
  });
}

export function restoreWorkoutRows({
  targetSets = 1,
  unilateral = false,
  type = "count",
  targetWeight = 0,
  target = 0,
  saved = [],
  logged = [],
  previous = new Map(),
}: {
  targetSets?: number;
  unilateral?: boolean;
  type?: Measurement;
  targetWeight?: number | null;
  target?: number | null;
  saved?: Array<
    SetMetadata & { set_number: number; weight: string; reps: string; clock?: SetClock }
  >;
  logged?: Array<
    SetMetadata & {
      id: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      completed_at: string;
    }
  >;
  previous?: Map<number, SetMetadata & { weight_kg: number; reps: number }>;
}): WorkoutRow[] {
  // Never reinterpret an already-started session when its template is edited.
  if (logged.length) unilateral = (logged[0].side ?? "both") !== "both";
  else if (saved.length) unilateral = (saved[0].side ?? "both") !== "both";
  const count = Math.max(
    targetSets * (unilateral ? 2 : 1),
    saved.length,
    ...logged.map((s) => s.set_number),
    1,
  );
  return Array.from({ length: count }, (_, i) => {
    const set_number = i + 1,
      done = logged.find((s) => s.set_number === set_number),
      draft = saved.find((s) => s.set_number === set_number);
    const side = done?.side ?? draft?.side ?? sideFor(i, unilateral);
    const reps_type = done?.reps_type ?? draft?.reps_type ?? type;
    const suitable = (p: SetMetadata | undefined) =>
      p && (p.side ?? "both") === side && (p.reps_type ?? "count") === reps_type;
    const exact = previous.get(set_number);
    const prior = suitable(exact) ? exact : [...previous.values()].find(suitable);
    return {
      set_number,
      side,
      reps_type,
      weight: String(done?.weight_kg ?? draft?.weight ?? prior?.weight_kg ?? targetWeight ?? ""),
      reps: String(
        done
          ? measurementValue(done)
          : (draft?.reps ?? (prior ? measurementValue(prior) : (target ?? ""))),
      ),
      completed: !!done,
      completedAt: done ? new Date(done.completed_at).getTime() : undefined,
      logId: done?.id,
      clock: done ? undefined : draft?.clock,
    };
  });
}
