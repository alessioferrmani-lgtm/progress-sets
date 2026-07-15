import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPerformanceLog,
  fetchRaces,
  formatDistance,
  formatTime,
} from "@/lib/athletics-queries";
import { Flag, Flame, Plus, Trophy, ChevronRight, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { QuickRaceSheet } from "@/components/QuickRaceSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/athletics/races")({
  component: RacesPage,
});

function RacesPage() {
  const qc = useQueryClient();
  const racesQ = useQuery({ queryKey: ["races"], queryFn: fetchRaces });
  const perfQ = useQuery({ queryKey: ["performance_log"], queryFn: fetchPerformanceLog });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDistance, setSheetDistance] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const openSheet = (dist: number | null) => {
    setSheetDistance(dist);
    setSheetOpen(true);
  };

  const removeRace = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sessione scaduta. Esci e accedi di nuovo.");

      const { data, error } = await supabase
        .from("races")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("La gara non è stata eliminata.");
      return id;
    },
    onSuccess: async () => {
      setPendingDeleteId(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["races"] }),
        qc.invalidateQueries({ queryKey: ["performance_log"] }),
        qc.invalidateQueries({ queryKey: ["dash"] }),
      ]);
      toast.success("Gara eliminata");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const perf = perfQ.data ?? [];
  const raceOnly = perf.filter((p) => p.source === "RACE" && new Date(p.date) >= oneYearAgo);
  const byDist = new Map<number, typeof raceOnly>();
  raceOnly.forEach((p) => {
    const arr = byDist.get(p.distance_m) ?? [];
    arr.push(p);
    byDist.set(p.distance_m, arr);
  });
  const pbs = Array.from(byDist.entries())
    .map(([distance_m, arr]) => ({
      distance_m,
      best: arr.reduce((a, b) => (a.time_sec <= b.time_sec ? a : b)),
      count: arr.length,
    }))
    .sort((a, b) => a.distance_m - b.distance_m);

  return (
    <>
      <button
        onClick={() => openSheet(null)}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" /> Nuova gara
      </button>

      <h3 className="mt-5 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
        Record ultimo anno
      </h3>

      {perfQ.isLoading ? (
        <div className="mt-2 text-center text-label-tertiary">Caricamento…</div>
      ) : pbs.length === 0 ? (
        <div className="ios-card mt-2 p-8 text-center">
          <Flag className="mx-auto mb-2 h-6 w-6 text-label-tertiary" />
          <p className="text-sm text-label-secondary">Nessuna gara nell'ultimo anno.</p>
        </div>
      ) : (
        <ul className="ios-list">
          {pbs.map((pb) => (
            <li key={pb.distance_m}>
              <button
                onClick={() => openSheet(pb.distance_m)}
                className="ios-list-row w-full text-left"
              >
                <Trophy className="h-4 w-4 text-warning" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-label">
                    {formatDistance(pb.distance_m)} · PB {formatTime(pb.best.time_sec)}
                  </div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {pb.count} {pb.count === 1 ? "gara" : "gare"} ·{" "}
                    {format(new Date(pb.best.date), "d MMM yyyy", { locale: it })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-label-tertiary" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
        Storico gare
      </h3>
      {racesQ.isLoading ? (
        <div className="mt-2 text-center text-label-tertiary">Caricamento…</div>
      ) : (racesQ.data ?? []).length === 0 ? (
        <div className="ios-card p-6 text-center text-sm text-label-secondary">
          Nessuna gara registrata.
        </div>
      ) : (
        <ul className="ios-list">
          {(racesQ.data ?? []).map((r) => (
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
                {r.notes && (
                  <div className="mt-1 text-xs text-label-tertiary line-clamp-2">{r.notes}</div>
                )}
              </div>
              {r.calories_burned != null && (
                <div className="flex items-center gap-1 text-xs font-medium text-warning">
                  <Flame className="h-3 w-3" />
                  {Math.round(r.calories_burned)}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPendingDeleteId(r.id)}
                disabled={removeRace.isPending}
                aria-label={`Elimina ${r.name}`}
                className="flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-full bg-fill text-danger active:opacity-70 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <QuickRaceSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        presetDistance={sheetDistance}
      />

      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-race-title"
          onClick={() => !removeRace.isPending && setPendingDeleteId(null)}
        >
          <div
            className="ios-card w-full max-w-sm bg-background p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="delete-race-title" className="text-lg font-bold text-label">
                  Eliminare questa gara?
                </h3>
                <p className="mt-1 text-sm text-label-secondary">
                  Verrà rimossa anche dai record e dalle statistiche.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={removeRace.isPending}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={removeRace.isPending}
                className="min-h-11 rounded-full bg-fill px-4 py-2.5 font-semibold text-label"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => pendingDeleteId && removeRace.mutate(pendingDeleteId)}
                disabled={removeRace.isPending}
                className="min-h-11 rounded-full bg-danger px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {removeRace.isPending ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
