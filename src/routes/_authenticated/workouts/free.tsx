import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Dumbbell, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ensureFreeWorkout,
  finishActiveWorkout,
  readActiveWorkoutDraft,
  saveActiveWorkoutDraft,
} from "@/lib/active-workout";
import { fetchExercises, fetchPreviousSets, type Exercise } from "@/lib/workout-queries";
import { useRestTimer } from "@/lib/rest-timer-store";
import { WorkoutRecoveryCard } from "@/components/WorkoutRecoveryCard";
import { updateWeightAndPropagate } from "@/lib/workout-set-utils";

export const Route = createFileRoute("/_authenticated/workouts/free")({
  component: FreeWorkoutPage,
});

const DEFAULT_REST_SECONDS = 90;

type FreeRow = {
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
  completedAt?: number;
  logId?: string;
};

function FreeWorkoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timer = useRestTimer();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, FreeRow[]>>({});
  const [initialized, setInitialized] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  const activeWorkout = useQuery({
    queryKey: ["active-workout-bootstrap", "free"],
    queryFn: ensureFreeWorkout,
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

  useEffect(() => {
    if (!activeWorkout.data || !exercisesQuery.data || initialized) return;
    const loggedIds = activeWorkout.data.loggedSets.map((set) => set.exercise_id);
    const draftIds = activeWorkout.data.draft.exerciseIds ?? [];
    const ids = Array.from(new Set([...draftIds, ...loggedIds])).filter((id) =>
      exerciseById.has(id),
    );
    if (ids.length > 0 && !previous.data) return;
    const loggedByKey = new Map(
      activeWorkout.data.loggedSets.map((set) => [`${set.exercise_id}:${set.set_number}`, set]),
    );
    const rows: Record<string, FreeRow[]> = {};
    ids.forEach((id) => {
      const saved = activeWorkout.data!.draft.rowsByExercise[id] ?? [];
      const completedNumbers = activeWorkout
        .data!.loggedSets.filter((set) => set.exercise_id === id)
        .map((set) => set.set_number);
      const count = Math.max(1, saved.length, ...completedNumbers, 0);
      const previousSets = previous.data?.get(id);
      rows[id] = Array.from({ length: count }, (_, index) => {
        const setNumber = index + 1;
        const completed = loggedByKey.get(`${id}:${setNumber}`);
        const savedRow = saved[index];
        const previousRow = previousSets?.get(setNumber) ?? previousSets?.get(1);
        return {
          set_number: setNumber,
          weight: String(completed?.weight_kg ?? savedRow?.weight ?? previousRow?.weight_kg ?? ""),
          reps: String(completed?.reps ?? savedRow?.reps ?? previousRow?.reps ?? ""),
          completed: Boolean(completed),
          completedAt: completed ? new Date(completed.completed_at).getTime() : undefined,
          logId: completed?.id,
        };
      });
    });
    setSelectedIds(ids);
    setActiveIdx(Math.min(activeWorkout.data.draft.activeIdx, Math.max(ids.length - 1, 0)));
    setRowsByExercise(rows);
    setStartedAt(Date.now() - activeWorkout.data.draft.elapsedSec * 1000);
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

  const persistWorkout = useCallback(() => {
    if (!session || !initialized) return;
    saveActiveWorkoutDraft({
      version: 1,
      sessionId: session.id,
      templateId: null,
      sessionStartedAt: session.startedAt,
      elapsedSec: Math.floor((Date.now() - startedAt) / 1000),
      activeIdx,
      exerciseIds: selectedIds,
      rowsByExercise: Object.fromEntries(
        Object.entries(rowsByExercise).map(([id, list]) => [
          id,
          list.map(({ set_number, weight, reps }) => ({ set_number, weight, reps })),
        ]),
      ),
      updatedAt: new Date().toISOString(),
    });
  }, [activeIdx, initialized, rowsByExercise, selectedIds, session, startedAt]);

  useEffect(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") persistWorkout();
  }, [now, persistWorkout]);

  useEffect(() => {
    if (!sessionId) return;
    const persistOnHide = () => {
      if (document.visibilityState === "hidden") persistWorkout();
    };
    document.addEventListener("visibilitychange", persistOnHide);
    window.addEventListener("pagehide", persistWorkout);
    window.addEventListener("beforeunload", persistWorkout);
    return () => {
      document.removeEventListener("visibilitychange", persistOnHide);
      window.removeEventListener("pagehide", persistWorkout);
      window.removeEventListener("beforeunload", persistWorkout);
    };
  }, [persistWorkout, sessionId]);

  const updateRow = (field: "weight" | "reps", value: string) => {
    if (!activeExerciseId || activeRow?.completed) return;
    setRowsByExercise((current) => {
      const list = [...(current[activeExerciseId] ?? [])];
      if (field === "weight") {
        return {
          ...current,
          [activeExerciseId]: updateWeightAndPropagate(list, activeSetIdx, value),
        };
      }
      list[activeSetIdx] = { ...list[activeSetIdx], [field]: value };
      return { ...current, [activeExerciseId]: list };
    });
  };

  const confirmSet = async () => {
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
    const weight = Number(activeRow.weight || 0);
    const reps = Number.parseInt(activeRow.reps || "0", 10);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
      toast.error("Inserisci carico e ripetizioni validi");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sessione scaduta: accedi di nuovo");
    const completedRows = Object.values(rowsByExercise)
      .flat()
      .filter((row) => row.completed && row.completedAt);
    const last = completedRows.length
      ? Math.max(...completedRows.map((row) => row.completedAt!))
      : null;
    const { data, error } = await supabase
      .from("logged_sets")
      .insert({
        user_id: auth.user.id,
        session_id: sessionId,
        exercise_id: activeExercise.id,
        set_number: activeRow.set_number,
        weight_kg: weight,
        reps,
        rest_taken_sec: last ? Math.round((Date.now() - last) / 1000) : null,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    const completedAt = Date.now();
    setRowsByExercise((current) => ({
      ...current,
      [activeExerciseId]: current[activeExerciseId].map((row, index) =>
        index === activeSetIdx ? { ...row, completed: true, completedAt, logId: data.id } : row,
      ),
    }));
    timer.start(DEFAULT_REST_SECONDS, activeExercise.id, activeExercise.name);
    const next = rows.findIndex((row, index) => index > activeSetIdx && !row.completed);
    if (next >= 0) setActiveSetIdx(next);
  };

  const addExercise = (exercise: Exercise) => {
    if (selectedIds.includes(exercise.id)) {
      setActiveIdx(selectedIds.indexOf(exercise.id));
      setPickerOpen(false);
      return;
    }
    setSelectedIds((current) => [...current, exercise.id]);
    setRowsByExercise((current) => ({
      ...current,
      [exercise.id]: [
        {
          set_number: 1,
          weight: String(previous.data?.get(exercise.id)?.get(1)?.weight_kg ?? ""),
          reps: String(previous.data?.get(exercise.id)?.get(1)?.reps ?? ""),
          completed: false,
        },
      ],
    }));
    setActiveIdx(selectedIds.length);
    setActiveSetIdx(0);
    setPickerOpen(false);
  };

  const addSet = () => {
    if (!activeExerciseId) return;
    setRowsByExercise((current) => {
      const list = [...(current[activeExerciseId] ?? [])];
      const previousRow = list[list.length - 1];
      list.push({
        set_number: list.length + 1,
        weight: previousRow?.weight ?? "",
        reps: previousRow?.reps ?? "",
        completed: false,
      });
      return { ...current, [activeExerciseId]: list };
    });
    setActiveSetIdx(rows.length);
  };

  const finish = async () => {
    if (!session) return;
    persistWorkout();
    try {
      await finishActiveWorkout(session, elapsed);
      timer.skip();
      queryClient.removeQueries({ queryKey: ["active-workout-bootstrap", "free"] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
        queryClient.invalidateQueries({ queryKey: ["dash"] }),
        queryClient.invalidateQueries({ queryKey: ["previous-sets"] }),
      ]);
      navigate({ to: "/sessions/$sessionId/summary", params: { sessionId: session.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile salvare l'allenamento");
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
    <main className="mx-auto max-w-md px-4 pb-8 pt-[calc(env(safe-area-inset-top)+10px)]">
      <header className="flex items-center gap-3">
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
        <button
          type="button"
          onClick={finish}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Fine
        </button>
      </header>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="ios-btn-primary mt-4 w-full"
      >
        <Plus className="size-5" /> Aggiungi esercizio
      </button>

      {selectedIds.length > 0 && (
        <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
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

      {!activeExercise || !activeRow ? (
        <section className="ios-card mt-4 p-6 text-center">
          <Dumbbell className="mx-auto size-10 text-accent" />
          <h1 className="mt-3 text-xl font-bold text-label">Costruisci il tuo allenamento</h1>
          <p className="mt-1 text-sm text-label-secondary">
            Aggiungi gli esercizi mentre ti alleni e registra ogni serie in tempo reale.
          </p>
        </section>
      ) : (
        <section className="ios-card mt-4 overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-bold text-label">{activeExercise.name}</div>
              <div className="mt-1 text-xs text-label-secondary">Recupero suggerito: 1:30</div>
            </div>
            <span className="rounded-full bg-fill px-3 py-1.5 text-sm font-semibold text-label-secondary">
              Serie <span className="text-accent">{activeSetIdx + 1}</span> di {rows.length}
            </span>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {rows.map((row, index) => (
              <button
                key={row.set_number}
                type="button"
                onClick={() => setActiveSetIdx(index)}
                className={`flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  index === activeSetIdx
                    ? "border-accent bg-accent text-accent-foreground"
                    : row.completed
                      ? "border-success bg-success/15 text-success"
                      : "border-separator bg-fill text-label-secondary"
                }`}
              >
                {row.set_number}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberCell
              label="Carico kg"
              value={activeRow.weight}
              onChange={(value) => updateRow("weight", value)}
              step={2.5}
              disabled={activeRow.completed}
            />
            <NumberCell
              label="Ripetizioni"
              value={activeRow.reps}
              onChange={(value) => updateRow("reps", value)}
              step={1}
              integer
              disabled={activeRow.completed}
            />
          </div>

          <button
            type="button"
            onClick={confirmSet}
            className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-semibold text-white ${activeRow.completed ? "bg-success" : "bg-accent"}`}
          >
            <Check className="size-5" />{" "}
            {activeRow.completed ? "Serie completata · correggi" : "Conferma serie"}
          </button>
          <button
            type="button"
            onClick={addSet}
            className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-sm font-semibold text-accent"
          >
            <Plus className="size-4" /> Aggiungi serie
          </button>
          <WorkoutRecoveryCard />
        </section>
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
                onClick={() => setPickerOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto">
              {(exercisesQuery.data ?? []).map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => addExercise(exercise)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-fill px-4 py-3 text-left active:bg-fill-secondary"
                >
                  <Dumbbell className="size-5 text-accent" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-label">
                    {exercise.name}
                  </span>
                  <ChevronDown className="size-4 -rotate-90 text-label-tertiary" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function NumberCell({
  label,
  value,
  onChange,
  step,
  integer,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  integer?: boolean;
  disabled?: boolean;
}) {
  const increment = (direction: 1 | -1) => {
    const next = Math.max(0, Number(value || 0) + direction * step);
    onChange(integer ? String(Math.round(next)) : String(Math.round(next * 100) / 100));
  };
  return (
    <div className="rounded-2xl bg-fill-secondary p-3 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-label-tertiary">
        {label}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => increment(-1)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-label disabled:opacity-40"
          aria-label={`Diminuisci ${label}`}
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.target.select()}
          className="w-full min-w-0 bg-transparent py-1 text-center text-3xl font-semibold tabular-nums text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => increment(1)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-label disabled:opacity-40"
          aria-label={`Aumenta ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
