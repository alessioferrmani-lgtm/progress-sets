import { WorkoutSetControls } from "@/components/WorkoutSetControls";
import { addWorkoutSet, configureRows, restoreWorkoutRows, recordedMeasurement, targetValue, type WorkoutRow } from "@/lib/set-measurement";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPreviousSets, fetchTemplate } from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { useRestTimer } from "@/lib/rest-timer-store";
import { toast } from "sonner";
import { X, Check, Plus } from "lucide-react";
import { updateSetFieldAndPropagate } from "@/lib/workout-set-utils";
import { WorkoutRecoveryCard } from "@/components/WorkoutRecoveryCard";
import { WorkoutCompletionPrompt } from "@/components/WorkoutCompletionPrompt";
import { WorkoutExerciseHero } from "@/components/WorkoutExerciseHero";
import { insertLoggedSet } from "@/lib/logged-sets";
import { findNextAfterCompletion } from "@/lib/workout-navigation";
import {
  ensureActiveWorkout,
  finishActiveWorkout,
  getWorkoutElapsedSeconds,
  saveActiveWorkoutDraft,
} from "@/lib/active-workout";

export const Route = createFileRoute("/_authenticated/workouts/$templateId/run")({
  component: RunPage,
});

type Row = WorkoutRow;

function RunPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);

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
    enabled: !isFinishing,
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
  const savingSet = useRef(false);
  const [isSavingSet, setIsSavingSet] = useState(false);

  // Rebuild both completed sets (database) and unconfirmed fields (local draft).
  useEffect(() => {
    if (!templateData || !previous || !activeWorkoutData || rowsInitialized) return;
    const next: Record<string, Row[]> = {};
    templateData.exercises.forEach(ex => {
      next[ex.id] = restoreWorkoutRows({
        targetSets: ex.target_sets, unilateral: ex.is_unilateral, type: ex.reps_type,
        targetWeight: ex.target_weight_kg, target: targetValue(ex.reps_display, ex.reps_type, ex.target_reps),
        saved: activeWorkoutData.draft.rowsByExercise[ex.id] ?? [],
        logged: activeWorkoutData.loggedSets.filter(set => set.exercise_id === ex.exercise_id),
        previous: previous.get(ex.exercise_id),
      });
    });
    setRowsByExercise(next);
    setActiveIdx(
      Math.min(activeWorkoutData.draft.activeIdx, Math.max(templateData.exercises.length - 1, 0)),
    );
    const restoredExercise = templateData.exercises[Math.min(activeWorkoutData.draft.activeIdx, Math.max(templateData.exercises.length - 1, 0))];
    setActiveSetIdx(Math.max(0,Math.min(activeWorkoutData.draft.activeSetIdx ?? 0, (next[restoredExercise?.id]?.length ?? 1) - 1)));
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
      if (finishingRef.current) return;
      const bootstrap = activeWorkoutData;
      if (!bootstrap || !rowsInitialized || restoredTimerSessionId !== bootstrap.session.id) return;
      saveActiveWorkoutDraft({
        version: 1,
        sessionId: bootstrap.session.id,
        templateId,
        sessionStartedAt: bootstrap.session.startedAt,
        elapsedSec: getWorkoutElapsedSeconds(bootstrap.session.startedAt),
        activeIdx: nextActiveIdx,
        activeSetIdx,
        rowsByExercise: Object.fromEntries(
          Object.entries(rowsByExercise).map(([exerciseId, exerciseRows]) => [
            exerciseId,
            exerciseRows.map(({ completed, completedAt, logId, ...draft }) => draft),
          ]),
        ),
        updatedAt: new Date().toISOString(),
      });
    },
    [
      activeIdx,
      activeSetIdx,
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

  const saveSet = async (rowIdx: number) => {
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
    let measurement;
    try { measurement = recordedMeasurement(row); }
    catch(error) { toast.error(error instanceof Error ? error.message : "Valore non valido"); return; }
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
      ...measurement,
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
    const next = findNextAfterCompletion(
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

  const confirmSet = async (rowIdx: number) => {
    if (savingSet.current || isFinishing) return;
    savingSet.current = true; setIsSavingSet(true);
    try { await saveSet(rowIdx); } catch(error) { toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito"); }
    finally { savingSet.current = false; setIsSavingSet(false); }
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
    if (!sessionId || !activeWorkout.data || isFinishing || savingSet.current) return;
    if (Object.values(rowsByExercise).flat().some(row => row.clock?.startedAt != null)) return toast.error("Ferma il cronometro della serie prima di terminare");
    persistWorkout();
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      await finishActiveWorkout(activeWorkout.data.session, elapsed, completedSets > 0);
    } catch (reason) {
      toast.error(
        `Impossibile salvare l'allenamento: ${reason instanceof Error ? reason.message : "errore sconosciuto"}`,
      );
      finishingRef.current = false;
      setIsFinishing(false);
      return;
    }
    timer.skip();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
      queryClient.invalidateQueries({ queryKey: ["dash"] }),
      queryClient.invalidateQueries({ queryKey: ["previous-sets"] }),
    ]);
    await navigate({ to: "/sessions/$sessionId/summary", params: { sessionId } });
    queryClient.removeQueries({ queryKey: ["active-workout-bootstrap", templateId] });
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
    <div className="workout-screen mx-auto flex w-full max-w-md flex-col">
      <section className="workout-top-shell shrink-0">
        {/* Header */}
        <div className="workout-screen-header ios-blur sticky top-0 z-10 flex shrink-0 items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
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
            disabled={isFinishing}
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            Fine
          </button>
        </div>

        {/* Exercise tabs */}
        <div className="workout-screen-tabs scrollbar-none flex shrink-0 gap-2 overflow-x-auto px-4 py-3">
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
                {ex.exercise.name} · {done}/{list.length || ex.target_sets}
              </button>
            );
          })}
        </div>

        {activeEx && activeRow && (
          <WorkoutExerciseHero
            exerciseName={activeEx.exercise.name}
            exercisePosition={activeIdx + 1}
            exerciseCount={exercises.length}
            seriesPosition={activeRow.side && activeRow.side !== "both" ? Math.ceil((activeSetIdx + 1) / 2) : activeSetIdx + 1}
            side={activeRow.side}
            seriesCount={activeRow.side && activeRow.side !== "both" ? Math.ceil(rows.length / 2) : rows.length}
            completedSets={completedSets}
            totalSets={totalSets}
            objective={activeEx.objective}
            rir={activeEx.rir}
            alternative={activeEx.alternative}
            onSkip={skipExercise}
          />
        )}
      </section>

      {activeEx &&
        activeRow &&
        (() => {
          const isCount = activeEx.reps_type === "count";
          return (
            <div className="workout-screen-content flex min-h-0 flex-col gap-3 px-4 pb-6">
              <div className="workout-set-card ios-card overflow-hidden p-4">
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

                <div className="workout-rest-meta mb-4 flex items-center justify-between gap-3 text-xs text-label-secondary">
                  <span>Recupero target: {activeEx.rest_seconds}s</span>
                  {!isCount && activeEx.reps_display ? <span>{activeEx.reps_display}</span> : null}
                </div>

                <WorkoutSetControls rows={rows} index={activeSetIdx} onSelect={setActiveSetIdx}
                  anotherClockRunning={Object.values(rowsByExercise).flat().some(row => row !== activeRow && row.clock?.startedAt != null)}
                  onField={(field,value) => setRowsByExercise(current => ({...current,[activeEx.id]: updateSetFieldAndPropagate(current[activeEx.id] ?? [],activeSetIdx,field,value)}))}
                  onPatch={patch => setRowsByExercise(current => ({...current,[activeEx.id]: current[activeEx.id].map((row,i) => i === activeSetIdx ? {...row,...patch} : row)}))}
                  onConfigure={(unilateral,type) => {setRowsByExercise(current => ({...current,[activeEx.id]: configureRows(current[activeEx.id],unilateral,type)}));setActiveSetIdx(0);}}
                />

                <button
                  type="button"
                  onClick={() => confirmSet(activeSetIdx)}
                  disabled={isSavingSet || isFinishing}
                  aria-label={activeRow.completed ? "Rimuovi spunta serie" : "Conferma serie"}
                  className={
                    "workout-confirm " +
                    "mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-semibold text-white active:scale-[0.99] " +
                    (activeRow.completed ? "bg-success" : "bg-accent")
                  }
                >
                  <Check className="size-5" />
                  {isSavingSet ? "Salvataggio…" : activeRow.completed ? "Serie completata · correggi" : "Conferma serie"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRowsByExercise((current) => {
                      const list = addWorkoutSet(current[activeEx.id] ?? []);
                      return { ...current, [activeEx.id]: list };
                    });
                    setActiveSetIdx(rows.length);
                  }}
                  className="workout-add-series mt-3 flex w-full items-center justify-center gap-1 py-2 text-sm font-medium text-accent active:opacity-70"
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
