import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  addMonths,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  format,
  isSameDay,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchRecentSessions, type SessionRow } from "@/lib/dashboard-queries";
import {
  type IntervalSessionRow,
  type TestRow,
  type RaceRow,
  formatDistance,
  formatTime,
} from "@/lib/athletics-queries";
import { CONTINUOUS_RUN, runPace } from "@/lib/continuous-run";
import { BottomSheet } from "./BottomSheet";
import { RaceDetail } from "./RaceDetail";

export function MonthCalendarSection({
  sessions,
  intervals,
  tests,
  races,
}: {
  sessions?: SessionRow[];
  intervals?: IntervalSessionRow[];
  tests?: TestRow[];
  races?: RaceRow[];
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [day, setDay] = useState<string | null>(null);
  const [detail, setDetail] = useState<IntervalSessionRow | TestRow | null>(null);
  const [race, setRace] = useState<RaceRow | null>(null);
  const key = format(month, "yyyy-MM");
  const gym = useQuery({
    queryKey: ["dash", "calendar", key],
    queryFn: () =>
      fetchRecentSessions(120, {
        start: month.toISOString(),
        end: addMonths(month, 1).toISOString(),
      }),
  });
  const gymRows =
    gym.data ?? sessions?.filter((s) => format(new Date(s.started_at), "yyyy-MM") === key) ?? [];
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
  const items = (date: string) => ({
    gym: gymRows.filter((s) => format(new Date(s.started_at), "yyyy-MM-dd") === date),
    run: (intervals ?? []).filter((s) => s.date === date),
    tests: (tests ?? []).filter((s) => s.date === date),
    races: (races ?? []).filter((s) => s.date === date),
  });
  const selected = day ? items(day) : null;
  const change = (delta: number) => {
    setMonth((m) => addMonths(m, delta));
    setDay(null);
  };
  return (
    <section className="ios-card p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => change(-1)}
          aria-label="Mese precedente"
          className="flex size-11 items-center justify-center rounded-full bg-fill"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="text-base font-semibold capitalize text-label">
          {format(month, "MMMM yyyy", { locale: it })}
        </h2>
        <button
          onClick={() => change(1)}
          aria-label="Mese successivo"
          className="flex size-11 items-center justify-center rounded-full bg-fill"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-label-secondary">
        <span>
          <span className="text-success">●</span> Corsa · <span className="text-accent">●</span>{" "}
          Palestra
        </span>
        <button
          onClick={() => {
            setMonth(startOfMonth(new Date()));
            setDay(format(new Date(), "yyyy-MM-dd"));
          }}
          className="min-h-10 px-2 font-semibold text-accent"
        >
          Oggi
        </button>
      </div>
      {gym.isError && (
        <p role="alert" className="text-sm text-danger">
          Storico palestra non disponibile.{" "}
          <button onClick={() => gym.refetch()} className="underline">
            Riprova
          </button>
        </p>
      )}
      <div
        className="mt-2 grid grid-cols-7 gap-1 text-center"
        aria-label="Calendario attività"
        aria-busy={gym.isFetching}
      >
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <span key={i} className="text-sm text-label-secondary">
            {d}
          </span>
        ))}
        {Array.from({ length: (getDay(month) + 6) % 7 }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {days.map((d) => {
          const date = format(d, "yyyy-MM-dd");
          const a = items(date);
          const run = a.run.length + a.tests.length + a.races.length > 0;
          const gym = a.gym.length > 0;
          return (
            <button
              key={date}
              onClick={() => setDay(date)}
              aria-label={`${format(d, "d MMMM yyyy", { locale: it })}: ${a.gym.length + a.run.length + a.tests.length + a.races.length} attività`}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl active:bg-fill"
            >
              <span
                className={
                  "flex size-7 items-center justify-center rounded-full text-sm " +
                  (run && gym
                    ? "bg-gradient-to-br from-success from-50% to-accent to-50% text-white"
                    : run
                      ? "bg-success text-white"
                      : gym
                        ? "bg-accent text-accent-foreground"
                        : isSameDay(d, new Date())
                          ? "border border-accent text-accent"
                          : "text-label")
                }
              >
                {format(d, "d")}
              </span>
              <span className="flex h-2 items-center gap-1">
                {gym && <i className="size-1.5 rounded-full bg-accent" />}
                {run && <i className="size-1.5 rounded-full bg-success" />}
                {a.races.length > 0 && <span className="text-xs">🔥</span>}
              </span>
            </button>
          );
        })}
      </div>
      <BottomSheet
        open={!!day}
        onClose={() => setDay(null)}
        title={
          day ? format(new Date(day + "T12:00:00"), "EEEE d MMMM", { locale: it }) : "Attività"
        }
      >
        <div className="space-y-3">
          {selected?.gym.map((s) => (
            <Link
              key={s.id}
              to="/sessions/$sessionId/summary"
              params={{ sessionId: s.id }}
              className="block rounded-2xl bg-fill p-4"
            >
              <strong className="text-label">{s.template_name ?? "Allenamento libero"}</strong>
              <p className="text-sm text-label-secondary">
                Palestra · {format(new Date(s.started_at), "HH:mm")} · Apri allenamento
              </p>
            </Link>
          ))}
          {selected?.run.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setDetail(s);
                setDay(null);
              }}
              className="block w-full rounded-2xl bg-fill p-4 text-left"
            >
              <strong>{s.signature === CONTINUOUS_RUN ? "Corsa continua" : "Ripetute"}</strong>
              <p className="text-sm text-label-secondary">
                {formatDistance(s.interval_reps.reduce((n, r) => n + r.distance_m, 0))} · Apri
                attività
              </p>
            </button>
          ))}
          {selected?.tests.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setDetail(s);
                setDay(null);
              }}
              className="block w-full rounded-2xl bg-fill p-4 text-left"
            >
              <strong>Test atletico</strong>
              <p className="text-sm text-label-secondary">
                {s.time_sec != null
                  ? formatTime(s.time_sec)
                  : s.distance_covered_m != null
                    ? formatDistance(s.distance_covered_m)
                    : "Apri risultato"}
              </p>
            </button>
          ))}
          {selected?.races.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setRace(s);
                setDay(null);
              }}
              className="block w-full rounded-2xl bg-fill p-4 text-left"
            >
              <strong>🔥 {s.name}</strong>
              <p className="text-sm text-label-secondary">
                {formatDistance(s.distance_m)} · {formatTime(s.time_sec)} · Parziali
              </p>
            </button>
          ))}
          {selected && Object.values(selected).every((a) => !a.length) && (
            <p className="text-label-secondary">
              {gym.isFetching
                ? "Caricamento attività…"
                : gym.isError
                  ? "Impossibile verificare tutte le attività."
                  : "Nessuna attività registrata."}
            </p>
          )}
        </div>
      </BottomSheet>
      <RaceDetail race={race} onClose={() => setRace(null)} />
      <BottomSheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail && "interval_reps" in detail
            ? detail.signature === CONTINUOUS_RUN
              ? "Corsa continua"
              : "Ripetute"
            : "Test atletico"
        }
      >
        {detail && (
          <div className="space-y-3 text-label">
            <p>{detail.date.split("-").reverse().join("/")}</p>
            {"interval_reps" in detail ? (
              <>
                <p className="text-xl font-semibold">
                  {formatDistance(detail.interval_reps.reduce((n, r) => n + r.distance_m, 0))} ·{" "}
                  {formatTime(detail.interval_reps.reduce((n, r) => n + r.time_sec, 0))}
                </p>
                {detail.interval_reps.map((r) => (
                  <div key={r.id} className="rounded-xl bg-fill p-3">
                    {detail.signature === CONTINUOUS_RUN ? "Corsa" : "Ripetuta " + r.rep_number}:{" "}
                    {formatDistance(r.distance_m)} · {formatTime(r.time_sec)} ·{" "}
                    {runPace(r.distance_m, r.time_sec)}/km
                    {r.rest_sec != null && (
                      <p className="text-sm text-label-secondary">Recupero {r.rest_sec}s</p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                <p>Tempo: {detail.time_sec != null ? formatTime(detail.time_sec) : "—"}</p>
                <p>
                  Distanza:{" "}
                  {detail.distance_covered_m != null
                    ? formatDistance(detail.distance_covered_m)
                    : "—"}
                </p>
                {detail.avg_hr && <p>FC media: {detail.avg_hr} bpm</p>}
                {detail.observations && <p>{detail.observations}</p>}
                <Link
                  to="/athletics/tests/$typeId"
                  params={{ typeId: detail.test_type_id }}
                  className="block text-accent"
                >
                  Apri storico del test
                </Link>
              </>
            )}
            {detail.calories_burned != null && <p>{Math.round(detail.calories_burned)} kcal</p>}
            {detail.notes && <p className="whitespace-pre-wrap">{detail.notes}</p>}
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
