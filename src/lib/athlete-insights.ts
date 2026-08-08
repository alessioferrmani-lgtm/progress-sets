export type TrainingKind = "strength" | "running" | "test" | "race";

export type TrainingActivity = {
  date: string;
  durationMin: number;
  kind: TrainingKind;
  rpe?: number | null;
  volumeKg?: number | null;
};

export type ReadinessInput = {
  sleepHours?: number | null;
  sleepQuality?: number | null;
  soreness?: number | null;
  stress?: number | null;
  motivation?: number | null;
  restingHr?: number | null;
  baselineRestingHr?: number | null;
  hrvMs?: number | null;
  baselineHrvMs?: number | null;
};

export type ReadinessResult = {
  score: number;
  label: "Recupera" | "Adatta" | "Pronto";
  recommendation: string;
};

export type PeriodComparison = {
  current: number;
  previous: number;
  delta: number;
  percentage: number | null;
  trend: "up" | "down" | "stable";
};

/** Session-RPE load: the standard simple load model used when no power data exists. */
export function trainingLoad(activity: TrainingActivity): number {
  if (!Number.isFinite(activity.durationMin) || activity.durationMin <= 0) return 0;
  const rpe = clamp(Number(activity.rpe ?? 6), 1, 10);
  const duration = Math.max(0, activity.durationMin);
  if (activity.kind === "strength" && Number.isFinite(activity.volumeKg ?? NaN)) {
    // Keep volume visible without letting very large loads dominate the readiness score.
    return Math.round(duration * rpe + Math.sqrt(Math.max(0, activity.volumeKg ?? 0)));
  }
  return Math.round(duration * rpe);
}

export function totalTrainingLoad(activities: TrainingActivity[], from: Date, to: Date): number {
  const start = from.getTime();
  const end = to.getTime();
  return activities.reduce((total, activity) => {
    const timestamp = new Date(activity.date).getTime();
    return timestamp >= start && timestamp <= end ? total + trainingLoad(activity) : total;
  }, 0);
}

/** Acute:chronic workload ratio, with the previous four weeks as the chronic baseline. */
export function acuteChronicRatio(activities: TrainingActivity[], now = new Date()): number | null {
  const end = new Date(now);
  const acuteStart = shiftDays(end, -7);
  const chronicStart = shiftDays(end, -35);
  const acute = totalTrainingLoad(activities, acuteStart, end);
  const chronic = totalTrainingLoad(activities, chronicStart, acuteStart);
  const weeklyBaseline = chronic / 4;
  return weeklyBaseline > 0 ? Number((acute / weeklyBaseline).toFixed(2)) : null;
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const parts: number[] = [];
  if (isFiniteNumber(input.sleepHours)) parts.push(scoreSleepHours(input.sleepHours));
  if (isFiniteNumber(input.sleepQuality)) parts.push(scoreFive(input.sleepQuality));
  if (isFiniteNumber(input.soreness)) parts.push(scoreFive(6 - input.soreness));
  if (isFiniteNumber(input.stress)) parts.push(scoreFive(6 - input.stress));
  if (isFiniteNumber(input.motivation)) parts.push(scoreFive(input.motivation));

  if (isFiniteNumber(input.restingHr) && isFiniteNumber(input.baselineRestingHr)) {
    const delta = input.restingHr - input.baselineRestingHr;
    parts.push(clamp(70 - delta * 8, 0, 100));
  }
  if (
    isFiniteNumber(input.hrvMs) &&
    isFiniteNumber(input.baselineHrvMs) &&
    input.baselineHrvMs > 0
  ) {
    parts.push(clamp(50 + (input.hrvMs / input.baselineHrvMs - 1) * 100, 0, 100));
  }

  const score = Math.round(
    parts.length ? parts.reduce((sum, part) => sum + part, 0) / parts.length : 50,
  );
  if (score < 45) {
    return {
      score,
      label: "Recupera",
      recommendation: "Riduci intensità e volume. Dai priorità a recupero, sonno e mobilità.",
    };
  }
  if (score < 70) {
    return {
      score,
      label: "Adatta",
      recommendation: "Allenati, ma lascia 1–2 ripetizioni di margine e controlla i recuperi.",
    };
  }
  return {
    score,
    label: "Pronto",
    recommendation: "Giornata adatta a svolgere il lavoro programmato con intensità completa.",
  };
}

export function comparePeriods(current: number, previous: number): PeriodComparison {
  const delta = current - previous;
  const percentage = previous > 0 ? Number(((delta / previous) * 100).toFixed(1)) : null;
  const threshold = Math.max(1, Math.abs(previous) * 0.03);
  const trend = delta > threshold ? "up" : delta < -threshold ? "down" : "stable";
  return { current, previous, delta, percentage, trend };
}

/** Epley estimate, deliberately capped to avoid nonsense from accidental input. */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(reps) ||
    weightKg <= 0 ||
    reps < 1 ||
    reps > 30
  )
    return null;
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

function scoreSleepHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return clamp(100 - Math.abs(8 - hours) * 18, 0, 100);
}

function scoreFive(value: number): number {
  return clamp(((value - 1) / 4) * 100, 0, 100);
}

function shiftDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
