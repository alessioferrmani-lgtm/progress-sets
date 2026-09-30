import type { SetMetadata, SetClock } from "./set-measurement";
import { supabase } from "@/integrations/supabase/client";
import { computeCaloriesForSession } from "@/lib/calories";
import { fetchMyProfile } from "@/lib/profile-queries";

const STORAGE_KEY = "progress_sets_active_workout_v1";
const MAX_RECOVERED_DURATION_SEC = 4 * 60 * 60;

export type ActiveWorkoutRowDraft = SetMetadata & {
  clock?: SetClock;
  set_number: number;
  weight: string;
  reps: string;
};

export type ActiveWorkoutDraft = {
  version: 1;
  sessionId: string;
  /** Null identifies a free workout without a saved template. */
  templateId: string | null;
  sessionStartedAt: string;
  elapsedSec: number;
  activeIdx: number;
  activeSetIdx?: number;
  /** Exercise ids selected during a free workout. */
  exerciseIds?: string[];
  rowsByExercise: Record<string, ActiveWorkoutRowDraft[]>;
  updatedAt: string;
};

export type ActiveWorkoutSession = {
  id: string;
  /** Null identifies a free workout without a saved template. */
  templateId: string | null;
  templateName: string;
  startedAt: string;
  completedSets: number;
  lastCompletedAt: string | null;
};

export type RecoveredLoggedSet = SetMetadata & {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
};

export type ActiveWorkoutBootstrap = {
  session: ActiveWorkoutSession;
  draft: ActiveWorkoutDraft;
  loggedSets: RecoveredLoggedSet[];
};

function isDraft(value: unknown): value is ActiveWorkoutDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<ActiveWorkoutDraft>;
  return (
    draft.version === 1 &&
    typeof draft.sessionId === "string" &&
    (typeof draft.templateId === "string" || draft.templateId === null) &&
    typeof draft.sessionStartedAt === "string" &&
    typeof draft.elapsedSec === "number" &&
    Number.isFinite(draft.elapsedSec) &&
    typeof draft.activeIdx === "number" &&
    !!draft.rowsByExercise &&
    typeof draft.rowsByExercise === "object"
  );
}

export function readActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // The database still preserves every confirmed set if local storage is unavailable.
  }
}

export function clearActiveWorkoutDraft(sessionId?: string) {
  if (typeof window === "undefined") return;
  try {
    const current = readActiveWorkoutDraft();
    if (!sessionId || !current || current.sessionId === sessionId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

/**
 * The session start stored by Supabase is the single source of truth for the
 * workout clock. A draft can be several minutes old when iOS suspends the
 * page, so deriving the duration from draft.elapsedSec would make the timer
 * jump backwards after pressing "Continua allenamento".
 */
export function getWorkoutElapsedSeconds(startedAt: string, now = Date.now()) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(MAX_RECOVERED_DURATION_SEC, Math.floor((now - started) / 1000)));
}

function estimateElapsedSeconds(startedAt: string, _lastCompletedAt: string | null) {
  return getWorkoutElapsedSeconds(startedAt);
}

function makeDraft(session: ActiveWorkoutSession): ActiveWorkoutDraft {
  const stored = readActiveWorkoutDraft();
  if (stored?.sessionId === session.id) return stored;
  return {
    version: 1,
    sessionId: session.id,
    templateId: session.templateId,
    sessionStartedAt: session.startedAt,
    elapsedSec: estimateElapsedSeconds(session.startedAt, session.lastCompletedAt),
    activeIdx: 0,
    rowsByExercise: {},
    updatedAt: new Date().toISOString(),
  };
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sessione scaduta: accedi di nuovo");
  return data.user.id;
}

async function hydrateSession(row: {
  id: string;
  template_id: string | null;
  started_at: string;
  template: unknown;
}): Promise<ActiveWorkoutSession | null> {
  const [{ count, error: countError }, { data: lastSet, error: lastSetError }] = await Promise.all([
    supabase
      .from("logged_sets")
      .select("id", { count: "exact", head: true })
      .eq("session_id", row.id),
    supabase
      .from("logged_sets")
      .select("completed_at")
      .eq("session_id", row.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (countError) throw countError;
  if (lastSetError) throw lastSetError;
  const template = row.template as { name?: string } | Array<{ name?: string }> | null;
  const templateName = Array.isArray(template) ? template[0]?.name : template?.name;
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: templateName || (row.template_id ? "Allenamento" : "Allenamento libero"),
    startedAt: row.started_at,
    completedSets: count ?? 0,
    lastCompletedAt: lastSet?.completed_at ?? null,
  };
}

async function findOpenSessionById(userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id,template_id,started_at,template:workout_templates(name)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateSession(data) : null;
}

async function findLatestOpenSession(userId: string, templateId?: string | null) {
  let query = supabase
    .from("workout_sessions")
    .select("id,template_id,started_at,template:workout_templates(name)")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1);
  if (templateId === null) query = query.is("template_id", null);
  else if (templateId) query = query.eq("template_id", templateId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? hydrateSession(data) : null;
}

/**
 * Creates the single open session allowed for a workout type.
 *
 * The partial unique index in the database is the final guard against two
 * browser tabs starting the same workout at the same time. If another tab
 * wins that race, reuse its session instead of surfacing a duplicate-key
 * error to the athlete.
 */
async function createOpenSession(userId: string, templateId: string | null) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: userId, template_id: templateId })
    .select("id,template_id,started_at,template:workout_templates(name)")
    .single();

  if (!error) return data ? hydrateSession(data) : null;
  if (error.code === "23505") return findLatestOpenSession(userId, templateId);
  throw error;
}

