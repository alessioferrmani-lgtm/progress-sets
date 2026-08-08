import { useMemo } from "react";
import { BarChart3, Gauge, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { comparePeriods, estimateOneRepMax } from "@/lib/athlete-insights";
import type { PR, SessionRow, SetRow } from "@/lib/dashboard-queries";

export function PerformanceCoachCard({
  sessions,
  sets,
  prs,
}: {
  sessions?: SessionRow[];
  sets?: SetRow[];
  prs?: PR[];
}) {
  const snapshot = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const currentSets = (sets ?? []).filter(
      (set) => now - new Date(set.completed_at).getTime() <= week,
    );
    const previousSets = (sets ?? []).filter((set) => {
      const age = now - new Date(set.completed_at).getTime();
      return age > week && age <= week * 2;
    });
    const volume = (rows: SetRow[]) =>
      rows.reduce((total, set) => total + Math.max(0, set.weight_kg) * Math.max(0, set.reps), 0);
    const currentVolume = volume(currentSets);
    const previousVolume = volume(previousSets);
    const best = [...(sets ?? [])]
      .map((set) => ({ ...set, e1rm: estimateOneRepMax(set.weight_kg, set.reps) }))
      .filter((set): set is SetRow & { e1rm: number } => set.e1rm !== null)
      .sort((a, b) => b.e1rm - a.e1rm)[0];
    const recentPr = (prs ?? [])
      .filter((pr) => now - new Date(pr.date).getTime() <= 30 * 24 * 60 * 60 * 1000)
      .slice(0, 1)[0];
    const completedSessions = (sessions ?? []).filter((session) => session.ended_at);
    return {
      comparison: comparePeriods(Math.round(currentVolume), Math.round(previousVolume)),
      best,
      recentPr,
      sessions: completedSessions.length,
      currentSets: currentSets.length,
    };
  }, [prs, sessions, sets]);

  if (!sets || !sessions || !prs) return null;
  const TrendIcon = snapshot.comparison.trend === "down" ? TrendingDown : TrendingUp;
  const trendTone = snapshot.comparison.trend === "down" ? "text-warning" : "text-success";

  return (
    <section className="ios-card p-4" data-testid="performance-coach-card">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-success/15">
          <Gauge className="size-5 text-success" />
        </span>
        <div>
          <h2 className="text-base font-bold text-label">Il tuo andamento</h2>
          <p className="text-xs text-label-secondary">Un riepilogo utile, non solo numeri</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-fill-secondary p-2.5 text-center">
          <BarChart3 className="mx-auto size-4 text-accent" />
          <div className="mt-1 text-lg font-bold tabular-nums text-label">
            {Math.round(snapshot.comparison.current)}
          </div>
          <div className="text-[10px] text-label-secondary">kg 7 giorni</div>
          <div
            className={`mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-semibold ${trendTone}`}
          >
            <TrendIcon className="size-3" />
            {snapshot.comparison.percentage == null
              ? "—"
              : `${snapshot.comparison.percentage > 0 ? "+" : ""}${snapshot.comparison.percentage}%`}
          </div>
        </div>
        <div className="rounded-2xl bg-fill-secondary p-2.5 text-center">
          <Trophy className="mx-auto size-4 text-warning" />
          <div className="mt-1 truncate text-lg font-bold tabular-nums text-label">
            {snapshot.best ? `${snapshot.best.e1rm}` : "—"}
          </div>
          <div className="truncate text-[10px] text-label-secondary">
            1RM stimato · {snapshot.best?.exercise_name ?? "nessun dato"}
          </div>
        </div>
        <div className="rounded-2xl bg-fill-secondary p-2.5 text-center">
          <Gauge className="mx-auto size-4 text-accent" />
          <div className="mt-1 text-lg font-bold tabular-nums text-label">{snapshot.sessions}</div>
          <div className="text-[10px] text-label-secondary">sessioni totali</div>
        </div>
      </div>
      <p className="mt-3 rounded-2xl bg-fill-secondary px-3 py-2 text-xs leading-snug text-label-secondary">
        {snapshot.recentPr
          ? `Nuovo riferimento: ${snapshot.recentPr.exercise_name} a ${snapshot.recentPr.weight_kg} kg.`
          : snapshot.currentSets
            ? "Continua a registrare RPE e recuperi: il sistema costruirà una progressione più precisa."
            : "Completa un allenamento per iniziare a costruire il tuo trend."}
      </p>
    </section>
  );
}
