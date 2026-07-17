import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, Pencil, Play, Timer, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchTemplate } from "@/lib/workout-queries";

export const Route = createFileRoute("/_authenticated/workouts/$templateId/")({
  component: WorkoutTemplateDetail,
});

function WorkoutTemplateDetail() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const template = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTemplate(templateId),
  });

  const deleteTemplate = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessione non autenticata");
      const { data, error } = await supabase
        .from("workout_templates")
        .delete()
        .eq("id", templateId)
        .eq("user_id", auth.user.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Scheda non trovata");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Scheda eliminata");
      navigate({ to: "/workouts" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (template.isLoading) {
    return <div className="p-8 text-center text-sm text-label-tertiary">Caricamento…</div>;
  }

  if (template.isError || !template.data) {
    return (
      <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+24px)] text-center">
        <h1 className="text-xl font-bold text-label">Scheda non disponibile</h1>
        <button onClick={() => navigate({ to: "/workouts" })} className="ios-btn-primary mt-5">
          Torna alle schede
        </button>
      </div>
    );
  }

  const data = template.data;
  const totalSets = data.exercises.reduce((total, exercise) => total + exercise.target_sets, 0);

  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/workouts" })}
            className="flex size-10 items-center justify-center rounded-full bg-fill text-label"
            aria-label="Torna alle schede"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-label">{data.template.name}</h1>
            <p className="text-sm text-label-secondary">
              {data.exercises.length} esercizi · {totalSets} serie
            </p>
          </div>
        </header>

        <Link
          to="/workouts/$templateId/run"
          params={{ templateId }}
          className="ios-btn-primary mt-6 w-full"
        >
          <Play className="size-5 fill-current" />
          Avvia allenamento
        </Link>

        <section className="mt-5 space-y-3" aria-label="Esercizi della scheda">
          {data.exercises.map((exercise, index) => (
            <article key={exercise.id} className="ios-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-sm font-bold text-accent">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-label">{exercise.exercise.name}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-label-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell className="size-3.5" />
                      {exercise.target_sets} serie ·{" "}
                      {exercise.reps_display ?? exercise.target_reps ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3.5" />
                      {exercise.rest_seconds} sec recupero
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Link
            to="/workouts/$templateId/edit"
            params={{ templateId }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-fill px-4 font-semibold text-label"
          >
            <Pencil className="size-4" /> Modifica
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-danger px-4 font-semibold text-white"
          >
            <Trash2 className="size-4" /> Elimina
          </button>
        </div>
      </main>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-template-title"
            className="w-full rounded-t-3xl bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="delete-template-title" className="text-lg font-bold text-label">
                  Eliminare “{data.template.name}”?
                </h2>
                <p className="mt-1 text-sm text-label-secondary">
                  La scheda verrà eliminata. Gli allenamenti già svolti resteranno nello storico.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteTemplate.isPending}
                className="min-h-11 rounded-full bg-fill font-semibold text-label"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => deleteTemplate.mutate()}
                disabled={deleteTemplate.isPending}
                className="min-h-11 rounded-full bg-danger font-semibold text-white disabled:opacity-50"
              >
                {deleteTemplate.isPending ? "Eliminazione…" : "Elimina scheda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
