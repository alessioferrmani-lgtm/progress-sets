import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Dumbbell, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteActiveWorkout,
  fetchInterruptedWorkout,
  finishActiveWorkout,
} from "@/lib/active-workout";
import { useRestTimer } from "@/lib/rest-timer-store";

export function InterruptedWorkoutPrompt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timer = useRestTimer();
  const isRunningWorkout = /^\/workouts\/[^/]+\/run\/?$/.test(pathname);

  const activeWorkout = useQuery({
    queryKey: ["active-workout"],
    queryFn: fetchInterruptedWorkout,
    enabled: !isRunningWorkout,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => setConfirmDelete(false), [activeWorkout.data?.id]);

  const refreshAfterAction = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["active-workout"] }),
      queryClient.invalidateQueries({ queryKey: ["dash"] }),
      queryClient.invalidateQueries({ queryKey: ["previous-sets"] }),
    ]);
  };

  const saveWorkout = useMutation({
    mutationFn: async () => {
      if (!activeWorkout.data) throw new Error("Allenamento non disponibile");
      await finishActiveWorkout(activeWorkout.data);
      return activeWorkout.data.id;
    },
    onSuccess: async (sessionId) => {
      timer.skip();
      await refreshAfterAction();
      toast.success("Allenamento recuperato e salvato");
      navigate({ to: "/sessions/$sessionId/summary", params: { sessionId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeWorkout = useMutation({
    mutationFn: async () => {
      if (!activeWorkout.data) throw new Error("Allenamento non disponibile");
      await deleteActiveWorkout(activeWorkout.data.id);
    },
    onSuccess: async () => {
      timer.skip();
      setConfirmDelete(false);
      await refreshAfterAction();
      toast.success("Allenamento interrotto eliminato");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isRunningWorkout || !activeWorkout.data) return null;

  const workout = activeWorkout.data;
  const started = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(workout.startedAt));
  const isPending = saveWorkout.isPending || removeWorkout.isPending;

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="interrupted-workout-title"
        className="w-full rounded-t-[28px] bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-separator" />
        {confirmDelete ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-danger/15 text-danger">
              <Trash2 className="size-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-label">Eliminare l’allenamento?</h2>
            <p className="mt-1 text-sm leading-relaxed text-label-secondary">
              Verranno eliminate anche le {workout.completedSets} serie già registrate. Questa
              operazione non si può annullare.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmDelete(false)}
                className="min-h-12 rounded-full bg-fill px-4 font-semibold text-label disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => removeWorkout.mutate()}
                className="min-h-12 rounded-full bg-danger px-4 font-semibold text-white disabled:opacity-50"
              >
                {removeWorkout.isPending ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Dumbbell className="size-6" />
            </div>
            <h2 id="interrupted-workout-title" className="mt-4 text-xl font-bold text-label">
              Allenamento da completare
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-label-secondary">
              “{workout.templateName}” è rimasto aperto dal {started}. Le serie confermate sono al
              sicuro.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-fill px-4 py-3">
              <span className="text-sm text-label-secondary">Serie già salvate</span>
              <span className="text-base font-bold tabular-nums text-label">
                {workout.completedSets}
              </span>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                navigate({
                  to: "/workouts/$templateId/run",
                  params: { templateId: workout.templateId },
                })
              }
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-foreground active:scale-[0.99] disabled:opacity-50"
            >
              <Play className="size-5 fill-current" /> Continua allenamento
            </button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => saveWorkout.mutate()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-fill px-3 text-sm font-semibold text-label disabled:opacity-50"
              >
                <CheckCircle2 className="size-5 text-success" />
                {saveWorkout.isPending ? "Salvataggio…" : "Salva e termina"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmDelete(true)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-danger/15 px-3 text-sm font-semibold text-danger disabled:opacity-50"
              >
                <Trash2 className="size-5" /> Elimina
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
