import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMaxWeights } from "@/lib/workout-queries";
import { Trophy, Clock, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/summary")({
  component: SummaryPage,
});

function SummaryPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["session-summary", sessionId],
    queryFn: async () => {
      const { data: session, error: se } = await supabase
        .from("workout_sessions")
        .select("id,started_at,ended_at,template_id")
        .eq("id", sessionId)
        .single();
      if (se) throw se;
      const { data: sets, error: le } = await supabase
        .from("logged_sets")
        .select("id,exercise_id,set_number,weight_kg,reps,exercise:exercises(name)")
        .eq("session_id", sessionId)
        .order("completed_at");
      if (le) throw le;
      const exerciseIds = Array.from(new Set((sets ?? []).map((s) => s.exercise_id)));

      // Historical max EXCLUDING this session
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      const { data: hist } = await supabase
        .from("logged_sets")
        .select("exercise_id,weight_kg,workout_sessions!inner(user_id)")
        .in("exercise_id", exerciseIds)
        .eq("workout_sessions.user_id", userId)
        .neq("session_id", sessionId);
      const histMax = new Map<string, number>();
      (hist ?? []).forEach((r) => {
        const w = Number((r as { weight_kg: number }).weight_kg);
        const id = (r as { exercise_id: string }).exercise_id;
        if (w > (histMax.get(id) ?? -Infinity)) histMax.set(id, w);
      });

      const sessionMax = new Map<string, { weight: number; name: string }>();
      (sets ?? []).forEach((s) => {
        const w = Number(s.weight_kg);
        const cur = sessionMax.get(s.exercise_id);
        const name =
          (s as unknown as { exercise: { name: string } | null }).exercise?.name ?? "";
        if (!cur || w > cur.weight) sessionMax.set(s.exercise_id, { weight: w, name });
      });
      const prs: Array<{ name: string; weight: number }> = [];
      sessionMax.forEach((v, id) => {
        const prev = histMax.get(id);
        if (v.weight > 0 && (prev === undefined || v.weight > prev)) {
          prs.push({ name: v.name, weight: v.weight });
        }
      });

      const durationSec = session.ended_at
        ? Math.max(
            0,
            Math.round(
              (new Date(session.ended_at).getTime() -
                new Date(session.started_at).getTime()) /
                1000,
            ),
          )
        : 0;

      return {
        durationSec,
        totalSets: sets?.length ?? 0,
        prs,
      };
    },
  });

  // Prime cache-friendly warmup (unused otherwise)
  void useQuery({
    queryKey: ["_prewarm_max", sessionId],
    queryFn: () => fetchMaxWeights([]),
    enabled: false,
  });

  const dur = data?.durationSec ?? 0;
  const dm = Math.floor(dur / 60);
  const ds = String(dur % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="text-3xl font-bold text-label">Allenamento completato</h1>
      <p className="mt-1 text-sm text-label-secondary">Ottimo lavoro! Ecco il riepilogo.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="ios-card p-4">
          <Clock className="h-5 w-5 text-accent" />
          <div className="mt-2 text-2xl font-bold text-label">
            {dm}:{ds}
          </div>
          <div className="text-xs text-label-secondary">Durata</div>
        </div>
        <div className="ios-card p-4">
          <ListChecks className="h-5 w-5 text-accent" />
          <div className="mt-2 text-2xl font-bold text-label">{data?.totalSets ?? 0}</div>
          <div className="text-xs text-label-secondary">Serie completate</div>
        </div>
      </div>

      <div className="ios-card mt-4 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h2 className="text-base font-semibold text-label">Record personali</h2>
        </div>
        {data && data.prs.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {data.prs.map((pr) => (
              <li
                key={pr.name}
                className="flex items-center justify-between rounded-lg bg-fill-secondary px-3 py-2 text-sm"
              >
                <span className="text-label">{pr.name}</span>
                <span className="font-semibold text-success">{pr.weight} kg</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-label-tertiary">
            Nessun nuovo record in questa sessione.
          </p>
        )}
      </div>

      <button
        onClick={() => navigate({ to: "/home" })}
        className="ios-btn-primary mt-6 w-full"
      >
        Fine allenamento
      </button>
    </div>
  );
}
