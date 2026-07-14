import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTestType,
  fetchTestsForType,
  formatTime,
  formatDistance,
  currentSportsYear,
} from "@/lib/athletics-queries";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForTest } from "@/lib/calories";
import { ArrowLeft, Check, Flame, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/athletics/tests/$typeId")({
  component: TestTypePage,
});

function TestTypePage() {
  const { typeId } = Route.useParams();
  const qc = useQueryClient();

  const typeQ = useQuery({ queryKey: ["test_type", typeId], queryFn: () => fetchTestType(typeId) });
  const testsQ = useQuery({ queryKey: ["tests", "type", typeId], queryFn: () => fetchTestsForType(typeId) });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState("");
  const [distanceStr, setDistanceStr] = useState("");
  const [hr, setHr] = useState("");
  const [weather, setWeather] = useState("");
  const [notes, setNotes] = useState("");
  const [observations, setObservations] = useState("");

  const type = typeQ.data;
  const isTime = type?.result_type === "TIME";

  const save = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error("Tipo non caricato");
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const time_sec = isTime && timeStr ? parseTime(timeStr) : null;
      const distance_covered_m = !isTime && distanceStr ? Number(distanceStr) : null;
      if (isTime && !time_sec) throw new Error("Inserisci il tempo");
      if (!isTime && !distance_covered_m) throw new Error("Inserisci la distanza coperta");

      const calories = profileQ.data
        ? computeCaloriesForTest(profileQ.data, {
            result_type: type.result_type,
            distance_m: type.distance_m,
            duration_sec: type.duration_sec,
            time_sec,
            avg_hr: hr ? Number(hr) : null,
          })
        : null;

      const { error } = await supabase.from("tests").insert({
        user_id: uid,
        test_type_id: type.id,
        date,
        time_sec,
        distance_covered_m,
        avg_hr: hr ? Number(hr) : null,
        weather: weather || null,
        notes: notes || null,
        observations: observations || null,
        calories_burned: calories,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test salvato");
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      setTimeStr("");
      setDistanceStr("");
      setHr("");
      setNotes("");
      setObservations("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prova eliminata");
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmDelete = (id: string) => {
    if (window.confirm("Vuoi eliminare questo test? L'operazione è definitiva.")) {
      del.mutate(id);
    }
  };

  const rows = testsQ.data ?? [];
  const values = rows
    .map((r) => (isTime ? r.time_sec : r.distance_covered_m))
    .filter((v): v is number => v != null);
  const bestAll = values.length
    ? isTime
      ? Math.min(...values)
      : Math.max(...values)
    : null;
  const { start: syStart, end: syEnd } = currentSportsYear();
  const seasonRows = rows.filter((r) => {
    const d = new Date(r.date);
    return d >= syStart && d <= syEnd;
  });
  const seasonVals = seasonRows
    .map((r) => (isTime ? r.time_sec : r.distance_covered_m))
    .filter((v): v is number => v != null);
  const bestSeason = seasonVals.length
    ? isTime
      ? Math.min(...seasonVals)
      : Math.max(...seasonVals)
    : null;
  const last = rows[0];
  const prev = rows[1];
  const lastVal = last ? (isTime ? last.time_sec : last.distance_covered_m) : null;
  const prevVal = prev ? (isTime ? prev.time_sec : prev.distance_covered_m) : null;
  const delta =
    lastVal != null && prevVal != null ? lastVal - prevVal : null;

  const chartData = useMemo(
    () =>
      [...rows]
        .filter((r) => (isTime ? r.time_sec != null : r.distance_covered_m != null))
        .reverse()
        .map((r) => ({
          date: format(new Date(r.date), "d MMM", { locale: it }),
          value: isTime ? r.time_sec! : r.distance_covered_m!,
        })),
    [rows, isTime],
  );

  if (!type) {
    return <div className="p-6 text-center text-label-tertiary">Caricamentoâ€¦</div>;
  }

  return (
    <div>
      <Link
        to="/athletics/tests"
        className="mb-2 inline-flex items-center gap-1 text-sm text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Test
      </Link>
      <h2 className="text-2xl font-bold text-label">{type.name}</h2>
      <p className="text-xs text-label-secondary">
        {isTime
          ? `A tempo Â· ${type.distance_m ?? "?"}m`
          : `A distanza Â· ${type.duration_sec ?? "?"}s`}
      </p>

      {/* Best / season / delta */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCell
          label="PR assoluto"
          value={bestAll != null ? (isTime ? formatTime(bestAll) : formatDistance(bestAll)) : "â€”"}
        />
        <StatCell
          label="Stagione"
          value={bestSeason != null ? (isTime ? formatTime(bestSeason) : formatDistance(bestSeason)) : "â€”"}
        />
        <StatCell
          label="Î” ultima"
          value={
            delta == null
              ? "â€”"
              : (isTime ? delta > 0 : delta < 0)
                ? `${Math.abs(delta).toFixed(1)}${isTime ? "s" : "m"} â†“`
                : `${Math.abs(delta).toFixed(1)}${isTime ? "s" : "m"} â†‘`
          }
          tone={delta == null ? "n" : (isTime ? delta < 0 : delta > 0) ? "up" : "down"}
        />
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="ios-card mt-4 p-3">
          <div className="mb-1 text-xs font-semibold text-label-secondary">Andamento</div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-separator)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-label-tertiary)" }} />
                <YAxis
                  reversed={isTime}
                  tick={{ fontSize: 10, fill: "var(--color-label-tertiary)" }}
                  width={40}
                  tickFormatter={(v) => (isTime ? formatTime(v) : String(v))}
                />
                <Tooltip
                  formatter={(v: number) => (isTime ? formatTime(v) : `${v}m`)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-separator)",
                    background: "var(--color-background)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-accent)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Form */}
      <section className="mt-4">
        <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Nuova prova
        </h3>
        <div className="ios-card divide-y divide-separator">
          <FormField label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-right text-base text-label outline-none"
            />
          </FormField>
          {isTime ? (
            <FormField label="Tempo (secondi, es. 42.18)">
              <input
                inputMode="decimal"
                placeholder="12.85"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-32 bg-transparent text-right text-base text-label outline-none"
              />
            </FormField>
          ) : (
            <FormField label="Distanza (m)">
              <input
                type="number"
                inputMode="numeric"
                placeholder="2400"
                value={distanceStr}
                onChange={(e) => setDistanceStr(e.target.value)}
                className="w-32 bg-transparent text-right text-base text-label outline-none"
              />
            </FormField>
          )}
          <FormField label="FC media (opz.)">
            <input
              type="number"
              inputMode="numeric"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              className="w-24 bg-transparent text-right text-base text-label outline-none"
            />
          </FormField>
          <FormField label="Meteo">
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="bg-transparent text-right text-base text-label outline-none"
            >
              <option value="">â€”</option>
              <option>Sole</option>
              <option>Vento</option>
              <option>Pioggia</option>
              <option>Caldo</option>
              <option>Freddo</option>
            </select>
          </FormField>
        </div>
        <textarea
          placeholder="Note"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="ios-card mt-3 w-full resize-none bg-background p-3 text-sm text-label outline-none"
        />
        <textarea
          placeholder="Osservazioni tecniche"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={2}
          className="ios-card mt-2 w-full resize-none bg-background p-3 text-sm text-label outline-none"
        />
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Salva prova
        </button>
        {!profileQ.data?.weight_kg && (
          <p className="mt-2 text-center text-[11px] text-label-tertiary">
            Completa il profilo per calcolare le calorie bruciate.
          </p>
        )}
      </section>

      {/* History */}
      <section className="mt-6">
        <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Storico
        </h3>
        {rows.length === 0 ? (
          <div className="ios-card p-6 text-center text-sm text-label-secondary">
            Nessuna prova registrata.
          </div>
        ) : (
          <ul className="ios-list">
            {rows.map((r) => (
              <li key={r.id} className="ios-list-row">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-label">
                    {isTime
                      ? formatTime(r.time_sec ?? 0)
                      : r.distance_covered_m
                        ? formatDistance(r.distance_covered_m)
                        : "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {format(new Date(r.date), "d MMM yyyy", { locale: it })}
                    {r.avg_hr ? ` · ${r.avg_hr} bpm` : ""}
                    {r.weather ? ` · ${r.weather}` : ""}
                  </div>
                  {(r.notes || r.observations) && (
                    <div className="mt-1 text-xs text-label-tertiary">
                      {[r.notes, r.observations].filter(Boolean).join(" — ")}
                    </div>
                  )}
                </div>
                {r.calories_burned != null && (
                  <div className="flex items-center gap-1 text-xs font-medium text-warning">
                    <Flame className="h-3 w-3" />
                    {Math.round(r.calories_burned)}
                  </div>
                )}
                <button
                  onClick={() => confirmDelete(r.id)}
                  disabled={del.isPending}
                  aria-label="Elimina prova"
                  className="rounded-full bg-fill p-1.5 text-danger active:opacity-70 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "n";
}) {
  const color =
    tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-label";
  return (
    <div className="ios-card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase text-label-tertiary">
        {label}
      </div>
      <div className={"mt-1 text-base font-bold tabular-nums " + color}>{value}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-label">{label}</span>
      {children}
    </label>
  );
}

/** The app stores test times as decimal seconds (for example 42.18). */
function parseTime(input: string): number | null {
  const s = input.trim();
  if (!s || s.includes(":")) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

