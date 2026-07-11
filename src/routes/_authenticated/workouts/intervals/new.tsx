import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DistancePicker } from "@/components/DistancePicker";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForRace } from "@/lib/calories";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workouts/intervals/new")({
  component: NewIntervalPage,
});

type Rep = { distance_m: number; time_sec: number; rest_sec: number | null };

function NewIntervalPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distance, setDistance] = useState<number | null>(400);
  const [timeStr, setTimeStr] = useState("");
  const [restStr, setRestStr] = useState("120");
  const [notes, setNotes] = useState("");
  const [reps, setReps] = useState<Rep[]>([]);

  const signature = useMemo(() => buildSignature(reps), [reps]);

  const addRep = () => {
    const t = Number(timeStr);
    const r = restStr ? Number(restStr) : null;
    if (!distance) return toast.error("Seleziona una distanza");
    if (!Number.isFinite(t) || t <= 0) return toast.error("Inserisci il tempo");
    setReps((cur) => [...cur, { distance_m: distance, time_sec: t, rest_sec: r }]);
    setTimeStr(""); // keep distance + rest for the next rep
  };

  const removeRep = (idx: number) => {
    setReps((cur) => cur.filter((_, i) => i !== idx));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (reps.length === 0) throw new Error("Aggiungi almeno una ripetuta");
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;

      const totalSec = reps.reduce((s, r) => s + r.time_sec, 0);
      const totalDist = reps.reduce((s, r) => s + r.distance_m, 0);
      const calories = profileQ.data && totalDist > 0
        ? computeCaloriesForRace(profileQ.data, {
            distance_m: totalDist,
            time_sec: totalSec,
            avg_hr: null,
          })
        : null;

      const { data: session, error: se } = await supabase
        .from("interval_sessions")
        .insert({
          user_id: uid,
          date,
          signature,
          notes: notes || null,
          calories_burned: calories,
        })
        .select("id")
        .single();
      if (se) throw se;

      const rows = reps.map((r, i) => ({
        session_id: session.id,
        user_id: uid,
        rep_number: i + 1,
        distance_m: r.distance_m,
        time_sec: r.time_sec,
        rest_sec: r.rest_sec,
      }));
      const { error: re } = await supabase.from("interval_reps").insert(rows);
      if (re) throw re;
    },
    onSuccess: () => {
      toast.success("Ripetute salvate");
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      navigate({ to: "/workouts" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-24">
      <Link to="/workouts" className="mb-2 inline-flex items-center gap-1 text-sm text-accent">
        <ArrowLeft className="h-4 w-4" /> Schede
      </Link>
      <h1 className="text-2xl font-bold text-label">Ripetute</h1>
      <p className="mt-0.5 text-xs text-label-secondary">
        {signature ? `Sessione: ${signature}` : "Aggiungi la prima ripetuta"}
      </p>

      <div className="ios-card mt-4 divide-y divide-separator">
        <label className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-sm text-label">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-right text-base text-label outline-none"
          />
        </label>
      </div>

      <section className="ios-card mt-3 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
          Nuova ripetuta
        </div>
        <DistancePicker value={distance} onChange={setDistance} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-fill px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-label-tertiary">
              Tempo (s)
            </div>
            <input
              inputMode="decimal"
              placeholder="es. 64.5"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full bg-transparent text-base font-semibold text-label outline-none"
            />
          </label>
          <label className="rounded-xl bg-fill px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-label-tertiary">
              Recupero (s)
            </div>
            <input
              inputMode="numeric"
              placeholder="es. 120"
              value={restStr}
              onChange={(e) => setRestStr(e.target.value)}
              className="w-full bg-transparent text-base font-semibold text-label outline-none"
            />
          </label>
        </div>
        <button
          onClick={addRep}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-2.5 text-sm font-semibold text-accent active:opacity-70"
        >
          <Plus className="h-4 w-4" /> Aggiungi ripetuta
        </button>
      </section>

      {reps.length > 0 && (
        <section className="mt-4">
          <div className="ios-card overflow-hidden">
            <div className="grid grid-cols-[32px_1fr_1fr_1fr_36px] items-center gap-2 border-b border-separator bg-fill-secondary px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-label-tertiary">
              <div>#</div>
              <div>Dist.</div>
              <div className="text-center">Tempo</div>
              <div className="text-center">Rec.</div>
              <div />
            </div>
            <ul>
              {reps.map((r, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[32px_1fr_1fr_1fr_36px] items-center gap-2 border-b border-separator px-3 py-2 last:border-b-0"
                >
                  <div className="text-sm font-semibold text-label">{i + 1}</div>
                  <div className="text-sm text-label tabular-nums">
                    {r.distance_m < 1000 ? `${r.distance_m}m` : `${r.distance_m / 1000}km`}
                  </div>
                  <div className="text-center text-sm tabular-nums text-label">
                    {r.time_sec}s
                  </div>
                  <div className="text-center text-sm tabular-nums text-label-secondary">
                    {r.rest_sec != null ? `${r.rest_sec}s` : "—"}
                  </div>
                  <button
                    onClick={() => removeRep(i)}
                    aria-label="Elimina ripetuta"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-fill text-danger active:opacity-70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <textarea
        placeholder="Note"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="ios-card mt-3 w-full resize-none bg-background p-3 text-sm text-label outline-none"
      />

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending || reps.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Fine allenamento, salva
      </button>
    </div>
  );
}

/** Build a session signature like "8x400" or "3x400 + 4x200". */
function buildSignature(reps: Rep[]): string {
  if (reps.length === 0) return "";
  const groups: Array<{ d: number; n: number }> = [];
  reps.forEach((r) => {
    const last = groups[groups.length - 1];
    if (last && last.d === r.distance_m) last.n++;
    else groups.push({ d: r.distance_m, n: 1 });
  });
  return groups.map((g) => `${g.n}x${g.d}`).join(" + ");
}
