import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTemplates } from "@/lib/workout-queries";
import { ChevronRight, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/workouts/")({
  component: WorkoutsIndex,
});

function WorkoutsIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center justify-between py-2">
        <h1 className="text-3xl font-bold text-label">Schede</h1>
      </div>

      <Link
        to="/workouts/new"
        className="ios-btn-primary mt-3 w-full"
      >
        <Plus className="h-5 w-5" /> Nuova scheda
      </Link>

      <Link
        to="/workouts/intervals/new"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
      >
        <Plus className="h-4 w-4" /> Nuova sessione ripetute
      </Link>

      <div className="mt-5 space-y-2">
        {isLoading && (
          <div className="py-10 text-center text-sm text-label-tertiary">Caricamento…</div>
        )}
        {!isLoading && data && data.length === 0 && (
          <div className="ios-card p-6 text-center">
            <p className="text-sm text-label-secondary">
              Nessuna scheda. Creane una per iniziare.
            </p>
          </div>
        )}
        <ul className="ios-card divide-y divide-separator overflow-hidden">
          {(data ?? []).map((t) => (
            <li key={t.id}>
              <Link
                to="/workouts/$templateId/run"
                params={{ templateId: t.id }}
                className="flex items-center gap-3 px-4 py-3 active:bg-fill-secondary"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-label">{t.name}</div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {t.exercise_count} esercizi ·{" "}
                    {t.last_used_at
                      ? `ultimo ${formatDistanceToNow(new Date(t.last_used_at), {
                          locale: it,
                          addSuffix: true,
                        })}`
                      : "mai eseguita"}
                  </div>
                </div>
                <Link
                  to="/workouts/$templateId/edit"
                  params={{ templateId: t.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-fill px-3 py-1 text-xs font-medium text-label-secondary active:opacity-70"
                >
                  Modifica
                </Link>
                <ChevronRight className="h-4 w-4 text-label-tertiary" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