export async function fetchInterruptedWorkout(): Promise<ActiveWorkoutSession | null> {
  const userId = await getUserId();
  const stored = readActiveWorkoutDraft();
  if (stored) {
    const exact = await findOpenSessionById(userId, stored.sessionId);
    if (exact) return exact;
    clearActiveWorkoutDraft(stored.sessionId);
  }
  return findLatestOpenSession(userId);
}

const bootstrapPromises = new Map<string, Promise<ActiveWorkoutBootstrap>>();

type WebLockManagerLike = {
  request<T>(name: string, options: { mode: "exclusive" }, callback: () => Promise<T>): Promise<T>;
};

async function withBootstrapLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined") return task();
  const lockManager = (navigator as Navigator & { locks?: WebLockManagerLike }).locks;
  if (!lockManager) return task();
  return lockManager.request(`progress-sets:active-workout:${key}`, { mode: "exclusive" }, task);
}

export function ensureActiveWorkout(templateId: string): Promise<ActiveWorkoutBootstrap> {
  const existing = bootstrapPromises.get(templateId);
  if (existing) return existing;
  const promise = withBootstrapLock(`template:${templateId}`, async () => {
    const userId = await getUserId();
    const stored = readActiveWorkoutDraft();
    let session =
      stored?.templateId === templateId
        ? await findOpenSessionById(userId, stored.sessionId)
        : null;
    if (!session) session = await findLatestOpenSession(userId, templateId);
    if (!session) session = await createOpenSession(userId, templateId);
    if (!session) throw new Error("Impossibile iniziare l'allenamento");
    const { data: loggedSets, error: setsError } = await supabase
      .from("logged_sets")
      .select("id,exercise_id,set_number,weight_kg,reps,completed_at,side,reps_type,duration_sec,distance_m")
      .eq("session_id", session.id)
      .order("completed_at");
    if (setsError) throw setsError;
    const draft = makeDraft(session);
    saveActiveWorkoutDraft(draft);
    return {
      session,
      draft,
      loggedSets: (loggedSets ?? []) as RecoveredLoggedSet[],
    };
  }).finally(() => bootstrapPromises.delete(templateId));
  bootstrapPromises.set(templateId, promise);
  return promise;
}

