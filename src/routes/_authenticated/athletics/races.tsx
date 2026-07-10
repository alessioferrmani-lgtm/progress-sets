import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPerformanceLog,
  fetchRaces,
  formatDistance,
  formatTime,
} from "@/lib/athletics-queries";
import { Flag, Flame, Plus, Trophy } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/athletics/races")({
  component: RacesPage,
});

function RacesPage() {
  const racesQ = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const perfQ = useQuery({ queryKey: ["performance_log"], queryFn: fetchPerformanceLog });
  const [tab, setTab] = useState<"list" | "records">("list");

  return (
    <>
      <div className="mb-3 flex gap-2 text-sm">
        <button
          onClick={() => setTab("list")}
          className={
            "rounded-full px-3 py-1 font-medium " +
            (tab === "list" ? "bg-accent text-accent-foreground" : "bg-fill text-label-secondary")
          }
        >
          Cronologia
        </button>
        <button
          onClick={() => setTab("records")}
          className={
            "rounded-full px-3 py-1 font-medium " +
            (tab === "records" ? "bg-accent text-accent-foreground" : "bg-fill text-label-secondary")
          }
        >
          Record
        </button>
      </div>

      <Link
        to="/athletics/races/new"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" /> Nuova gara
      </Link>

      {tab === "list" ? (
        <RacesList races={racesQ.data ?? []} loading={racesQ.isLoading} />
      ) : (
        <RecordsList
          races={racesQ.data ?? []}
          perf={perfQ.data ?? []}
          loading={racesQ.isLoading || perfQ.isLoading}
        />
      )}
    </>
  );
}

function RacesList({
  races,
  loading,
}: {
  races: ReturnType<typeof import("@/lib/athletics-queries").fetchRaces> extends Promise<infer T> ? T : never;
  loading: boolean;
}) {
  if (loading) return <div className="mt-6 text-center text-label-tertiary">Caricamento…</div>;
  if (!races.length) {
    return (
      <div className="ios-card mt-6 p-8 text-center">
        <Flag className="mx-auto mb-2 h-6 w-6 text-label-tertiary" />
        <p className="text-sm text-label-secondary">Nessuna gara registrata.</p>
      </div>
    );
  }
  return (
    <ul className="ios-list mt-4">
      {races.map((r) => (
        <li key={r.id} className="ios-list-row">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-label">{r.name}</div>
            <div className="mt-0.5 text-xs text-label-secondary">
              {format(new Date(r.date), "d MMM yyyy", { locale: it })}
              {r.location ? ` · ${r.location}` : ""}
              {" · "}
              {formatDistance(r.distance_m)} in {formatTime(r.time_sec)}
              {r.placement ? ` · ${r.placement}°` : ""}
            </div>
          </div>
          {r.calories_burned != null && (
            <div className="flex items-center gap-1 text-xs font-medium text-warning">
              <Flame className="h-3 w-3" />
              {Math.round(r.calories_burned)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RecordsList({
  perf,
  loading,
}: {
  races: ReturnType<typeof import("@/lib/athletics-queries").fetchRaces> extends Promise<infer T> ? T : never;
  perf: ReturnType<typeof import("@/lib/athletics-queries").fetchPerformanceLog> extends Promise<infer T> ? T : never;
  loading: boolean;
}) {
  if (loading) return <div className="mt-6 text-center text-label-tertiary">Caricamento…</div>;
  const byDist = new Map<number, typeof perf>();
  perf.forEach((p) => {
    const arr = byDist.get(p.distance_m) ?? [];
    arr.push(p);
    byDist.set(p.distance_m, arr);
  });
  const distances = Array.from(byDist.keys()).sort((a, b) => a - b);
  if (!distances.length) {
    return (
      <div className="ios-card mt-6 p-8 text-center text-sm text-label-secondary">
        Nessuna prestazione ancora registrata.
      </div>
    );
  }
  return (
    <ul className="ios-list mt-4">
      {distances.map((d) => {
        const arr = byDist.get(d)!;
        const best = arr.reduce((a, b) => (a.time_sec <= b.time_sec ? a : b));
        return (
          <li key={d} className="ios-list-row">
            <Trophy className="h-4 w-4 text-warning" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-label">{formatDistance(d)}</div>
              <div className="mt-0.5 text-xs text-label-secondary">
                {arr.length} prestazioni ·{" "}
                {format(new Date(best.date), "d MMM yyyy", { locale: it })}
              </div>
            </div>
            <div className="text-base font-bold tabular-nums text-label">
              {formatTime(best.time_sec)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
