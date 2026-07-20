import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronRight,
  ClipboardCheck,
  Flag,
  Flame,
  Plus,
  Repeat2,
  Route as RouteIcon,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchIntervalSessions, formatDistance, formatTime } from "@/lib/athletics-queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/athletics/")({
  component: AthleticsOverview,
});

function AthleticsOverview() {
  const queryClient = useQueryClient();
  const sessionsQ = useQuery({ queryKey: ["interval_sessions"], queryFn: fetchIntervalSessions });
  const sessions = sessionsQ.data ?? [];
  const todayKey = useTodayKey();
  const todaySessions = sessions.filter((session) => session.date === todayKey);
  const totals = todaySessions.reduce(
    (sum, session) => {
      sum.distance += session.interval_reps.reduce((n, rep) => n + rep.distance_m, 0);
      sum.reps += session.interval_reps.length;
      sum.calories += session.calories_burned ?? 0;
      return sum;
    },
    { distance: 0, reps: 0, calories: 0 },
  );
  const removeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      const repIds = session?.interval_reps.map((rep) => rep.id) ?? [];
      if (repIds.length) {
        const { error: performanceError } = await supabase
          .from("performance_log")
          .delete()
          .eq("source", "TRAINING_REP")
          .in("source_id", repIds);
        if (performanceError) throw performanceError;
      }
      const { error } = await supabase.from("interval_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interval_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["performance_log"] });
      toast.success("Sessione di ripetute eliminata");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossibile eliminare la sessione"),
  });

  const confirmDelete = (sessionId: string) => {
    if (
      window.confirm("Eliminare questa sessione di ripetute? L'operazione non si può annullare.")
    ) {
      removeSession.mutate(sessionId);
    }
  };

  return (
    <div className="pb-24">
      <Link
        to="/workouts/intervals/new"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" /> Nuova sessione ripetute
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat icon={RouteIcon} value={formatDistance(totals.distance)} label="Distanza oggi" />
        <Stat icon={Repeat2} value={String(totals.reps)} label="Ripetute oggi" />
        <Stat icon={Flame} value={String(Math.round(totals.calories))} label="kcal oggi" />
      </div>

      <h2 className="mt-6 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
        Allenamenti atletica
      </h2>
      {sessionsQ.isLoading ? (
        <div className="ios-card p-6 text-center text-sm text-label-secondary">Caricamento…</div>
      ) : sessionsQ.isError ? (
        <div className="ios-card p-6 text-center text-sm text-danger">
          Impossibile caricare le sessioni.
        </div>
      ) : sessions.length === 0 ? (
        <div className="ios-card p-6 text-center">
          <Timer className="mx-auto h-6 w-6 text-label-tertiary" />
          <p className="mt-2 text-sm text-label-secondary">
            Nessuna sessione di ripetute registrata.
          </p>
        </div>
      ) : (
        <ul className="ios-list">
          {sessions.slice(0, 12).map((session) => {
            const distance = session.interval_reps.reduce((n, rep) => n + rep.distance_m, 0);
            const elapsed = session.interval_reps.reduce((n, rep) => n + rep.time_sec, 0);
            return (
              <li key={session.id} className="ios-list-row">
                <Repeat2 className="h-4 w-4 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-label">
                    {session.signature || "Sessione ripetute"}
                  </div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {format(new Date(`${session.date}T12:00:00`), "d MMM yyyy", { locale: it })}
                    {` · ${formatDistance(distance)} · ${formatTime(elapsed)}`}
                  </div>
                </div>
                {session.calories_burned != null && (
                  <span className="text-xs font-semibold text-label-secondary">
                    {Math.round(session.calories_burned)} kcal
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Elimina ${session.signature || "sessione ripetute"}`}
                  disabled={removeSession.isPending}
                  onClick={() => confirmDelete(session.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger active:scale-95 disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-6 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
        Gare e test
      </h2>
      <div className="grid gap-3">
        <FeatureLink
          to="/athletics/tests"
          icon={ClipboardCheck}
          title="Test atletici"
          subtitle="Apri i test, consulta i risultati e inserisci nuove prove"
        />
        <FeatureLink
          to="/athletics/races"
          icon={Flag}
          title="Gare"
          subtitle="Consulta lo storico e registra una nuova gara"
        />
      </div>
    </div>
  );
}

function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 100);
    const timer = window.setTimeout(
      () => setTodayKey(format(new Date(), "yyyy-MM-dd")),
      +nextMidnight - +now,
    );
    return () => window.clearTimeout(timer);
  }, [todayKey]);
  return todayKey;
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof RouteIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="ios-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-accent" />
      <div className="mt-1 truncate text-base font-bold text-label">{value}</div>
      <div className="text-[10px] text-label-secondary">{label}</div>
    </div>
  );
}

function FeatureLink({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: "/athletics/tests" | "/athletics/races";
  icon: typeof Flag;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="ios-card flex items-center gap-3 p-4 active:opacity-70">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
        <Icon className="h-5 w-5 text-accent" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-label">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-label-secondary">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-label-tertiary" />
    </Link>
  );
}
