import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Flame,
  ListChecks,
  Timer,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/summary")({
  component: SummaryPage,
});

type SessionSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  restTakenSec: number | null;
  completedAt: string;
};

type ExerciseGroup = {
  id: string;
  name: string;
  sets: SessionSet[];
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
}

function formatRest(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} sec`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} sec`;
}

function SummaryPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const summary = useQuery({
    queryKey: ["session-summary", sessionId],
    queryFn: async () => {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .select("id,user_id,started_at,ended_at,calories_burned,template:workout_templates(name)")
        .eq("id", sessionId)
        .single();
      if (sessionError) throw sessionError;

      const { data: rows, error: setsError } = await supabase
        .from("logged_sets")
        .select(
          "id,exercise_id,set_number,weight_kg,reps,rest_taken_sec,completed_at,exercise:exercises(name)",
        )
        .eq("session_id", sessionId)
        .order("completed_at", { ascending: true });
      if (setsError) throw setsError;

      const sets: SessionSet[] = (rows ?? []).map((row) => {
        const typed = row as unknown as {
          id: string;
          exercise_id: string;
          set_number: number;
          weight_kg: number | string;
          reps: number;
          rest_taken_sec: number | null;
          completed_at: string;
          exercise: { name: string } | null;
        };
        return {
          id: typed.id,
          exerciseId: typed.exercise_id,
          exerciseName: typed.exercise?.name ?? "Esercizio",
          setNumber: typed.set_number,
          weightKg: Number(typed.weight_kg),
          reps: typed.reps,
          restTakenSec: typed.rest_taken_sec,
          completedAt: typed.completed_at,
        };
      });

      const groups = new Map<string, ExerciseGroup>();
      sets.forEach((set) => {
        const current = groups.get(set.exerciseId);
        if (current) current.sets.push(set);
        else {
          groups.set(set.exerciseId, {
            id: set.exerciseId,
            name: set.exerciseName,
            sets: [set],
          });
        }
      });

      const exerciseIds = Array.from(groups.keys());
      const historicalMax = new Map<string, number>();
      if (exerciseIds.length > 0) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (userId) {
          const { data: historical, error: historicalError } = await supabase
            .from("logged_sets")
            .select("exercise_id,weight_kg,workout_sessions!inner(user_id)")
            .in("exercise_id", exerciseIds)
            .eq("workout_sessions.user_id", userId)
            .neq("session_id", sessionId);
          if (historicalError) throw historicalError;
          (historical ?? []).forEach((row) => {
            const exerciseId = row.exercise_id;
            const weight = Number(row.weight_kg);
            if (weight > (historicalMax.get(exerciseId) ?? -Infinity)) {
              historicalMax.set(exerciseId, weight);
            }
          });
        }
      }

      const personalRecords: Array<{ exerciseId: string; name: string; weightKg: number }> = [];
      groups.forEach((exercise) => {
        const sessionMax = Math.max(...exercise.sets.map((set) => set.weightKg));
        const previousMax = historicalMax.get(exercise.id);
        if (sessionMax > 0 && (previousMax === undefined || sessionMax > previousMax)) {
          personalRecords.push({
            exerciseId: exercise.id,
            name: exercise.name,
            weightKg: sessionMax,
          });
        }
      });

      const durationSec = session.ended_at
        ? Math.max(
            0,
            Math.round(
              (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) /
                1000,
            ),
          )
        : 0;
      const totalRestSec = sets.reduce(
        (total, set) => total + Math.max(0, set.restTakenSec ?? 0),
        0,
      );
      const template = (session as unknown as { template: { name: string } | null }).template;

      return {
        name: template?.name ?? "Allenamento",
        startedAt: session.started_at,
        durationSec,
        totalRestSec,
        calories: session.calories_burned == null ? null : Number(session.calories_burned),
        totalSets: sets.length,
        exercises: Array.from(groups.values()),
        personalRecords,
      };
    },
  });

  const deleteSession = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessione non autenticata");
      const { data: deleted, error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw error;
      if (!deleted) throw new Error("Allenamento non trovato");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dash"] }),
        queryClient.invalidateQueries({ queryKey: ["session-summary", sessionId] }),
      ]);
      toast.success("Allenamento eliminato");
      navigate({ to: "/home" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (summary.isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="h-10 w-52 animate-pulse rounded-xl bg-fill" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-fill" />
          ))}
        </div>
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+24px)] text-center">
        <h1 className="text-xl font-bold text-label">Allenamento non disponibile</h1>
        <p className="mt-2 text-sm text-label-secondary">
          Potrebbe essere stato eliminato oppure non essere più accessibile.
        </p>
        <button onClick={() => navigate({ to: "/home" })} className="ios-btn-primary mt-6">
          Torna alla Home
        </button>
      </div>
    );
  }

  const data = summary.data;

  return (
    <>
      <div className="mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-label active:opacity-70"
            aria-label="Torna alla Home"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-label">{data.name}</h1>
            <p className="text-sm capitalize text-label-secondary">
              {format(new Date(data.startedAt), "EEEE d MMMM · HH:mm", { locale: it })}
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Clock className="size-5 text-accent" />}
            value={formatDuration(data.durationSec)}
            label="Tempo totale"
          />
          <MetricCard
            icon={<Timer className="size-5 text-accent" />}
            value={formatRest(data.totalRestSec)}
            label="Recupero totale"
          />
          <MetricCard
            icon={<ListChecks className="size-5 text-accent" />}
            value={String(data.totalSets)}
            label="Serie completate"
          />
          <MetricCard
            icon={<Flame className="size-5 text-warning" />}
            value={data.calories == null ? "—" : `${Math.round(data.calories)} kcal`}
            label={data.calories == null ? "Calorie non calcolate" : "Calorie bruciate"}
          />
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Dumbbell className="size-4 text-label-secondary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-label-secondary">
              Esercizi eseguiti
            </h2>
          </div>

          {data.exercises.length === 0 ? (
            <div className="ios-card p-5 text-center text-sm text-label-secondary">
              Nessuna serie registrata in questo allenamento.
            </div>
          ) : (
            <div className="space-y-3">
              {data.exercises.map((exercise) => (
                <article key={exercise.id} className="ios-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-separator px-4 py-3">
                    <h3 className="text-base font-semibold text-label">{exercise.name}</h3>
                    <span className="rounded-full bg-fill px-2.5 py-1 text-xs font-medium text-label-secondary">
                      {exercise.sets.length} serie
                    </span>
                  </div>
                  <ul>
                    {exercise.sets.map((set) => (
                      <li
                        key={set.id}
                        className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-separator px-4 py-3 last:border-b-0"
                      >
                        <span className="text-sm font-semibold text-label-secondary">
                          Serie {set.setNumber}
                        </span>
                        <div>
                          <div className="text-sm font-semibold tabular-nums text-label">
                            {set.reps} rip. × {set.weightKg} kg
                          </div>
                          <div className="mt-0.5 text-xs text-label-tertiary">
                            Recupero:{" "}
                            {set.restTakenSec == null ? "—" : formatRest(set.restTakenSec)}
                          </div>
                        </div>
                        <span className="text-xs tabular-nums text-label-tertiary">
                          {format(new Date(set.completedAt), "HH:mm")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="ios-card mt-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-separator px-4 py-3">
            <Trophy className="size-5 text-warning" />
            <h2 className="text-base font-semibold text-label">Record personali</h2>
          </div>
          {data.personalRecords.length > 0 ? (
            <ul>
              {data.personalRecords.map((record) => (
                <li
                  key={record.exerciseId}
                  className="flex items-center justify-between border-b border-separator px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm font-medium text-label">{record.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-success">
                    {record.weightKg} kg
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-label-tertiary">
              Nessun nuovo record in questa sessione.
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-danger px-5 py-3 font-semibold text-white active:opacity-80"
        >
          <Trash2 className="size-5" />
          Elimina allenamento
        </button>
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          role="presentation"
          onClick={() => !deleteSession.isPending && setConfirmDelete(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-workout-title"
            className="w-full rounded-t-3xl bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="delete-workout-title" className="text-lg font-bold text-label">
                  Eliminare questo allenamento?
                </h2>
                <p className="mt-1 text-sm text-label-secondary">
                  Verranno eliminate definitivamente anche tutte le serie, le ripetizioni e i
                  carichi registrati.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteSession.isPending}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label-secondary"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteSession.isPending}
                className="min-h-11 rounded-full bg-fill px-4 py-2.5 font-semibold text-label"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => deleteSession.mutate()}
                disabled={deleteSession.isPending}
                className="min-h-11 rounded-full bg-danger px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {deleteSession.isPending ? "Eliminazione…" : "Elimina tutto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="ios-card min-w-0 p-4">
      {icon}
      <div className="mt-2 truncate text-xl font-bold tabular-nums text-label">{value}</div>
      <div className="mt-0.5 text-xs text-label-secondary">{label}</div>
    </div>
  );
}