/**
 * Start or resume a workout that is built while the user trains.
 *
 * Free workouts intentionally use the existing nullable template_id column;
 * this keeps them visible to the same dashboard, summary, export and RLS
 * queries as guided sessions without creating a second session table.
 */
export function ensureFreeWorkout(): Promise<ActiveWorkoutBootstrap> {
  const key = "free";
  const existing = bootstrapPromises.get(key);
  if (existing) return existing;
  const promise = withBootstrapLock("free", async () => {
    const userId = await getUserId();
    const stored = readActiveWorkoutDraft();
    let session =
      stored?.templateId === null ? await findOpenSessionById(userId, stored.sessionId) : null;
    if (!session) session = await findLatestOpenSession(userId, null);
    if (!session) session = await createOpenSession(userId, null);
    if (!session) throw new Error("Impossibile iniziare l'allenamento libero");
    const { data: loggedSets, error: setsError } = await supabase
      .from("logged_sets")
      .select("id,exercise_id,set_number,weight_kg,reps,completed_at,side,reps_type,duration_sec,distance_m")
      .eq("session_id", session.id)
      .order("completed_at");
    if (setsError) throw setsError;
    const draft = makeDraft(session);
    saveActiveWorkoutDraft(draft);
    return {
      session,
      draft,
      loggedSets: (loggedSets ?? []) as RecoveredLoggedSet[],
    };
  }).finally(() => bootstrapPromises.delete(key));
  bootstrapPromises.set(key, promise);
  return promise;
}

type FinishWorkoutResult = { endedAt: Date; calories: number | null };

// A fast double tap or two mounted tabs can otherwise submit the same finish
// operation twice. Sharing the in-flight promise makes closing a session
// idempotent within this browser context.
const finishPromises = new Map<string, Promise<FinishWorkoutResult>>();

export function finishActiveWorkout(
  session: ActiveWorkoutSession,
  elapsedSec?: number,
  hasCompletedSets = session.completedSets > 0,
): Promise<FinishWorkoutResult> {
  const existing = finishPromises.get(session.id);
  if (existing) return existing;

  const promise = finishActiveWorkoutInternal(session, elapsedSec, hasCompletedSets).finally(() => {
    finishPromises.delete(session.id);
  });
  finishPromises.set(session.id, promise);
  return promise;
}

async function finishActiveWorkoutInternal(
  session: ActiveWorkoutSession,
  elapsedSec?: number,
  hasCompletedSets = session.completedSets > 0,
): Promise<FinishWorkoutResult> {
  const stored = readActiveWorkoutDraft();
  const storedElapsed =
    stored?.sessionId === session.id && Number.isFinite(stored.elapsedSec) ? stored.elapsedSec : 0;
  // Use the latest server activity as a fallback when the device was powered off
  // before the last local draft write completed.
  const recoveredElapsed = estimateElapsedSeconds(session.startedAt, session.lastCompletedAt);
  const recoveredMax = Math.max(storedElapsed, recoveredElapsed);
  const effectiveElapsed = Math.min(
    MAX_RECOVERED_DURATION_SEC,
    Math.max(0, elapsedSec ?? 0, recoveredMax),
  );
  const endedAt = new Date(new Date(session.startedAt).getTime() + effectiveElapsed * 1000);
  let calories: number | null = hasCompletedSets ? null : 0;
  try {
    const profile = await fetchMyProfile();
    if (profile && hasCompletedSets) {
      // Keep a just-completed set measurable without inventing a full minute
      // of activity. The previous one-minute floor inflated empty sessions.
      calories = computeCaloriesForSession(profile, {
        duration_min: Math.max(1, effectiveElapsed) / 60,
      });
    }
  } catch {
    // The workout can still be saved if calorie calculation is unavailable.
  }
  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: endedAt.toISOString(), calories_burned: calories })
    .eq("id", session.id);
  if (error) throw error;
  clearActiveWorkoutDraft(session.id);
  return { endedAt, calories };
}

export async function deleteActiveWorkout(sessionId: string) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Allenamento non trovato");
  clearActiveWorkoutDraft(sessionId);
}
