import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchTemplates, fetchTrainingPrograms } from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Dumbbell, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workouts/")({
  component: WorkoutsIndex,
});

function WorkoutsIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });
  const { data: programs } = useQuery({
    queryKey: ["training-programs"],
    queryFn: fetchTrainingPrograms,
  });
  const [weekByProgram, setWeekByProgram] = useState<Record<string, number>>({});
  const programIds = useMemo(
    () => new Set((data ?? []).map((template) => template.program_id).filter(Boolean)),
    [data],
  );
  const ungrouped = (data ?? []).filter((template) => !template.program_id);
  const hasContent = ungrouped.length > 0 || programIds.size > 0;

  const changeProgramWeek = async (programId: string, week: number, fallbackWeek: number) => {
    setWeekByProgram((current) => ({ ...current, [programId]: week }));
    const { error } = await supabase
      .from("training_programs")
      .update({ current_week: week })
      .eq("id", programId);
    if (error) {
      setWeekByProgram((current) => ({ ...current, [programId]: fallbackWeek }));
      toast.error("Impossibile salvare la settimana corrente");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center justify-between py-2">
        <h1 className="text-3xl font-bold text-label">Schede</h1>
      </div>

      <Link to="/workouts/new" className="ios-btn-primary mt-3 w-full">
        <Plus className="h-5 w-5" /> Nuova scheda
      </Link>

      <Link
        to="/workouts/intervals/new"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
      >
        <Plus className="h-4 w-4" /> Nuova sessione ripetute
      </Link>

      <Link
        to="/workouts/free"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
      >
        <Dumbbell className="h-4 w-4" /> Allenamento libero
      </Link>

      <div className="mt-5 space-y-2">
        {isLoading && (
          <div className="py-10 text-center text-sm text-label-tertiary">Caricamento…</div>
        )}
        {!isLoading && !hasContent && (
          <div className="ios-card p-6 text-center">
            <p className="text-sm text-label-secondary">Nessuna scheda. Creane una per iniziare.</p>
          </div>
        )}
        {(programs ?? []).map((program) => {
          const programTemplates = (data ?? []).filter(
            (template) => template.program_id === program.id,
          );
          if (programTemplates.length === 0) return null;
          const availableWeeks = Array.from(
            new Set(programTemplates.map((template) => template.program_week ?? 1)),
          ).sort((a, b) => a - b);
          const requestedWeek = weekByProgram[program.id] ?? program.current_week;
          const selectedWeek = availableWeeks.includes(requestedWeek)
            ? requestedWeek
            : (availableWeeks[0] ?? 1);
          const weekTemplates = programTemplates.filter(
            (template) => (template.program_week ?? 1) === selectedWeek,
          );
          return (
            <section key={program.id} className="ios-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-separator px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold text-label">{program.name}</h2>
                  <p className="mt-0.5 text-xs text-label-secondary">
                    {program.duration_weeks} settimane · {program.sport ?? "Programma"}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-label-secondary">
                  Settimana
                  <select
                    value={selectedWeek}
                    onChange={(event) =>
                      void changeProgramWeek(program.id, Number(event.target.value), selectedWeek)
                    }
                    className="rounded-lg bg-fill px-2 py-1.5 text-sm font-semibold text-label outline-none"
                    aria-label={`Settimana del programma ${program.name}`}
                  >
                    {availableWeeks.map((week) => (
                      <option key={week} value={week}>
                        {week}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ul className="divide-y divide-separator">
                {weekTemplates.map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/workouts/$templateId"
                      params={{ templateId: t.id }}
                      className="flex items-center gap-3 px-4 py-3 active:bg-fill-secondary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-label">
                          {t.session_key ? `Seduta ${t.session_key}` : t.name}
                        </div>
                        <div className="mt-0.5 text-xs text-label-secondary">
                          {t.exercise_count} esercizi · {t.last_used_at
                            ? `ultimo ${formatDistanceToNow(new Date(t.last_used_at), {
                                locale: it,
                                addSuffix: true,
                              })}`
                            : "mai eseguita"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-label-tertiary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {ungrouped.length > 0 && (
          <ul className="ios-card divide-y divide-separator overflow-hidden">
            {ungrouped.map((t) => (
              <li key={t.id}>
                <Link
                  to="/workouts/$templateId"
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
                  <ChevronRight className="h-4 w-4 text-label-tertiary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
