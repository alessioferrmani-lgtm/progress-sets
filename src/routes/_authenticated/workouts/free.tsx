import { WorkoutSetControls } from "@/components/WorkoutSetControls";
import { addWorkoutSet, configureRows, restoreWorkoutRows, recordedMeasurement, type WorkoutRow } from "@/lib/set-measurement";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Dumbbell, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureFreeWorkout,
  finishActiveWorkout,
  getWorkoutElapsedSeconds,
  saveActiveWorkoutDraft,
} from "@/lib/active-workout";
import {
  fetchExercises,
  fetchPreviousSets,
  isGymExercise,
  type Exercise,
} from "@/lib/workout-queries";
import { useRestTimer } from "@/lib/rest-timer-store";
import { WorkoutRecoveryCard } from "@/components/WorkoutRecoveryCard";
import { WorkoutCompletionPrompt } from "@/components/WorkoutCompletionPrompt";
import { WorkoutExerciseHero } from "@/components/WorkoutExerciseHero";
import { updateSetFieldAndPropagate } from "@/lib/workout-set-utils";
import { insertLoggedSet } from "@/lib/logged-sets";
import { findNextAfterCompletion } from "@/lib/workout-navigation";

export const Route = createFileRoute("/_authenticated/workouts/free")({
  component: FreeWorkoutPage,
});

const DEFAULT_REST_SECONDS = 90;

type FreeRow = WorkoutRow;

function FreeWorkoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);
  const timer = useRestTimer();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, FreeRow[]>>({});
  const [initialized, setInitialized] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const savingSet = useRef(false);
  const [isSavingSet, setIsSavingSet] = useState(false);

  const activeWorkout = useQuery({
    queryKey: ["active-workout-bootstrap", "free"],
    queryFn: ensureFreeWorkout,
    enabled: !isFinishing,
    staleTime: Infinity,
    retry: 1,
  });
  const exercisesQuery = useQuery({
    queryKey: ["free-exercises"],
    queryFn: fetchExercises,
    staleTime: 5 * 60 * 1000,
  });
  const previous = useQuery({
    queryKey: [
      "previous-sets",
      (selectedIds.length > 0 ? selectedIds : (activeWorkout.data?.draft.exerciseIds ?? [])).join(
        ",",
      ),
    ],
    queryFn: () =>
      fetchPreviousSets(
        selectedIds.length > 0 ? selectedIds : (activeWorkout.data?.draft.exerciseIds ?? []),
      ),
    enabled: selectedIds.length > 0 || (activeWorkout.data?.draft.exerciseIds?.length ?? 0) > 0,
  });
  const exerciseById = useMemo(
    () => new Map((exercisesQuery.data ?? []).map((exercise) => [exercise.id, exercise])),
    [exercisesQuery.data],
  );
  const filteredExercises = useMemo(() => {
    const query = exerciseSearch
      .trim()
      .toLocaleLowerCase("it")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const gymExercises = (exercisesQuery.data ?? []).filter(isGymExercise);
    if (!query) return gymExercises;
    return gymExercises.filter((exercise) => {
      const haystack = `${exercise.name} ${exercise.muscle_group ?? ""} ${exercise.category ?? ""}`
        .toLocaleLowerCase("it")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return haystack.includes(query);
    });
  }, [exerciseSearch, exercisesQuery.data]);

  useEffect(() => {
    if (!activeWorkout.data || !exercisesQuery.data || initialized) return;
    const loggedIds = activeWorkout.data.loggedSets.map((set) => set.exercise_id);
    const draftIds = activeWorkout.data.draft.exerciseIds ?? [];
    const ids = Array.from(new Set([...draftIds, ...loggedIds])).filter((id) =>
      exerciseById.has(id),
    );
    if (ids.length > 0 && !previous.data) return;
    const rows: Record<string, FreeRow[]> = {};
    ids.forEach(id => {
      rows[id] = restoreWorkoutRows({
        saved: activeWorkout.data!.draft.rowsByExercise[id] ?? [],
        logged: activeWorkout.data!.loggedSets.filter(set => set.exercise_id === id),
        previous: previous.data?.get(id),
      });
    });
    setSelectedIds(ids);
    setActiveIdx(Math.min(activeWorkout.data.draft.activeIdx, Math.max(ids.length - 1, 0)));
    setRowsByExercise(rows);
    const restoredId=ids[Math.min(activeWorkout.data.draft.activeIdx, Math.max(ids.length-1,0))];
    setActiveSetIdx(Math.max(0,Math.min(activeWorkout.data.draft.activeSetIdx ?? 0,(rows[restoredId]?.length ?? 1)-1)));
    setStartedAt(new Date(activeWorkout.data.session.startedAt).getTime());
    setInitialized(true);
  }, [activeWorkout.data, exerciseById, exercisesQuery.data, initialized, previous.data]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const session = activeWorkout.data?.session;
  const sessionId = session?.id ?? null;
  const activeExerciseId = selectedIds[activeIdx] ?? null;
  const activeExercise = activeExerciseId ? exerciseById.get(activeExerciseId) : undefined;
  const rows = activeExerciseId ? (rowsByExercise[activeExerciseId] ?? []) : [];
  const activeRow = rows[activeSetIdx] ?? rows[0];
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = String(elapsed % 60).padStart(2, "0");
  const completedSets = Object.values(rowsByExercise)
    .flat()
    .filter((row) => row.completed).length;
  const totalSets = Object.values(rowsByExercise).reduce((sum, list) => sum + list.length, 0);

  const persistWorkout = useCallback(
    (nextActiveIdx = activeIdx) => {
      if (finishingRef.current) return;
      if (!session || !initialized) return;
      saveActiveWorkoutDraft({
        version: 1,
        sessionId: session.id,
        templateId: null,
        sessionStartedAt: session.startedAt,
        elapsedSec: getWorkoutElapsedSeconds(session.startedAt),
        activeIdx: nextActiveIdx,
        activeSetIdx,
        exerciseIds: selectedIds,
        rowsByExercise: Object.fromEntries(
          Object.entries(rowsByExercise).map(([id, list]) => [
            id,
            list.map(({ completed, completedAt, logId, ...draft }) => draft),
          ]),
        ),
        updatedAt: new Date().toISOString(),
      });
    },
    [activeIdx, activeSetIdx, initialized, rowsByExercise, selectedIds, session],
  );

  useEffect(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") persistWorkout();
  }, [now, persistWorkout]);

  useEffect(() => {
    if (!sessionId) return;
    const persistOnHide = () => {
      if (document.visibilityState === "hidden") {
        persistWorkout();
        return;
      }
      // Re-anchor after iOS suspends timers while the app is backgrounded.
      setStartedAt(new Date(session?.startedAt ?? "").getTime());
      setNow(Date.now());
    };
    const handleUnload = () => persistWorkout();
    document.addEventListener("visibilitychange", persistOnHide);
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      document.removeEventListener("visibilitychange", persistOnHide);
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [persistWorkout, session?.startedAt, sessionId]);

  const updateRow = (field: "weight" | "reps", value: string) => {
    if (!activeExerciseId || activeRow?.completed) return;
    setRowsByExercise((current) => {
      const list = [...(current[activeExerciseId] ?? [])];
      return {
        ...current,
        [activeExerciseId]: updateSetFieldAndPropagate(list, activeSetIdx, field, value),
      };
    });
  };

  const saveSet = async () => {
    if (!sessionId || !activeExercise || !activeRow || !activeExerciseId) return;
    if (activeRow.completed) {
      if (!activeRow.logId) return;
      const { error } = await supabase
        .from("logged_sets")
        .delete()
        .eq("id", activeRow.logId)
        .eq("session_id", sessionId);
      if (error) return toast.error(error.message);
      setRowsByExercise((current) => ({
        ...current,
        [activeExerciseId]: current[activeExerciseId].map((row, index) =>
          index === activeSetIdx
            ? { ...row, completed: false, completedAt: undefined, logId: undefined }
            : row,
        ),
      }));
      timer.skip();
      return;
    }
    let measurement;
    try { measurement = recordedMeasurement(activeRow); }
    catch(error) { toast.error(error instanceof Error ? error.message : "Valore non valido"); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sessione scaduta: accedi di nuovo");
    const completedRows = Object.values(rowsByExercise)
      .flat()
      .filter((row) => row.completed && row.completedAt);
    const last = completedRows.length
      ? Math.max(...completedRows.map((row) => row.completedAt!))
      : null;
    const { data, error } = await insertLoggedSet({
      user_id: auth.user.id,
      session_id: sessionId,
      exercise_id: activeExercise.id,
      set_number: activeRow.set_number,
      ...measurement,
      rest_taken_sec: last ? Math.round((Date.now() - last) / 1000) : null,
    });
    if (error) return toast.error(error.message);
    const completedAt = Date.now();
    setRowsByExercise((current) => ({
      ...current,
      [activeExerciseId]: current[activeExerciseId].map((row, index) =>
        index === activeSetIdx ? { ...row, completed: true, completedAt, logId: data.id } : row,
      ),
    }));
    const next = findNextAfterCompletion(selectedIds, rowsByExercise, {
      exerciseIndex: activeIdx,
      setIndex: activeSetIdx,
    });
    if (next) {
      timer.start(DEFAULT_REST_SECONDS, activeExercise.id, activeExercise.name);
      setActiveIdx(next.exerciseIndex);
      setActiveSetIdx(next.setIndex);
    } else {
      timer.skip();
      setShowCompletionPrompt(true);
    }
  };

  const confirmSet = async () => {
    if (savingSet.current || isFinishing) return;
    savingSet.current = true; setIsSavingSet(true);
    try { await saveSet(); } catch(error) { toast.error(error instanceof Error ? error.message : "Salvataggio non riuscito"); }
    finally { savingSet.current = false; setIsSavingSet(false); }
  };

  const skipExercise = () => {
    if (!activeExercise) return;
    const nextIndex = activeIdx + 1;
    timer.skip();
    if (nextIndex >= selectedIds.length) {
      setShowCompletionPrompt(true);
      return;
    }
    setActiveIdx(nextIndex);
    setActiveSetIdx(0);
    persistWorkout(nextIndex);
    toast.success(
      `Passato a ${exerciseById.get(selectedIds[nextIndex])?.name ?? "esercizio successivo"}`,
    );
  };

  const addExercise = (exercise: Exercise) => {
    if (selectedIds.includes(exercise.id)) {
      setActiveIdx(selectedIds.indexOf(exercise.id));
      setPickerOpen(false);
      setExerciseSearch("");
      return;
    }
    setSelectedIds((current) => [...current, exercise.id]);
    setRowsByExercise((current) => ({
      ...current,
      [exercise.id]: [
        {
          set_number: 1,
          side: "both",
          reps_type: "count",
          weight: String(previous.data?.get(exercise.id)?.get(1)?.weight_kg ?? ""),
          reps: String(previous.data?.get(exercise.id)?.get(1)?.reps ?? ""),
          completed: false,
        },
      ],
    }));
    setActiveIdx(selectedIds.length);
    setActiveSetIdx(0);
    setPickerOpen(false);
    setExerciseSearch("");
  };

  const addSet = () => {
    if (!activeExerciseId) return;
    setRowsByExercise((current) => {
      const list = addWorkoutSet(current[activeExerciseId] ?? []);
      return { ...current, [activeExerciseId]: list };
    });
    setActiveSetIdx(rows.length);
  };

  const finish = async () => {
    if (!session || isFinishing || savingSet.current) return;
    if (Object.values(rowsByExercise).flat().some(row => row.clock?.startedAt != null)) return toast.error("Ferma il cronometro della serie prima di terminare");
    persistWorkout();
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      await finishActiveWorkout(session, elapsed, completedSets > 0);
      timer.skip();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
        queryClient.invalidateQueries({ queryKey: ["dash"] }),
        queryClient.invalidateQueries({ queryKey: ["previous-sets"] }),
      ]);
      await navigate({ to: "/sessions/$sessionId/summary", params: { sessionId: session.id } });
      queryClient.removeQueries({ queryKey: ["active-workout-bootstrap", "free"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile salvare l'allenamento");
      finishingRef.current = false;
      setIsFinishing(false);
    }
  };

  const cancel = () => {
    if (!confirm("Uscire dall’allenamento? Potrai continuarlo senza perdere i dati.")) return;
    persistWorkout();
    timer.skip();
    navigate({ to: "/workouts" });
  };

  if (activeWorkout.isError) {
    return <div className="p-6 text-center text-danger">{activeWorkout.error.message}</div>;
  }
  if (activeWorkout.isPending || exercisesQuery.isPending) {
    return <div className="p-6 text-center text-label-tertiary">Caricamento…</div>;
  }

  return (
    <main className="workout-screen workout-screen-free mx-auto flex w-full max-w-md flex-col">
      <section className="workout-top-shell shrink-0">
        <header className="workout-screen-header flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={cancel}
            className="flex size-10 items-center justify-center rounded-full bg-fill text-label"
            aria-label="Torna indietro"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-label">Allenamento libero</div>
            <div className="font-mono text-xs tabular-nums text-label-secondary">
              {elapsedMinutes}:{elapsedSeconds} · {completedSets}/{totalSets || 0} serie
            </div>
          </div>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={finish}
              disabled={isFinishing}
              className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
              aria-label="Termina allenamento"
            >
              Fine
            </button>
          )}
        </header>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="workout-screen-add-exercise ios-btn-primary mt-4 w-full"
          >
            <Plus className="size-5" /> Aggiungi esercizio
          </button>
        )}

        {selectedIds.length > 0 && (
          <div className="workout-screen-tabs scrollbar-none mt-4 flex shrink-0 gap-2 overflow-x-auto pb-1">
            {selectedIds.map((id, index) => {
              const exercise = exerciseById.get(id);
              const done = (rowsByExercise[id] ?? []).filter((row) => row.completed).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveIdx(index);
                    setActiveSetIdx(0);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    index === activeIdx
                      ? "bg-accent text-accent-foreground"
                      : "bg-fill text-label-secondary"
                  }`}
                >
                  {exercise?.name ?? "Esercizio"} · {done}/{(rowsByExercise[id] ?? []).length}
                </button>
              );
            })}
          </div>
        )}

        {activeExercise && activeRow && (
          <WorkoutExerciseHero
            exerciseName={activeExercise.name}
            exercisePosition={activeIdx + 1}
            exerciseCount={selectedIds.length}
            seriesPosition={activeRow.side && activeRow.side !== "both" ? Math.ceil((activeSetIdx + 1) / 2) : activeSetIdx + 1}
            side={activeRow.side}
            seriesCount={activeRow.side && activeRow.side !== "both" ? Math.ceil(rows.length / 2) : rows.length}
            completedSets={completedSets}
            totalSets={totalSets}
            onSkip={skipExercise}
          />
        )}
      </section>

      {!activeExercise || !activeRow ? (
        <section className="ios-card mt-4 p-6 text-center">
          <Dumbbell className="mx-auto size-10 text-accent" />
          <h1 className="mt-3 text-xl font-bold text-label">Costruisci il tuo allenamento</h1>
          <p className="mt-1 text-sm text-label-secondary">
            Aggiungi gli esercizi mentre ti alleni e registra ogni serie in tempo reale.
          </p>
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="ios-btn-primary w-full"
            >
              <Plus className="size-5" /> Aggiungi esercizio
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={isFinishing}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-accent px-5 font-semibold text-accent active:scale-[0.99] disabled:opacity-50"
            >
              <Check className="size-5" /> Termina allenamento
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="workout-set-card ios-card mt-3 overflow-hidden p-4">
            <div className="hidden">
              <div>
                <div className="text-2xl font-bold text-label">{activeExercise.name}</div>
                <div className="mt-1 text-xs text-label-secondary">Recupero suggerito: 1:30</div>
              </div>
              <span className="rounded-full bg-fill px-3 py-1.5 text-sm font-semibold text-label-secondary">
                Serie <span className="text-accent">{activeSetIdx + 1}</span> di {rows.length}
              </span>
            </div>

            <div className="workout-rest-meta mb-4 flex items-center justify-between gap-3 text-xs text-label-secondary">
              <span>Recupero suggerito: 1:30</span>

            </div>

            <WorkoutSetControls rows={rows} index={activeSetIdx} onSelect={setActiveSetIdx}
              anotherClockRunning={Object.values(rowsByExercise).flat().some(row => row !== activeRow && row.clock?.startedAt != null)}
              onField={updateRow}
              onPatch={patch => setRowsByExercise(current => ({...current,[activeExerciseId!]: current[activeExerciseId!].map((row,i) => i === activeSetIdx ? {...row,...patch} : row)}))}
              onConfigure={(unilateral,type) => {setRowsByExercise(current => ({...current,[activeExerciseId!]: configureRows(current[activeExerciseId!],unilateral,type)}));setActiveSetIdx(0);}}
            />

            <button
              type="button"
              onClick={confirmSet}
              disabled={isSavingSet || isFinishing}
              className={`workout-confirm mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-semibold text-white ${activeRow.completed ? "bg-success" : "bg-accent"}`}
            >
              <Check className="size-5" />{" "}
              {isSavingSet ? "Salvataggio…" : activeRow.completed ? "Serie completata · correggi" : "Conferma serie"}
            </button>
            <button
              type="button"
              onClick={addSet}
              className="workout-add-series mt-3 flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-accent"
            >
              <Plus className="size-4" /> Aggiungi serie
            </button>
            <WorkoutRecoveryCard />
          </section>
        </>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45" role="presentation">
          <section
            className="max-h-[78vh] w-full overflow-hidden rounded-t-[28px] bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
            role="dialog"
            aria-modal="true"
            aria-label="Scegli esercizio"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-separator" />
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-label">Aggiungi esercizio</h2>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setExerciseSearch("");
                }}
                className="flex size-9 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </div>
            <input
              type="search"
              value={exerciseSearch}
              onChange={(event) => setExerciseSearch(event.target.value)}
              placeholder="Cerca esercizio…"
              aria-label="Cerca esercizio"
              data-testid="free-exercise-search"
              className="mt-3 w-full rounded-xl bg-fill-secondary px-4 py-3 text-sm text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => addExercise(exercise)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-fill px-4 py-3 text-left active:bg-fill-secondary"
                >
                  <Dumbbell className="size-5 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-label">{exercise.name}</span>
                    <span className="block truncate text-xs text-label-secondary">
                      {exercise.muscle_group ?? "Gruppo personalizzato"}
                      {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                    </span>
                  </span>
                  <ChevronDown className="size-4 -rotate-90 text-label-tertiary" />
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="rounded-xl bg-fill p-4 text-center text-sm text-label-secondary">
                  Nessun esercizio corrisponde alla ricerca.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      {showCompletionPrompt && (
        <WorkoutCompletionPrompt
          isFinishing={isFinishing}
          onContinue={() => setShowCompletionPrompt(false)}
          onFinish={finish}
        />
      )}
    </main>
  );
}
