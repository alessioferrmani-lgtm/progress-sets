import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPreviousSets, fetchTemplate } from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { useRestTimer } from "@/lib/rest-timer-store";
import { toast } from "sonner";
import { X, Check, Plus, Minus, SkipForward } from "lucide-react";
import { updateWeightAndPropagate } from "@/lib/workout-set-utils";
import { WorkoutRecoveryCard } from "@/components/WorkoutRecoveryCard";
import { WorkoutCompletionPrompt } from "@/components/WorkoutCompletionPrompt";
import { WorkoutExerciseHero } from "@/components/WorkoutExerciseHero";
import { insertLoggedSet } from "@/lib/logged-sets";
import { findNextUncompletedSet } from "@/lib/workout-navigation";
import {
  ensureActiveWorkout,
  finishActiveWorkout,
  getWorkoutElapsedSeconds,
  saveActiveWorkoutDraft,
} from "@/lib/active-workout";

export const Route = createFileRoute("/_authenticated/workouts/$templateId/run")({
  component: RunPage,
});

type Row = {
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
  completedAt?: number;
  logId?: string;
};

function RunPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templateData } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTemplate(templateId),
  });

  const exercises = useMemo(() => templateData?.exercises ?? [], [templateData?.exercises]);
  const exerciseIds = useMemo(() => exercises.map((e) => e.exercise_id), [exercises]);

  const { data: previous } = useQuery({
    queryKey: ["previous-sets", exerciseIds.join(",")],
    queryFn: () => fetchPreviousSets(exerciseIds),
    enabled: exerciseIds.length > 0,
  });

  const activeWorkout = useQuery({
    queryKey: ["active-workout-bootstrap", templateId],
    queryFn: () => ensureActiveWorkout(templateId),
    staleTime: Infinity,
    retry: 1,
  });
  const activeWorkoutData = activeWorkout.data;
  const sessionId = activeWorkoutData?.session.id ?? null;
  const [timerStartedAt, setTimerStartedAt] = useState(Date.now());
  const [restoredTimerSessionId, setRestoredTimerSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkoutData) return;
    setTimerStartedAt(new Date(activeWorkoutData.session.startedAt).getTime());
    setRestoredTimerSessionId(activeWorkoutData.session.id);
  }, [activeWorkoutData]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, Row[]>>({});
  const [rowsInitialized, setRowsInitialized] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Rebuild both completed sets (database) and unconfirmed fields (local draft).
  useEffect(() => {
    if (!templateData || !previous || !activeWorkoutData || rowsInitialized) return;
    const completedByKey = new Map<string, (typeof activeWorkoutData.loggedSets)[number]>();
    activeWorkoutData.loggedSets.forEach((set) => {
      completedByKey.set(`${set.exercise_id}:${set.set_number}`, set);
    });
    const next: Record<string, Row[]> = {};
    templateData.exercises.forEach((ex) => {
      const prevMap = previous.get(ex.exercise_id);
      const firstPrevious = prevMap?.get(1);
      const savedRows = activeWorkoutData.draft.rowsByExercise[ex.id] ?? [];
      const completedSetNumbers = activeWorkoutData.loggedSets
        .filter((set) => set.exercise_id === ex.exercise_id)
        .map((set) => set.set_number);
      const rowCount = Math.max(ex.target_sets, savedRows.length, ...completedSetNumbers, 0);
      next[ex.id] = Array.from({ length: rowCount }, (_, i) => {
        const setNum = i + 1;
        const p = prevMap?.get(setNum);
        const completed = completedByKey.get(`${ex.exercise_id}:${setNum}`);
        const saved = savedRows[i];
        const kg =
          completed?.weight_kg ??
          saved?.weight ??
          p?.weight_kg ??
          firstPrevious?.weight_kg ??
          ex.target_weight_kg ??
          0;
        const reps =
          completed?.reps ??
          saved?.reps ??
          p?.reps ??
          firstPrevious?.reps ??
          ex.target_reps ??
          null;
        return {
          set_number: setNum,
          weight: kg ? String(kg) : "",
          reps: reps ? String(reps) : "",
          completed: Boolean(completed),
          completedAt: completed ? new Date(completed.completed_at).getTime() : undefined,
          logId: completed?.id,
        };
      });
    });
    setRowsByExercise(next);
    setActiveIdx(
      Math.min(activeWorkoutData.draft.activeIdx, Math.max(templateData.exercises.length - 1, 0)),
    );
    setActiveSetIdx(0);
    setRowsInitialized(true);
  }, [activeWorkoutData, previous, rowsInitialized, templateData]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - timerStartedAt) / 1000));
  const em = Math.floor(elapsed / 60);
  const es = String(elapsed % 60).padStart(2, "0");
  const persistTick = Math.floor(now / 5000);

  const persistWorkout = useCallback(
    (nextActiveIdx = activeIdx) => {
      const bootstrap = activeWorkoutData;
      if (!bootstrap || !rowsInitialized || restoredTimerSessionId !== bootstrap.session.id) return;
      saveActiveWorkoutDraft({
        version: 1,
        sessionId: bootstrap.session.id,
        templateId,
        sessionStartedAt: bootstrap.session.startedAt,
        elapsedSec: getWorkoutElapsedSeconds(bootstrap.session.startedAt),
        activeIdx: nextActiveIdx,
        rowsByExercise: Object.fromEntries(
          Object.entries(rowsByExercise).map(([exerciseId, exerciseRows]) => [
            exerciseId,
            exerciseRows.map(({ set_number, weight, reps }) => ({ set_number, weight, reps })),
          ]),
        ),
        updatedAt: new Date().toISOString(),
      });
    },
    [
      activeIdx,
      activeWorkoutData,
      restoredTimerSessionId,
      rowsInitialized,
      rowsByExercise,
      templateId,
    ],
  );

  useEffect(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") return;
    persistWorkout();
  }, [persistTick, persistWorkout]);

  useEffect(() => {
    if (!sessionId) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        persistWorkout();
        return;
      }
      // iOS can suspend JavaScript timers while the app is in the background.
      // Re-anchor to the persisted session start instead of the stale draft
      // duration, then force an immediate render with the current wall clock.
      setTimerStartedAt(new Date(activeWorkoutData?.session.startedAt ?? "").getTime());
      setNow(Date.now());
    };
    const handleUnload = () => persistWorkout();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [activeWorkoutData?.session.startedAt, persistWorkout, sessionId]);

  const timer = useRestTimer();

  const activeEx = exercises[activeIdx];
  const rows = activeEx ? (rowsByExercise[activeEx.id] ?? []) : [];
  const activeRow = rows[activeSetIdx] ?? rows[0];

  const initializedSetCount = Object.values(rowsByExercise).reduce(
    (total, exerciseRows) => total + exerciseRows.length,
    0,
  );
  const totalSets =
    initializedSetCount || exercises.reduce((total, exercise) => total + exercise.target_sets, 0);
  const completedSets = Object.values(rowsByExercise)
    .flat()
    .filter((r) => r.completed).length;

  const confirmSet = async (rowIdx: number) => {
    if (!sessionId || !activeEx) return;
    const row = rows[rowIdx];
    if (row.completed) {
      if (!row.logId) {
        toast.error("Serie non ancora sincronizzata");
        return;
      }
      const { error } = await supabase
        .from("logged_sets")
        .delete()
        .eq("id", row.logId)
        .eq("session_id", sessionId);
      if (error) {
        toast.error(`Impossibile annullare la serie: ${error.message}`);
        return;
      }
      setRowsByExercise((current) => {
        const next = { ...current };
        const list = [...(next[activeEx.id] ?? [])];
        list[rowIdx] = {
          ...list[rowIdx],
          completed: false,
          completedAt: undefined,
          logId: undefined,
        };
        next[activeEx.id] = list;
        return next;
      });
      timer.skip();
      toast.success("Spunta rimossa: ora puoi correggere la serie");
      return;
    }
    const weight = Number(row.weight || 0);
    const isCount = activeEx.reps_type === "count";
    // For time/distance/unspecified sets we don't require a numeric rep count.
    const reps = isCount ? parseInt(row.reps || "0", 10) : 1;
    if (isCount && !reps) {
      toast.error("Inserisci le ripetizioni");
      return;
    }
    // Compute rest_taken vs previous completed set in this session (any exercise)
    const allCompleted = Object.values(rowsByExercise)
      .flat()
      .filter((r) => r.completed && r.completedAt);
    const lastTs = allCompleted.length
      ? Math.max(...allCompleted.map((r) => r.completedAt!))
      : null;
    const restTaken = lastTs ? Math.round((Date.now() - lastTs) / 1000) : null;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      toast.error("Sessione scaduta: accedi di nuovo");
      return;
    }
    const { data, error } = await insertLoggedSet({
      user_id: userData.user.id,
      session_id: sessionId,
      exercise_id: activeEx.exercise_id,
      set_number: row.set_number,
      weight_kg: weight,
      reps,
      rest_taken_sec: restTaken,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const completedAt = Date.now();
    setRowsByExercise((current) => {
      const next = { ...current };
      const list = [...(next[activeEx.id] ?? [])];
      list[rowIdx] = { ...list[rowIdx], completed: true, completedAt, logId: data.id };
      next[activeEx.id] = list;
      return next;
    });
    const next = findNextUncompletedSet(
      exercises.map((ex) => ex.id),
      rowsByExercise,
      {
        exerciseIndex: activeIdx,
        setIndex: rowIdx,
      },
    );
    if (next) {
      timer.start(activeEx.rest_seconds, activeEx.exercise_id, activeEx.exercise.name);
      setActiveIdx(next.exerciseIndex);
      setActiveSetIdx(next.setIndex);
    } else {
      timer.skip();
      setShowCompletionPrompt(true);
    }
  };

  const skipExercise = () => {
    if (!activeEx) return;
    const nextIndex = activeIdx + 1;
    timer.skip();
    if (nextIndex >= exercises.length) {
      setShowCompletionPrompt(true);
      return;
    }
    setActiveIdx(nextIndex);
    setActiveSetIdx(0);
    persistWorkout(nextIndex);
    toast.success(`Passato a ${exercises[nextIndex].exercise.name}`);
  };

  const finish = async () => {
    if (!sessionId || !activeWorkout.data || isFinishing) return;
    setIsFinishing(true);
    persistWorkout();
    try {
      await finishActiveWorkout(activeWorkout.data.session, elapsed, completedSets > 0);
    } catch (reason) {
      toast.error(
        `Impossibile salvare l'allenamento: ${reason instanceof Error ? reason.message : "errore sconosciuto"}`,
      );
      setIsFinishing(false);
      return;
    }
    timer.skip();
    queryClient.removeQueries({ queryKey: ["active-workout-bootstrap", templateId] });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
      queryClient.invalidateQueries({ queryKey: ["dash"] }),
      queryClient.invalidateQueries({ queryKey: ["previous-sets"] }),
    ]);
    navigate({ to: "/sessions/$sessionId/summary", params: { sessionId } });
    setIsFinishing(false);
  };

  const cancel = async () => {
    if (!confirm("Uscire dall’allenamento? Potrai continuarlo senza perdere i dati.")) return;
    persistWorkout();
    timer.skip();
    navigate({ to: "/workouts" });
  };

  if (activeWorkout.isError) {
    return (
      <div className="p-6 text-center text-danger">
        Impossibile recuperare l’allenamento: {activeWorkout.error.message}
      </div>
    );
  }

  if (!templateData || activeWorkout.isPending) {
    return <div className="p-6 text-center text-label-tertiary">Caricamento…</div>;
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="ios-blur sticky top-0 z-10 flex items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          onClick={cancel}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-label"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-label">
            {templateData.template.name}
          </div>
          <div className="font-mono text-xs tabular-nums text-label-secondary">
            {em}:{es} · {completedSets}/{totalSets} serie
          </div>
        </div>
        <button
          onClick={finish}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
        >
          Fine
        </button>
      </div>

      {/* Exercise tabs */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
        {exercises.map((ex, i) => {
          const list = rowsByExercise[ex.id] ?? [];
          const done = list.filter((r) => r.completed).length;
          const isActive = i === activeIdx;
          return (
            <button
              key={ex.id}
              onClick={() => {
                setActiveIdx(i);
                setActiveSetIdx(0);
              }}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                (isActive ? "bg-accent text-accent-foreground" : "bg-fill text-label-secondary")
              }
            >
              {ex.exercise.name} · {done}/{ex.target_sets}
            </button>
          );
        })}
      </div>

      {activeEx &&
        activeRow &&
        (() => {
          const isCount = activeEx.reps_type === "count";
          const previousSet = previous?.get(activeEx.exercise_id)?.get(activeRow.set_number);
          return (
            <div className="space-y-3 px-4 pb-6">
              <WorkoutExerciseHero
                exerciseName={activeEx.exercise.name}
                exercisePosition={activeIdx + 1}
                exerciseCount={exercises.length}
                seriesPosition={activeSetIdx + 1}
                seriesCount={rows.length}
                completedSets={completedSets}
                totalSets={totalSets}
                onSkip={skipExercise}
              />
              <div className="ios-card overflow-hidden p-4">
                <div className="hidden">
                  <div>
                    <div className="text-2xl font-bold text-label">{activeEx.exercise.name}</div>
                    <div className="mt-1 text-xs text-label-secondary">
                      Recupero target: {activeEx.rest_seconds}s
                      {!isCount && activeEx.reps_display ? ` · ${activeEx.reps_display}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-fill px-3 py-1.5 text-sm font-semibold text-label-secondary">
                    Serie <span className="text-accent">{activeSetIdx + 1}</span> di {rows.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={skipExercise}
                  aria-label="Salta esercizio"
                  className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent active:opacity-80"
                >
                  <SkipForward className="size-4" /> Salta esercizio
                </button>

                <div className="mb-4 flex items-center justify-between gap-3 text-xs text-label-secondary">
                  <span>Recupero target: {activeEx.rest_seconds}s</span>
                  {!isCount && activeEx.reps_display ? <span>{activeEx.reps_display}</span> : null}
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {rows.map((row, index) => (
                    <button
                      key={row.set_number}
                      type="button"
                      onClick={() => setActiveSetIdx(index)}
                      className={
                        "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold " +
                        (index === activeSetIdx
                          ? "border-accent bg-accent text-accent-foreground"
                          : row.completed
                            ? "border-success bg-success/15 text-success"
                            : "border-separator bg-fill text-label-secondary")
                      }
                      aria-label={`Seleziona serie ${row.set_number}`}
                    >
                      {row.set_number}
                    </button>
                  ))}
                </div>

                {previousSet && (
                  <div className="mt-4 rounded-xl bg-fill-secondary px-3 py-2 text-center text-xs text-label-secondary">
                    Precedente: {previousSet.weight_kg} kg × {previousSet.reps}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-fill-secondary p-3 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-label-tertiary">
                      Carico kg
                    </div>
                    <NumberCell
                      value={activeRow.weight}
                      disabled={activeRow.completed}
                      large
                      step={2.5}
                      onChange={(value) =>
                        setRowsByExercise((current) => ({
                          ...current,
                          [activeEx.id]: updateWeightAndPropagate(
                            current[activeEx.id] ?? [],
                            activeSetIdx,
                            value,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="rounded-2xl bg-fill-secondary p-3 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-label-tertiary">
                      {isCount ? "Ripetizioni" : "Target"}
                    </div>
                    {isCount ? (
                      <NumberCell
                        value={activeRow.reps}
                        disabled={activeRow.completed}
                        large
                        step={1}
                        integer
                        onChange={(value) =>
                          setRowsByExercise((current) => {
                            const next = { ...current };
                            const list = [...(next[activeEx.id] ?? [])];
                            list[activeSetIdx] = { ...list[activeSetIdx], reps: value };
                            next[activeEx.id] = list;
                            return next;
                          })
                        }
                      />
                    ) : (
                      <div className="mt-4 text-3xl font-semibold text-label">
                        {activeEx.reps_display ?? "—"}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => confirmSet(activeSetIdx)}
                  aria-label={activeRow.completed ? "Rimuovi spunta serie" : "Conferma serie"}
                  className={
                    "mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-semibold text-white active:scale-[0.99] " +
                    (activeRow.completed ? "bg-success" : "bg-accent")
                  }
                >
                  <Check className="size-5" />
                  {activeRow.completed ? "Serie completata · correggi" : "Conferma serie"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRowsByExercise((current) => {
                      const list = [...(current[activeEx.id] ?? [])];
                      const nextNum = list.length + 1;
                      const prev = previous?.get(activeEx.exercise_id)?.get(nextNum);
                      const reference = list[list.length - 1] ?? list[0];
                      list.push({
                        set_number: nextNum,
                        weight: String(
                          prev?.weight_kg ?? reference?.weight ?? activeEx.target_weight_kg ?? "",
                        ),
                        reps: String(prev?.reps ?? reference?.reps ?? activeEx.target_reps ?? ""),
                        completed: false,
                      });
                      return { ...current, [activeEx.id]: list };
                    });
                    setActiveSetIdx(rows.length);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-sm font-medium text-accent active:opacity-70"
                >
                  <Plus className="size-4" /> Aggiungi serie
                </button>
              </div>
              <WorkoutRecoveryCard />
            </div>
          );
        })()}
      {showCompletionPrompt && (
        <WorkoutCompletionPrompt
          isFinishing={isFinishing}
          onContinue={() => setShowCompletionPrompt(false)}
          onFinish={finish}
        />
      )}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  disabled,
  step,
  integer,
  large,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  step: number;
  integer?: boolean;
  large?: boolean;
}) {
  const inc = (dir: 1 | -1) => {
    const n = Number(value || 0) + dir * step;
    if (n < 0) return;
    onChange(integer ? String(Math.round(n)) : String(Math.round(n * 100) / 100));
  };
  return (
    <div
      className={large ? "mt-3 flex items-center justify-center gap-2" : "flex items-center gap-1"}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(-1)}
        className={
          large
            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-label active:opacity-70 disabled:opacity-40"
            : "flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
        }
        aria-label="Diminuisci"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={
          large
            ? "w-full min-w-0 bg-transparent py-1 text-center text-4xl font-semibold tabular-nums text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
            : "w-full min-w-0 rounded-md bg-fill-secondary py-1.5 text-center text-sm font-medium text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
        }
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(1)}
        className={
          large
            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-label active:opacity-70 disabled:opacity-40"
            : "flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
        }
        aria-label="Aumenta"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
