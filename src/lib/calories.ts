// Single source of truth for calorie calculations (Mifflin-St Jeor, HR & MET).

export type Sex = "M" | "F" | "O";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "athlete";

export type UserProfileForCalc = {
  weight_kg: number | null;
  height_cm: number | null;
  date_of_birth: string | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
};

export function ageFromDOB(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function isProfileComplete(p: UserProfileForCalc | null | undefined): boolean {
  return !!(p && p.weight_kg && p.height_cm && p.date_of_birth && p.sex);
}

/** Mifflin-St Jeor BMR (kcal/day). Returns null if profile incomplete. */
export function bmr(p: UserProfileForCalc): number | null {
  const age = ageFromDOB(p.date_of_birth);
  if (!p.weight_kg || !p.height_cm || age === null || !p.sex) return null;
  const base = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * age;
  const offset = p.sex === "M" ? 5 : p.sex === "F" ? -161 : -78;
  return base + offset;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export function tdee(p: UserProfileForCalc): number | null {
  const b = bmr(p);
  if (b === null || !p.activity_level) return null;
  return b * ACTIVITY_FACTOR[p.activity_level];
}

/** Keytel/Hiilloskorpi HR-based kcal/min → total. */
export function caloriesFromHR(opts: {
  avg_hr: number;
  weight_kg: number;
  age: number;
  sex: Sex;
  duration_min: number;
}): number {
  const { avg_hr, weight_kg, age, sex, duration_min } = opts;
  let perMin: number;
  if (sex === "M") {
    perMin = (-55.0969 + 0.6309 * avg_hr + 0.1988 * weight_kg + 0.2017 * age) / 4.184;
  } else if (sex === "F") {
    perMin = (-20.4022 + 0.4472 * avg_hr - 0.1263 * weight_kg + 0.074 * age) / 4.184;
  } else {
    const m = (-55.0969 + 0.6309 * avg_hr + 0.1988 * weight_kg + 0.2017 * age) / 4.184;
    const f = (-20.4022 + 0.4472 * avg_hr - 0.1263 * weight_kg + 0.074 * age) / 4.184;
    perMin = (m + f) / 2;
  }
  return Math.max(0, perMin * duration_min);
}

export function caloriesFromMET(opts: {
  met: number;
  weight_kg: number;
  duration_min: number;
  rpe?: number | null;
}): number {
  const { met, weight_kg, duration_min, rpe } = opts;
  const adjMet = rpe && rpe > 0 ? met * (0.85 + rpe / 50) : met;
  return Math.max(0, adjMet * weight_kg * (duration_min / 60));
}

export const MET = {
  GYM: 5.5,
  RUN_SLOW: 8.3,
  RUN_MEDIUM: 9.8,
  RUN_FAST: 11.5,
  TEST_SPEED: 10, // 60-400m
  TEST_ENDURANCE: 9, // 1000m, Cooper
  WALK: 3.5,
};

/** Choose MET for a running effort given distance (m) and time (sec). */
export function metForRun(distance_m: number, time_sec: number): number {
  if (!distance_m || !time_sec) return MET.RUN_SLOW;
  const paceMinPerKm = time_sec / 60 / (distance_m / 1000);
  if (paceMinPerKm < 4.5) return MET.RUN_FAST;
  if (paceMinPerKm < 5.5) return MET.RUN_MEDIUM;
  return MET.RUN_SLOW;
}

export function metForTest(
  result_type: "TIME" | "DISTANCE",
  distance_m: number | null,
): number {
  if (result_type === "DISTANCE") return MET.TEST_ENDURANCE; // Cooper etc.
  if (distance_m && distance_m >= 800) return MET.TEST_ENDURANCE;
  return MET.TEST_SPEED;
}

/* ----------------- Orchestrators ----------------- */

/** Gym session — needs duration_min. Uses HR if provided, else MET (with RPE bump). */
export function computeCaloriesForSession(
  profile: UserProfileForCalc,
  s: { duration_min: number; avg_hr?: number | null; rpe?: number | null },
): number | null {
  if (!profile.weight_kg || !profile.height_cm) return null;
  const age = ageFromDOB(profile.date_of_birth);
  if (s.avg_hr && age !== null && profile.sex) {
    return round(caloriesFromHR({
      avg_hr: s.avg_hr,
      weight_kg: profile.weight_kg,
      age,
      sex: profile.sex,
      duration_min: s.duration_min,
    }));
  }
  return round(caloriesFromMET({
    met: MET.GYM,
    weight_kg: profile.weight_kg,
    duration_min: s.duration_min,
    rpe: s.rpe ?? null,
  }));
}

/** Test — time_sec or (duration_sec for DISTANCE type). */
export function computeCaloriesForTest(
  profile: UserProfileForCalc,
  t: {
    result_type: "TIME" | "DISTANCE";
    distance_m: number | null;
    duration_sec: number | null; // for DISTANCE tests (e.g. Cooper 720)
    time_sec: number | null;     // for TIME tests
    avg_hr?: number | null;
  },
): number | null {
  if (!profile.weight_kg) return null;
  const effSec =
    t.result_type === "TIME" ? t.time_sec ?? 0 : t.duration_sec ?? 0;
  const duration_min = effSec / 60;
  if (duration_min <= 0) return null;
  const age = ageFromDOB(profile.date_of_birth);
  if (t.avg_hr && age !== null && profile.sex) {
    return round(caloriesFromHR({
      avg_hr: t.avg_hr,
      weight_kg: profile.weight_kg,
      age,
      sex: profile.sex,
      duration_min,
    }));
  }
  const met = metForTest(t.result_type, t.distance_m);
  return round(caloriesFromMET({
    met,
    weight_kg: profile.weight_kg,
    duration_min,
  }));
}

export function computeCaloriesForRace(
  profile: UserProfileForCalc,
  r: { distance_m: number; time_sec: number; avg_hr?: number | null },
): number | null {
  if (!profile.weight_kg) return null;
  const duration_min = r.time_sec / 60;
  if (duration_min <= 0) return null;
  const age = ageFromDOB(profile.date_of_birth);
  if (r.avg_hr && age !== null && profile.sex) {
    return round(caloriesFromHR({
      avg_hr: r.avg_hr,
      weight_kg: profile.weight_kg,
      age,
      sex: profile.sex,
      duration_min,
    }));
  }
  const met = metForRun(r.distance_m, r.time_sec);
  return round(caloriesFromMET({
    met,
    weight_kg: profile.weight_kg,
    duration_min,
  }));
}

function round(n: number): number {
  return Math.round(n);
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario",
  light: "Leggero",
  moderate: "Moderato",
  high: "Alto",
  athlete: "Atleta",
};

export const SEX_LABELS: Record<Sex, string> = {
  M: "Maschio",
  F: "Femmina",
  O: "Altro",
};
