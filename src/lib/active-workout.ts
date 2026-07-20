import { supabase } from "@/integrations/supabase/client";
import { computeCaloriesForSession } from "@/lib/calories";
import { fetchMyProfile } from "@/lib/profile-queries";

const STORAGE_KEY = "progress_sets_active_workout_v1";
const MAX_RECOVERED_DURATION_SEC = 4 * 60 * 60;

export type ActiveWorkoutRowDraft = {
  set_number: number;
  weight: string;
  reps: string;
};

export type ActiveWorkoutDraft = {
  version: 1;
  sessionId: string;
  templateId: string;
  sessionStartedAt: string;
  elapsedSec: number;
  activeIdx: number;
  rowsByExercise: Record<string, ActiveWorkoutRowDraft[]>;
  updatedAt: string;
};

export type ActiveWorkoutSession = {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: string;
  completedSets: number;
  lastCompletedAt: string | null;
};

export type RecoveredLoggedSet = {
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
    typeof draft.templateId === "string" &&
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

function estimateElapsedSeconds(startedAt: string, lastCompletedAt: string | null) {
  const started = new Date(startedAt).getTime();
  const lastActivity = lastCompletedAt ? new Date(lastCompletedAt).getTime() : Date.now();
  if (!Number.isFinite(started) || !Number.isFinite(lastActivity)) return 0;
  return Math.max(
    0,
    Math.min(MAX_RECOVERED_DURATION_SEC, Math.floor((lastActivity - started) / 1000)),
  );
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
  if (!row.template_id) return null;
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
    templateName: templateName || "Allenamento",
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

async function findLatestOpenSession(userId: string, templateId?: string) {
  let query = supabase
    .from("workout_sessions")
    .select("id,template_id,started_at,template:workout_templates(name)")
    .eq("user_id", userId)
    .is("ended_at", null)
    .not("template_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(1);
  if (templateId) query = query.eq("template_id", templateId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? hydrateSession(data) : null;
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

export function ensureActiveWorkout(templateId: string): Promise<ActiveWorkoutBootstrap> {
  const existing = bootstrapPromises.get(templateId);
  if (existing) return existing;
  const promise = (async () => {
    const userId = await getUserId();
    const stored = readActiveWorkoutDraft();
    let session =
      stored?.templateId === templateId
        ? await findOpenSessionById(userId, stored.sessionId)
        : null;
    if (!session) session = await findLatestOpenSession(userId, templateId);
    if (!session) {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ user_id: userId, template_id: templateId })
        .select("id,template_id,started_at,template:workout_templates(name)")
        .single();
      if (error) throw error;
      session = await hydrateSession(data);
    }
    if (!session) throw new Error("Impossibile iniziare l'allenamento");
    const { data: loggedSets, error: setsError } = await supabase
      .from("logged_sets")
      .select("id,exercise_id,set_number,weight_kg,reps,completed_at")
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
  })().finally(() => bootstrapPromises.delete(templateId));
  bootstrapPromises.set(templateId, promise);
  return promise;
}

export async function finishActiveWorkout(session: ActiveWorkoutSession, elapsedSec?: number) {
  const stored = readActiveWorkoutDraft();
  const storedElapsed =
    stored?.sessionId === session.id && Number.isFinite(stored.elapsedSec) ? stored.elapsedSec : 0;
  // Use the latest server activity as a fallback when the device was powered off
  // before the last local draft write completed.
  const recoveredElapsed = estimateElapsedSeconds(session.startedAt, session.lastCompletedAt);
  const effectiveElapsed = Math.max(
    60,
    Math.min(MAX_RECOVERED_DURATION_SEC, elapsedSec ?? Math.max(storedElapsed, recoveredElapsed)),
  );
  const endedAt = new Date(new Date(session.startedAt).getTime() + effectiveElapsed * 1000);
  let calories: number | null = null;
  try {
    const profile = await fetchMyProfile();
    if (profile) {
      calories = computeCaloriesForSession(profile, { duration_min: effectiveElapsed / 60 });
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
