import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
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
import { ArrowLeft, Check, Flame, Trash2, X } from "lucide-react";
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

  const typeQ = useQuery({
    queryKey: ["test_type", typeId],
    queryFn: () => fetchTestType(typeId),
  });
  const testsQ = useQuery({
    queryKey: ["tests", "type", typeId],
    queryFn: () => fetchTestsForType(typeId),
  });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState("");
  const [distanceStr, setDistanceStr] = useState("");
  const [hr, setHr] = useState("");
  const [weather, setWeather] = useState("");
  const [notes, setNotes] = useState("");
  const [observations, setObservations] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const type = typeQ.data;
  const isTime = type?.result_type === "TIME";

  const refreshTestData = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["tests"] }),
      qc.invalidateQueries({ queryKey: ["performance_log"] }),
      qc.invalidateQueries({ queryKey: ["dash"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: async () => {
      setStatusMessage("Salvataggio in corso…");

      if (!type) throw new Error("Tipo di test non caricato.");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Sessione scaduta. Esci e accedi di nuovo.");

      const timeSec = isTime ? parseTime(timeStr) : null;
      const distanceCoveredM = !isTime ? parsePositiveNumber(distanceStr) : null;
      const avgHr = hr.trim() ? parsePositiveInteger(hr) : null;

      if (isTime && timeSec == null) {
        throw new Error("Inserisci un tempo valido, ad esempio 42.18.");
      }
      if (!isTime && distanceCoveredM == null) {
        throw new Error("Inserisci una distanza valida.");
      }
      if (hr.trim() && avgHr == null) {
        throw new Error("La frequenza cardiaca non è valida.");
      }

      const calories = profileQ.data
        ? computeCaloriesForTest(profileQ.data, {
            result_type: type.result_type,
            distance_m: type.distance_m,
            duration_sec: type.duration_sec,
            time_sec: timeSec,
            avg_hr: avgHr,
          })
        : null;

      const { data, error } = await supabase
        .from("tests")
        .insert({
          user_id: user.id,
          test_type_id: type.id,
          date,
          time_sec: timeSec,
          distance_covered_m: distanceCoveredM,
          avg_hr: avgHr,
          weather: weather || null,
          notes: notes.trim() || null,
          observations: observations.trim() || null,
          calories_burned: calories,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Il test non è stato salvato.");

      return data.id;
    },
    onSuccess: async () => {
      await refreshTestData();
      setTimeStr("");
      setDistanceStr("");
      setHr("");
      setNotes("");
      setObservations("");
      setStatusMessage("Test salvato correttamente.");
      toast.success("Test salvato");
    },
    onError: (error: Error) => {
      console.error("[tests] save failed", error);
      setStatusMessage(`Errore: ${error.message}`);
      toast.error(error.message);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      setStatusMessage("Eliminazione in corso…");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Sessione scaduta. Esci e accedi di nuovo.");

      const { data, error } = await supabase
        .from("tests")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Il test non è stato eliminato. Controlla i permessi del database.");
      }

      return id;
    },
    onSuccess: async () => {
      setPendingDeleteId(null);
      await refreshTestData();
      setStatusMessage("Test eliminato correttamente.");
      toast.success("Test eliminato");
    },
    onError: (error: Error) => {
      console.error("[tests] delete failed", error);
      setStatusMessage(`Errore: ${error.message}`);
      toast.error(error.message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!save.isPending) save.mutate();
  };

  const rows = testsQ.data ?? [];
  const values = rows
    .map((row) => (isTime ? row.time_sec : row.distance_covered_m))
    .filter((value): value is number => value != null);

  const bestAll = values.length
    ? isTime
      ? Math.min(...values)
      : Math.max(...values)
    : null;

  const { start: sportsYearStart, end: sportsYearEnd } = currentSportsYear();
  const seasonValues = rows
    .filter((row) => {
      const rowDate = new Date(row.date);
      return rowDate >= sportsYearStart && rowDate <= sportsYearEnd;
    })
    .map((row) => (isTime ? row.time_sec : row.distance_covered_m))
    .filter((value): value is number => value != null);

  const bestSeason = seasonValues.length
    ? isTime
      ? Math.min(...seasonValues)
      : Math.max(...seasonValues)
    : null;

  const lastValue = rows[0]
    ? isTime
      ? rows[0].time_sec
      : rows[0].distance_covered_m
    : null;
  const previousValue = rows[1]
    ? isTime
      ? rows[1].time_sec
      : rows[1].distance_covered_m
    : null;
  const delta =
    lastValue != null && previousValue != null ? lastValue - previousValue : null;

  const chartData = useMemo(
    () =>
      [...rows]
        .filter((row) =>
          isTime ? row.time_sec != null : row.distance_covered_m != null,
        )
        .reverse()
        .map((row) => ({
          date: format(new Date(row.date), "d MMM", { locale: it }),
          value: isTime ? row.time_sec! : row.distance_covered_m!,
        })),
    [rows, isTime],
  );

  if (typeQ.isError) {
    return (
      <div className="ios-card p-5 text-sm text-danger">
        Impossibile caricare il tipo di test.
      </div>
    );
  }

  if (!type) {
    return <div className="p-6 text-center text-label-tertiary">Caricamento…</div>;
  }

  return (
    <div className="relative z-10 pointer-events-auto">
      <Link
        to="/athletics/tests"
        className="mb-2 inline-flex items-center gap-1 text-sm text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Test
      </Link>

      <h2 className="text-2xl font-bold text-label">{type.name}</h2>
      <p className="text-xs text-label-secondary">
        {isTime
          ? `A tempo · ${type.distance_m ?? "?"}m`
          : `A distanza · ${type.duration_sec ?? "?"}s`}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCell
          label="PR assoluto"
          value={
            bestAll != null
              ? isTime
                ? formatTime(bestAll)
                : formatDistance(bestAll)
              : "—"
          }
        />
        <StatCell
          label="Stagione"
          value={
            bestSeason != null
              ? isTime
                ? formatTime(bestSeason)
                : formatDistance(bestSeason)
              : "—"
          }
        />
        <StatCell
          label="Δ ultima"
          value={
            delta == null
              ? "—"
              : (isTime ? delta > 0 : delta < 0)
                ? `${Math.abs(delta).toFixed(1)}${isTime ? "s" : "m"} ↓`
                : `${Math.abs(delta).toFixed(1)}${isTime ? "s" : "m"} ↑`
          }
          tone={
            delta == null
              ? "n"
              : (isTime ? delta < 0 : delta > 0)
                ? "up"
                : "down"
          }
        />
      </div>

      {chartData.length > 1 && (
        <div className="ios-card mt-4 p-3">
          <div className="mb-1 text-xs font-semibold text-label-secondary">
            Andamento
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--color-separator)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 10,
                    fill: "var(--color-label-tertiary)",
                  }}
                />
                <YAxis
                  reversed={isTime}
                  tick={{
                    fontSize: 10,
                    fill: "var(--color-label-tertiary)",
                  }}
                  width={40}
                  tickFormatter={(value) =>
                    isTime ? formatTime(value) : String(value)
                  }
                />
                <Tooltip
                  formatter={(value: number) =>
                    isTime ? formatTime(value) : `${value}m`
                  }
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

      <section className="mt-4">
        <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Nuova prova
        </h3>

        <form onSubmit={handleSubmit} className="relative z-20 pointer-events-auto">
          <div className="ios-card divide-y divide-separator">
            <FormField label="Data">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="pointer-events-auto bg-transparent text-right text-base text-label outline-none"
              />
            </FormField>

            {isTime ? (
              <FormField label="Tempo (secondi)">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="42.18"
                  value={timeStr}
                  onChange={(event) => setTimeStr(event.target.value)}
                  className="pointer-events-auto w-32 bg-transparent text-right text-base text-label outline-none"
                />
              </FormField>
            ) : (
              <FormField label="Distanza (m)">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="2400"
                  value={distanceStr}
                  onChange={(event) => setDistanceStr(event.target.value)}
                  className="pointer-events-auto w-32 bg-transparent text-right text-base text-label outline-none"
                />
              </FormField>
            )}

            <FormField label="FC media (opz.)">
              <input
                type="number"
                inputMode="numeric"
                value={hr}
                onChange={(event) => setHr(event.target.value)}
                className="pointer-events-auto w-24 bg-transparent text-right text-base text-label outline-none"
              />
            </FormField>

            <FormField label="Meteo">
              <select
                value={weather}
                onChange={(event) => setWeather(event.target.value)}
                className="pointer-events-auto bg-transparent text-right text-base text-label outline-none"
              >
                <option value="">—</option>
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
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="ios-card pointer-events-auto mt-3 w-full resize-none bg-background p-3 text-sm text-label outline-none"
          />

          <textarea
            placeholder="Osservazioni tecniche"
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            rows={2}
            className="ios-card pointer-events-auto mt-2 w-full resize-none bg-background p-3 text-sm text-label outline-none"
          />

          <button
            type="submit"
            disabled={save.isPending}
            className="pointer-events-auto relative z-30 mt-3 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {save.isPending ? "Salvataggio…" : "Salva prova"}
          </button>
        </form>

        {statusMessage && (
          <div
            role="status"
            className={`ios-card mt-3 p-3 text-center text-sm ${
              statusMessage.startsWith("Errore")
                ? "text-danger"
                : "text-label-secondary"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {!profileQ.data?.weight_kg && (
          <p className="mt-2 text-center text-[11px] text-label-tertiary">
            Completa il profilo per calcolare le calorie bruciate.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Storico
        </h3>

        {testsQ.isError ? (
          <div className="ios-card p-5 text-center text-sm text-danger">
            Impossibile caricare lo storico.
          </div>
        ) : rows.length === 0 ? (
          <div className="ios-card p-6 text-center text-sm text-label-secondary">
            Nessuna prova registrata.
          </div>
        ) : (
          <ul className="ios-list">
            {rows.map((row) => (
              <li key={row.id} className="ios-list-row relative z-20">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-label">
                    {isTime
                      ? formatTime(row.time_sec ?? 0)
                      : row.distance_covered_m
                        ? formatDistance(row.distance_covered_m)
                        : "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {format(new Date(row.date), "d MMM yyyy", { locale: it })}
                    {row.avg_hr ? ` · ${row.avg_hr} bpm` : ""}
                    {row.weather ? ` · ${row.weather}` : ""}
                  </div>
                  {(row.notes || row.observations) && (
                    <div className="mt-1 text-xs text-label-tertiary">
                      {[row.notes, row.observations].filter(Boolean).join(" — ")}
                    </div>
                  )}
                </div>

                {row.calories_burned != null && (
                  <div className="flex items-center gap-1 text-xs font-medium text-warning">
                    <Flame className="h-3 w-3" />
                    {Math.round(row.calories_burned)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPendingDeleteId(row.id);
                  }}
                  disabled={del.isPending}
                  aria-label="Elimina prova"
                  className="pointer-events-auto relative z-30 flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-full bg-fill text-danger active:opacity-70 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 pointer-events-auto sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-test-title"
          onClick={() => {
            if (!del.isPending) setPendingDeleteId(null);
          }}
        >
          <div
            className="ios-card w-full max-w-sm bg-background p-5 pointer-events-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="delete-test-title" className="text-lg font-bold text-label">
                  Eliminare questo test?
                </h3>
                <p className="mt-1 text-sm text-label-secondary">
                  L’operazione è definitiva.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={del.isPending}
                className="pointer-events-auto flex min-h-10 min-w-10 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={del.isPending}
                className="pointer-events-auto min-h-11 rounded-full bg-fill px-4 py-2.5 font-semibold text-label"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingDeleteId && !del.isPending) {
                    del.mutate(pendingDeleteId);
                  }
                }}
                disabled={del.isPending}
                className="pointer-events-auto min-h-11 rounded-full bg-danger px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {del.isPending ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    tone === "up"
      ? "text-success"
      : tone === "down"
        ? "text-danger"
        : "text-label";

  return (
    <div className="ios-card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase text-label-tertiary">
        {label}
      </div>
      <div className={`mt-1 text-base font-bold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-label">{label}</span>
      {children}
    </div>
  );
}

function parseTime(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized || normalized.includes(":")) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parsePositiveNumber(input: string): number | null {
  const value = Number(input.trim().replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parsePositiveInteger(input: string): number | null {
  const value = Number(input.trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}
