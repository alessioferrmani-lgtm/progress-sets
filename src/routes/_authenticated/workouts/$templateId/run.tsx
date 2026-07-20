import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPreviousSets, fetchTemplate, type TemplateExercise } from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { useRestTimer } from "@/lib/rest-timer-store";
import { toast } from "sonner";
import { X, Check, Plus, Minus } from "lucide-react";
import { updateWeightAndPropagate } from "@/lib/workout-set-utils";
import {
  ensureActiveWorkout,
  finishActiveWorkout,
  readActiveWorkoutDraft,
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
    setTimerStartedAt(Date.now() - activeWorkoutData.draft.elapsedSec * 1000);
    setRestoredTimerSessionId(activeWorkoutData.session.id);
  }, [activeWorkoutData]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, Row[]>>({});
  const [rowsInitialized, setRowsInitialized] = useState(false);

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

  const persistWorkout = useCallback(() => {
    const bootstrap = activeWorkoutData;
    if (!bootstrap || !rowsInitialized || restoredTimerSessionId !== bootstrap.session.id) return;
    saveActiveWorkoutDraft({
      version: 1,
      sessionId: bootstrap.session.id,
      templateId,
      sessionStartedAt: bootstrap.session.startedAt,
      elapsedSec: Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)),
      activeIdx,
      rowsByExercise: Object.fromEntries(
        Object.entries(rowsByExercise).map(([exerciseId, exerciseRows]) => [
          exerciseId,
          exerciseRows.map(({ set_number, weight, reps }) => ({ set_number, weight, reps })),
        ]),
      ),
      updatedAt: new Date().toISOString(),
    });
  }, [
    activeIdx,
    activeWorkoutData,
    restoredTimerSessionId,
    rowsInitialized,
    rowsByExercise,
    templateId,
    timerStartedAt,
  ]);

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
      const stored = readActiveWorkoutDraft();
      if (stored?.sessionId === sessionId) {
        setTimerStartedAt(Date.now() - stored.elapsedSec * 1000);
      }
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
  }, [persistWorkout, sessionId]);

  const timer = useRestTimer();

  const activeEx = exercises[activeIdx];
  const rows = activeEx ? (rowsByExercise[activeEx.id] ?? []) : [];

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

    const { data, error } = await supabase
      .from("logged_sets")
      .insert({
        session_id: sessionId,
        exercise_id: activeEx.exercise_id,
        set_number: row.set_number,
        weight_kg: weight,
        reps,
        rest_taken_sec: restTaken,
      })
      .select("id")
      .single();
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
    // Start rest timer
    timer.start(activeEx.rest_seconds, activeEx.exercise_id, activeEx.exercise.name);

    // Focus next: same exercise next uncompleted, else next exercise
    const nextInSame = rows.findIndex((r, i) => i > rowIdx && !r.completed);
    if (nextInSame === -1) {
      // Check if any other exercise still has uncompleted rows
      const anyIncomplete = exercises.some((ex, idx) => {
        if (idx <= activeIdx) return false;
        const list = rowsByExercise[ex.id] ?? [];
        return list.some((r) => !r.completed);
      });
      if (anyIncomplete && activeIdx < exercises.length - 1) {
        setActiveIdx(activeIdx + 1);
      }
    }
  };

  const finish = async () => {
    if (!sessionId || !activeWorkout.data) return;
    persistWorkout();
    try {
      await finishActiveWorkout(activeWorkout.data.session, elapsed);
    } catch (reason) {
      toast.error(
        `Impossibile salvare l'allenamento: ${reason instanceof Error ? reason.message : "errore sconosciuto"}`,
      );
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
              onClick={() => setActiveIdx(i)}
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
        (() => {
          const isCount = activeEx.reps_type === "count";
          return (
            <div className="px-4">
              <div className="ios-card overflow-hidden">
                <div className="border-b border-separator px-4 py-3">
                  <div className="text-base font-semibold text-label">{activeEx.exercise.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-label-secondary">
                    <span>Recupero target: {activeEx.rest_seconds}s</span>
                    {!isCount && activeEx.reps_display && (
                      <span className="rounded-full bg-fill px-2 py-0.5 text-[10px] font-semibold uppercase text-label">
                        {activeEx.reps_display}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-[36px_1fr_1fr_1fr_44px] items-center gap-2 border-b border-separator bg-fill-secondary px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-label-tertiary">
                  <div>Serie</div>
                  <div>Precedente</div>
                  <div className="text-center">Kg</div>
                  <div className="text-center">{isCount ? "Rep" : "Target"}</div>
                  <div />
                </div>
                <ul>
                  {rows.map((r, i) => {
                    const prev = previous?.get(activeEx.exercise_id)?.get(r.set_number);
                    return (
                      <li
                        key={r.set_number}
                        className={
                          "grid grid-cols-[36px_1fr_1fr_1fr_44px] items-center gap-2 border-b border-separator px-3 py-2 last:border-b-0 " +
                          (r.completed ? "bg-row-completed" : "")
                        }
                      >
                        <div className="text-center text-sm font-semibold text-label">
                          {r.set_number}
                        </div>
                        <div className="text-xs text-label-secondary">
                          {prev ? `${prev.weight_kg}kg × ${prev.reps}` : "-"}
                        </div>
                        <NumberCell
                          value={r.weight}
                          disabled={r.completed}
                          step={2.5}
                          onChange={(v) =>
                            setRowsByExercise((c) => {
                              const next = { ...c };
                              next[activeEx.id] = updateWeightAndPropagate(
                                next[activeEx.id] ?? [],
                                i,
                                v,
                              );
                              return next;
                            })
                          }
                        />
                        {isCount ? (
                          <NumberCell
                            value={r.reps}
                            disabled={r.completed}
                            step={1}
                            integer
                            onChange={(v) =>
                              setRowsByExercise((c) => {
                                const next = { ...c };
                                const list = [...(next[activeEx.id] ?? [])];
                                list[i] = { ...list[i], reps: v };
                                next[activeEx.id] = list;
                                return next;
                              })
                            }
                          />
                        ) : (
                          <div className="text-center text-xs font-medium text-label-secondary">
                            {activeEx.reps_display ?? "-"}
                          </div>
                        )}
                        <button
                          onClick={() => confirmSet(i)}
                          className={
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors " +
                            (r.completed
                              ? "bg-success text-white"
                              : "bg-fill text-label active:bg-accent active:text-accent-foreground")
                          }
                          aria-label={r.completed ? "Rimuovi spunta serie" : "Conferma serie"}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() =>
                    setRowsByExercise((c) => {
                      const list = [...(c[activeEx.id] ?? [])];
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
                      return { ...c, [activeEx.id]: list };
                    })
                  }
                  className="flex w-full items-center justify-center gap-1 py-2.5 text-sm font-medium text-accent active:opacity-70"
                >
                  <Plus className="h-4 w-4" /> Aggiungi serie
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  disabled,
  step,
  integer,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  step: number;
  integer?: boolean;
}) {
  const inc = (dir: 1 | -1) => {
    const n = Number(value || 0) + dir * step;
    if (n < 0) return;
    onChange(integer ? String(Math.round(n)) : String(Math.round(n * 100) / 100));
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(-1)}
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
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
        className="w-full min-w-0 rounded-md bg-fill-secondary py-1.5 text-center text-sm font-medium text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(1)}
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
        aria-label="Aumenta"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
