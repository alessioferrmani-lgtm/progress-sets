import { INTERVAL_KINDS, intervalKind, type IntervalKind } from "@/lib/interval-kind";
import { fetchIntervalSessions } from "@/lib/athletics-queries";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DistancePicker } from "@/components/DistancePicker";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForRace } from "@/lib/calories";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/workouts/intervals/new")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  component: NewIntervalPage,
});

type Rep = {
  distance_m: number;
  time_sec: number | null;
  rest_sec: number | null;
  rest_mode: "time" | "distance" | "free";
  rest_distance_m: number | null;
  notes: string | null;
};

function NewIntervalPage() {
  const navigate = useNavigate();
  const { edit: editId } = Route.useSearch();
  const [kind, setKind] = useState<IntervalKind>("standard");
  const [editingRep, setEditingRep] = useState<number | null>(null);
  const [count, setCount] = useState("1");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const existingQ = useQuery({
    queryKey: ["interval_sessions"],
    queryFn: fetchIntervalSessions,
    enabled: !!editId,
  });
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [distance, setDistance] = useState<number | null>(400);
  const [timeStr, setTimeStr] = useState("");
  const [restStr, setRestStr] = useState("120");
  const [restMode, setRestMode] = useState<Rep["rest_mode"]>("time");
  const [restDistance, setRestDistance] = useState("100");
  const [repNote, setRepNote] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!recovering || !restEndsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [recovering, restEndsAt]);
  const [notes, setNotes] = useState("");
  const [reps, setReps] = useState<Rep[]>([]);

  useEffect(() => {
    if (!editId || loadedId === editId || !existingQ.data) return;
    const session = existingQ.data.find((s) => s.id === editId);
    if (!session) return;
    setKind(intervalKind(session.interval_kind));
    setDate(session.date);
    setNotes(session.notes ?? "");
    setDurationStr(session.duration_sec == null ? "" : String(session.duration_sec / 60));
    setReps(
      session.interval_reps.map((r) => ({
        distance_m: r.distance_m,
        time_sec: r.time_sec,
        rest_sec: r.rest_sec,
        rest_mode: (r.rest_mode ?? (r.rest_sec == null ? "free" : "time")) as Rep["rest_mode"],
        rest_distance_m: r.rest_distance_m ?? null,
        notes: r.notes ?? null,
      })),
    );
    setLoadedId(editId);
  }, [editId, loadedId, existingQ.data]);

  const signature = useMemo(() => buildSignature(reps), [reps]);

  const addRep = () => {
    const t = timeStr.trim() ? Number(timeStr.replace(",", ".")) : null;
    const r = restMode === "time" ? Number(restStr.replace(",", ".")) : null;
    const rd = restMode === "distance" ? Number(restDistance.replace(",", ".")) : null;
    if (!distance) return toast.error("Seleziona una distanza");
    if (t !== null && (!Number.isFinite(t) || t <= 0))
      return toast.error("Inserisci un tempo positivo o lascia vuoto");
    if (r !== null && (!Number.isFinite(r) || r <= 0))
      return toast.error("Inserisci un recupero positivo");
    if (rd !== null && (!Number.isFinite(rd) || rd <= 0))
      return toast.error("Inserisci una distanza di recupero positiva");
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 100 || (editingRep === null && reps.length + n > 500))
      return toast.error("Inserisci da 1 a 100 ripetizioni, massimo 500 per sessione");
    const row: Rep = {
      distance_m: distance,
      time_sec: t,
      rest_sec: r,
      rest_mode: restMode,
      rest_distance_m: rd,
      notes: repNote.trim() || null,
    };
    setReps((cur) =>
      editingRep === null
        ? [...cur, ...Array.from({ length: n }, () => ({ ...row }))]
        : cur.map((r, i) => (i === editingRep ? row : r)),
    );
    setRecovering(editingRep === null && n === 1);
    setEditingRep(null);
    setCount("1");
    setNow(Date.now());
    setRestEndsAt(r === null ? null : Date.now() + r * 1000);
    setTimeStr(""); // keep distance + rest for the next rep
  };

  const removeRep = (idx: number) => {
    setEditingRep(null);
    setReps((cur) => cur.filter((_, i) => i !== idx));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (reps.length === 0) throw new Error("Aggiungi almeno una ripetuta");
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sessione scaduta");

      const totalSec = reps.reduce((s, r) => s + (r.time_sec ?? 0), 0);
      const totalDist = reps.reduce((s, r) => s + r.distance_m, 0);
      const calories =
        profileQ.data && totalDist > 0 && reps.every((r) => r.time_sec !== null)
          ? computeCaloriesForRace(profileQ.data, {
              distance_m: totalDist,
              time_sec: totalSec,
              avg_hr: null,
            })
          : null;

      const duration = durationStr.trim() ? Number(durationStr.replace(",", ".")) * 60 : null;
      if (duration !== null && (!Number.isFinite(duration) || duration <= 0))
        throw new Error("Durata totale non valida");
      if (editId) {
        if (loadedId !== editId) throw new Error("Attendi il caricamento della sessione");
        const response = await fetch("/api/sites/interval-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Progress-Sets": "1" },
          body: JSON.stringify({
            id: editId,
            session: {
              date,
              signature,
              interval_kind: kind,
              duration_sec: duration,
              notes: notes || null,
              calories_burned: calories,
            },
            reps,
          }),
        });
        const result = await response.json();
        if (!response.ok || result.error)
          throw new Error(result.error?.message || "Salvataggio non riuscito");
        return;
      }
      let sessionId: string | null = null;
      try {
        const { data: session, error: se } = await supabase
          .from("interval_sessions")
          .insert({
            user_id: uid,
            date,
            signature,
            interval_kind: kind,
            duration_sec: duration,
            notes: notes || null,
            calories_burned: calories,
          })
          .select("id")
          .single();
        if (se) throw se;
        sessionId = session.id;

        const rows = reps.map((r, i) => ({
          session_id: session.id,
          user_id: uid,
          rep_number: i + 1,
          distance_m: r.distance_m,
          time_sec: r.time_sec,
          rest_sec: r.rest_sec,
          rest_mode: r.rest_mode,
          rest_distance_m: r.rest_distance_m,
          notes: r.notes,
        }));
        const { error: re } = await supabase.from("interval_reps").insert(rows);
        if (re) throw re;
      } catch (error) {
        if (sessionId) {
          await supabase.from("interval_sessions").delete().eq("id", sessionId).eq("user_id", uid);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ripetute salvate");
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      qc.invalidateQueries({ queryKey: ["interval_sessions"] });
      navigate({ to: "/athletics" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (editId && loadedId !== editId)
    return (
      <div className="p-6">
        <Link to="/athletics" className="text-accent">
          Torna ad Atletica
        </Link>
        <p className="mt-4">
          {existingQ.isPending
            ? "Caricamento sessione…"
            : existingQ.isError
              ? "Impossibile caricare la sessione. Riprova."
              : "Sessione non trovata."}
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-24">
      <Link to="/athletics" className="mb-2 inline-flex items-center gap-1 text-sm text-accent">
        <ArrowLeft className="h-4 w-4" /> Atletica
      </Link>
      <h1 className="text-2xl font-bold text-label">
        {editId ? "Modifica sessione" : "Nuova sessione di ripetute"}
      </h1>
      <label className="ios-card mt-4 block p-3 text-sm">
        Tipologia
        <select
          aria-label="Tipologia ripetute"
          value={kind}
          onChange={(e) => setKind(e.target.value as IntervalKind)}
          className="mt-2 w-full rounded-xl bg-background p-2 text-base text-label"
        >
          <option value="standard">Ripetute</option>
          <optgroup label="Ripetute in salita">
            <option value="hill_short">Salite corte</option>
            <option value="hill_long">Salite lunghe</option>
          </optgroup>
        </select>
        <p className="mt-2 text-label-secondary">
          {kind === "standard"
            ? "Sessione di ripetute"
            : "Ripetute in salita · " + INTERVAL_KINDS[kind]}
        </p>
      </label>
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

      <p className="mt-3 text-sm text-label-secondary">
        Aggiungi ogni tratto della sessione di ripetute.
      </p>
      <div className="ios-card mt-3 p-3 text-sm text-label">
        Kcal stimate:{" "}
        {profileQ.data && reps.length && reps.every((r) => r.time_sec !== null)
          ? (computeCaloriesForRace(profileQ.data, {
              distance_m: reps.reduce((n, r) => n + r.distance_m, 0),
              time_sec: reps.reduce((n, r) => n + (r.time_sec ?? 0), 0),
            }) ?? "—")
          : "—"}
        <p className="mt-1 text-sm text-label-secondary">
          Stima da peso e distanza. Recuperi esclusi. Con prove non cronometrate la stima non viene
          calcolata. {!profileQ.data?.weight_kg && "Inserisci il peso nel profilo."}
        </p>
      </div>
      <label className="ios-card mt-3 block p-3 text-sm">
        Durata totale sessione (min, facoltativa)
        <input
          aria-label="Durata totale sessione"
          inputMode="decimal"
          value={durationStr}
          onChange={(e) => setDurationStr(e.target.value)}
          className="mt-2 w-full bg-transparent text-base"
          placeholder="Tempo totale, recuperi inclusi"
        />
      </label>
      {recovering ? (
        <section className="ios-card mt-3 p-4" aria-label="Recupero ripetuta">
          <h2 className="font-semibold">Recupero</h2>
          <p className="my-3 text-label-secondary">
            {restEndsAt !== null
              ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) + " s"
              : reps.at(-1)?.rest_mode === "distance"
                ? reps.at(-1)?.rest_distance_m + " m di passo"
                : "Libero: riparti quando sei pronto"}
          </p>
          <button
            onClick={() => {
              setRecovering(false);
              setRestEndsAt(null);
            }}
            className="min-h-11 w-full rounded-full bg-accent text-accent-foreground"
          >
            Avvia prossima ripetuta
          </button>
        </section>
      ) : (
        <section className="ios-card mt-3 p-3">
          {editingRep !== null && (
            <button onClick={() => setEditingRep(null)} className="mb-2 text-sm text-accent">
              Annulla modifica ripetuta
            </button>
          )}
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
            {editingRep === null ? "Nuova ripetuta" : "Modifica ripetuta " + (editingRep + 1)}
          </div>
          {editingRep === null && (
            <label className="mb-3 block text-sm">
              Numero di ripetizioni
              <input
                aria-label="Numero di ripetizioni"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="ml-3 w-20 rounded-xl bg-fill p-2"
              />
            </label>
          )}
          <DistancePicker key={editingRep ?? "new"} value={distance} onChange={setDistance} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="rounded-xl bg-fill px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-label-tertiary">
                Tempo (s, facoltativo)
              </div>
              <input
                inputMode="decimal"
                placeholder="Non cronometrata"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full bg-transparent text-base font-semibold text-label outline-none"
              />
            </label>
            <label className="rounded-xl bg-fill px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-label-tertiary">
                <select
                  aria-label="Tipo di recupero"
                  value={restMode}
                  onChange={(e) => setRestMode(e.target.value as Rep["rest_mode"])}
                  className="mb-2 w-full bg-background text-sm"
                >
                  <option value="time">A tempo (s)</option>
                  <option value="distance">Di passo (metri)</option>
                  <option value="free">Libero</option>
                </select>
              </div>
              <input
                inputMode="numeric"
                placeholder="es. 120"
                disabled={restMode === "free"}
                value={restMode === "distance" ? restDistance : restMode === "free" ? "" : restStr}
                onChange={(e) =>
                  restMode === "distance"
                    ? setRestDistance(e.target.value)
                    : setRestStr(e.target.value)
                }
                className="w-full bg-transparent text-base font-semibold text-label outline-none"
              />
            </label>
          </div>
          <input
            aria-label="Indicazione ripetuta"
            placeholder="Sciolto, allungo, girare le gambe…"
            value={repNote}
            onChange={(e) => setRepNote(e.target.value)}
            className="mt-3 w-full rounded-xl bg-fill p-3 text-sm"
          />
          <button
            onClick={addRep}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-2.5 text-sm font-semibold text-accent active:opacity-70"
          >
            <Plus className="h-4 w-4" />{" "}
            {editingRep === null ? "Aggiungi ripetuta" : "Aggiorna ripetuta"}
          </button>
        </section>
      )}

      {reps.length > 0 && (
        <section className="mt-4">
          <p className="mb-2 text-xs text-label-secondary">
            Tocca il numero per modificare una ripetuta.
          </p>
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
                  <button
                    aria-label={"Modifica ripetuta " + (i + 1)}
                    className="text-sm font-semibold text-accent underline"
                    onClick={() => {
                      setEditingRep(i);
                      setRecovering(false);
                      setCount("1");
                      setDistance(r.distance_m);
                      setTimeStr(r.time_sec == null ? "" : String(r.time_sec));
                      setRestMode(r.rest_mode);
                      setRestStr(String(r.rest_sec ?? 120));
                      setRestDistance(String(r.rest_distance_m ?? 100));
                      setRepNote(r.notes ?? "");
                    }}
                  >
                    {i + 1}
                  </button>
                  <div className="text-sm text-label tabular-nums">
                    {r.distance_m < 1000 ? `${r.distance_m}m` : `${r.distance_m / 1000}km`}
                  </div>
                  <div className="min-w-0 break-words text-center text-sm tabular-nums text-label">
                    {r.time_sec === null ? "Non cronometrata" : r.time_sec + "s"}
                  </div>
                  <div className="text-center text-sm tabular-nums text-label-secondary">
                    {r.rest_mode === "distance"
                      ? r.rest_distance_m + " m passo"
                      : r.rest_sec != null
                        ? r.rest_sec + "s"
                        : "Libero"}
                    {r.notes && <p className="mt-1 text-xs">{r.notes}</p>}
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
        disabled={save.isPending || reps.length === 0 || editingRep !== null}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
      >
        <Check className="h-4 w-4" />{" "}
        {save.isPending ? "Salvataggio…" : editId ? "Salva modifiche" : "Fine allenamento, salva"}
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
