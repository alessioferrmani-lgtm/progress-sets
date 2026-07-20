import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchAllTimePRs,
  fetchRecentSessions,
  fetchRecentSets,
  bucketByWeek,
  type SessionRow,
  type SetRow,
} from "@/lib/dashboard-queries";
import { WeeklyVolumeChart } from "@/components/dashboard/WeeklyVolumeChart";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile, upsertMyProfile } from "@/lib/profile-queries";
import { isProfileComplete } from "@/lib/calories";
import { fetchAllTests, fetchIntervalSessions, fetchRaces } from "@/lib/athletics-queries";
import {
  Flame,
  Trophy,
  ChevronRight,
  ArrowRight,
  Calendar as CalendarIcon,
  History,
  UserCog,
  Scale,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  subDays,
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { it } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const { user } = Route.useRouteContext();
  const sessionsQ = useQuery({
    queryKey: ["dash", "sessions", user.id],
    queryFn: () => fetchRecentSessions(120),
  });
  const setsQ = useQuery({
    queryKey: ["dash", "sets", user.id],
    queryFn: () => fetchRecentSets(120),
  });
  const prsQ = useQuery({
    queryKey: ["dash", "prs", user.id],
    queryFn: () => fetchAllTimePRs(),
  });
  const profileQ = useQuery({
    queryKey: ["profile", user.id],
    queryFn: fetchMyProfile,
  });
  const displayName = profileQ.data?.display_name || "Aggiungi il tuo nome nelle Impostazioni";
  const testsQ = useQuery({
    queryKey: ["dash", "tests", user.id],
    queryFn: fetchAllTests,
  });
  const racesQ = useQuery({
    queryKey: ["dash", "races", user.id],
    queryFn: fetchRaces,
  });
  const intervalsQ = useQuery({
    queryKey: ["interval_sessions"],
    queryFn: fetchIntervalSessions,
  });

  const today = new Date();
  const dateLabel = format(today, "EEEE d MMMM", { locale: it });

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      {/* Header */}
      <header className="pb-3 pt-1">
        <p className="text-sm capitalize text-label-secondary">{dateLabel}</p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-label">Ciao, {displayName}</h1>
      </header>

      <div className="space-y-4">
        <ProfileBanner profile={profileQ.data} loading={profileQ.isLoading} />

        <div className="grid grid-cols-2 gap-3">
          <WeightReminder profile={profileQ.data} loading={profileQ.isLoading} userId={user.id} />
          <CaloriesCard
            profileComplete={isProfileComplete(profileQ.data ?? null)}
            sessions={sessionsQ.data}
            tests={testsQ.data}
            races={racesQ.data}
            loading={sessionsQ.isLoading || testsQ.isLoading || racesQ.isLoading}
          />
        </div>

        <MonthCalendarSection
          sessions={sessionsQ.data}
          intervals={intervalsQ.data}
          tests={testsQ.data}
          races={racesQ.data}
        />

        <VolumeSection
          sessions={sessionsQ.data}
          sets={setsQ.data}
          loading={sessionsQ.isLoading || setsQ.isLoading}
        />

        <PRsSection prs={prsQ.data} sets={setsQ.data} loading={prsQ.isLoading || setsQ.isLoading} />

        <RecentSessionsSection
          sessions={sessionsQ.data}
          sets={setsQ.data}
          loading={sessionsQ.isLoading}
        />

        <button
          onClick={() => supabase.auth.signOut()}
          className="mx-auto mt-6 block text-xs text-label-tertiary underline"
        >
          Esci
        </button>
      </div>
    </div>
  );
}

/* ------------------ Sections ------------------ */

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="ios-card animate-pulse bg-fill-secondary" style={{ height: h }} />;
}

function VolumeSection({
  sessions,
  sets,
  loading,
}: {
  sessions?: SessionRow[];
  sets?: SetRow[];
  loading: boolean;
}) {
  const weeks = useMemo(() => {
    if (!sessions || !sets) return [];
    return bucketByWeek(sessions, sets, 13); // ~3 months
  }, [sessions, sets]);

  if (loading || !weeks.length) return <Skeleton h={280} />;
  return <WeeklyVolumeChart weeks={weeks} />;
}

function PRsSection({
  prs,
  sets,
  loading,
}: {
  prs?: import("@/lib/dashboard-queries").PR[];
  sets?: SetRow[];
  loading: boolean;
}) {
  if (loading || !prs) return <Skeleton h={180} />;
  const monthAgo = subDays(new Date(), 30);
  const recent = prs
    .filter((p) => p.delta !== null && new Date(p.date) >= monthAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  let rows: Array<{
    name: string;
    weight: number;
    date: string;
    delta: number | null;
    label: string;
  }> = [];
  let title = "Record personali recenti";

  if (recent.length > 0) {
    rows = recent.map((p) => ({
      name: p.exercise_name,
      weight: p.weight_kg,
      date: p.date,
      delta: p.delta,
      label: format(new Date(p.date), "d MMM", { locale: it }),
    }));
  } else if (sets && sets.length > 0) {
    // fallback: top-3 most trained exercises with absolute PR
    const counts = new Map<string, { name: string; count: number }>();
    sets.forEach((s) => {
      const c = counts.get(s.exercise_id);
      if (c) c.count++;
      else counts.set(s.exercise_id, { name: s.exercise_name, count: 1 });
    });
    const top = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id]) => id);
    rows = top
      .map((id) => prs.find((p) => p.exercise_id === id))
      .filter((p): p is import("@/lib/dashboard-queries").PR => !!p)
      .map((p) => ({
        name: p.exercise_name,
        weight: p.weight_kg,
        date: p.date,
        delta: null,
        label: "record storico",
      }));
    title = "I tuoi record";
  }

  return (
    <section className="ios-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-warning" />
        <h2 className="text-base font-semibold text-label">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-label-secondary">
          Nessun record ancora. Completa un allenamento per iniziare.
        </p>
      ) : (
        <ul className="-mx-4">
          {rows.map((r, i) => (
            <li key={i} className="ios-list-row">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-label">{r.name}</div>
                <div className="mt-0.5 text-xs text-label-secondary">
                  {r.label}
                  {r.delta !== null && r.delta > 0 && (
                    <>
                      {" · "}
                      <span className="font-semibold text-success">+{r.delta}kg</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-base font-semibold tabular-nums text-label">{r.weight}kg</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentSessionsSection({
  sessions,
  sets,
  loading,
}: {
  sessions?: SessionRow[];
  sets?: SetRow[];
  loading: boolean;
}) {
  if (loading || !sessions) return <Skeleton h={200} />;
  const completed = sessions.filter((s) => s.ended_at).slice(0, 5);
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-label-secondary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-label-secondary">
          Allenamenti recenti
        </h2>
      </div>
      {completed.length === 0 ? (
        <div className="ios-card p-6 text-center">
          <p className="text-sm text-label-secondary">Non hai ancora completato allenamenti.</p>
          <Link
            to="/workouts"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent"
          >
            Vai alle schede <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="ios-list">
          {completed.map((s) => {
            const dur = s.ended_at
              ? Math.round(
                  (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000,
                )
              : 0;
            const sessSets = (sets ?? []).filter((x) => x.session_id === s.id);
            const volume = sessSets.reduce((a, x) => a + x.weight_kg * x.reps, 0);
            return (
              <li key={s.id}>
                <Link
                  to="/sessions/$sessionId/summary"
                  params={{ sessionId: s.id }}
                  className="ios-list-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-label">
                      {s.template_name ?? "Allenamento"}
                    </div>
                    <div className="mt-0.5 text-xs text-label-secondary">
                      {format(new Date(s.started_at), "d MMM · HH:mm", { locale: it })}
                      {" · "}
                      {dur} min · {sessSets.length} serie ·{" "}
                      {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume)}
                      kg
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-label-tertiary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MonthCalendarSection({
  sessions,
  intervals,
  tests,
  races,
}: {
  sessions?: SessionRow[];
  intervals?: import("@/lib/athletics-queries").IntervalSessionRow[];
  tests?: import("@/lib/athletics-queries").TestRow[];
  races?: import("@/lib/athletics-queries").RaceRow[];
}) {
  if (!sessions || !intervals || !tests || !races) return <Skeleton h={300} />;
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const days = eachDayOfInterval({ start, end });
  const leadingBlanks = (getDay(start) + 6) % 7; // Monday-first

  const gymDays = new Set<string>();
  const runDays = new Set<string>();
  const raceDays = new Set<string>();
  sessions.forEach((s) => {
    const key = format(new Date(s.started_at), "yyyy-MM-dd");
    gymDays.add(key);
  });
  intervals.forEach((session) => runDays.add(session.date));
  tests.forEach((test) => runDays.add(test.date));
  races.forEach((race) => {
    runDays.add(race.date);
    raceDays.add(race.date);
  });

  return (
    <section className="ios-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-label-secondary" />
          <span className="text-base font-semibold text-label">
            {format(now, "MMMM yyyy", { locale: it })}
          </span>
        </div>
        <div className="flex gap-2 text-[9px] font-medium text-label-secondary">
          <span className="flex items-center gap-1">
            <i className="size-2 rounded-full bg-success" /> Corsa
          </span>
          <span className="flex items-center gap-1">
            <i className="size-2 rounded-full bg-accent" /> Palestra
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-label-tertiary">
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={"b" + i} />
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const hasGym = gymDays.has(key);
          const hasRun = runDays.has(key);
          const hasRace = raceDays.has(key);
          const isToday = isSameDay(d, new Date());
          return (
            <div key={key} className="flex flex-col items-center gap-0.5 py-1">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs " +
                  (hasGym && hasRun
                    ? "bg-gradient-to-br from-success from-50% to-accent to-50% font-semibold text-white"
                    : hasRun
                      ? "bg-success font-semibold text-white"
                      : hasGym
                        ? "bg-accent font-semibold text-accent-foreground"
                        : isToday
                          ? "border border-accent text-accent"
                          : "text-label")
                }
              >
                {format(d, "d")}
              </span>
              {hasRace ? (
                <span className="-mt-0.5 text-[10px] leading-none" aria-label="Gara">
                  🔥
                </span>
              ) : (
                (hasGym || hasRun) && <span className="size-1 rounded-full bg-label-tertiary" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProfileBanner({
  profile,
  loading,
}: {
  profile: import("@/lib/profile-queries").Profile | null | undefined;
  loading: boolean;
}) {
  if (loading) return null;
  if (isProfileComplete(profile ?? null)) return null;
  return (
    <Link
      to="/profile"
      className="ios-card flex items-center gap-3 p-4"
      style={{ background: "var(--color-accent-soft)" }}
    >
      <UserCog className="h-5 w-5 text-accent" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-label">Completa il tuo profilo</div>
        <div className="text-xs text-label-secondary">
          Aggiungi peso, data di nascita e sesso per stime più precise.
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-label-tertiary" />
    </Link>
  );
}

function WeightReminder({
  profile,
  loading,
  userId,
}: {
  profile: import("@/lib/profile-queries").Profile | null | undefined;
  loading: boolean;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const updateWeight = useMutation({
    mutationFn: (weightKg: number) => upsertMyProfile({ weight_kg: weightKg }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile", userId], updated);
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setOpen(false);
      toast.success("Peso aggiornato");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossibile aggiornare il peso"),
  });

  if (loading) return null;
  const oldWeight = profile?.weight_kg;
  const showEditor = () => {
    setWeight(oldWeight ? String(oldWeight) : "");
    setOpen(true);
  };
  const saveWeight = () => {
    const value = Number(weight.replace(",", "."));
    if (!Number.isFinite(value) || value < 25 || value > 400) {
      toast.error("Inserisci un peso valido tra 25 e 400 kg");
      return;
    }
    updateWeight.mutate(Math.round(value * 10) / 10);
  };

  return (
    <>
      <button
        type="button"
        onClick={showEditor}
        className="ios-card flex min-h-28 w-full flex-col items-start justify-between p-3 text-left active:scale-[0.98]"
        style={{ background: "var(--color-accent-soft)" }}
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Scale className="size-4" />
          </div>
          <ChevronRight className="size-4 text-label-tertiary" />
        </div>
        <div className="mt-3 min-w-0">
          <div className="text-[10px] font-semibold uppercase leading-tight text-label-tertiary">
            Aggiorna peso
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums text-label">
            {oldWeight ? `${oldWeight} kg` : "—"}
          </div>
          <div className="mt-0.5 text-[10px] leading-tight text-label-secondary">
            Tocca per cambiare
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full rounded-t-[28px] bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-fill" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-label">Aggiorna peso</h2>
                {oldWeight && (
                  <p className="text-sm text-label-secondary">Peso precedente: {oldWeight} kg</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Chiudi"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-fill text-label-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="mt-5 block text-xs font-semibold uppercase text-label-secondary">
              Nuovo peso (kg)
              <input
                autoFocus
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                className="mt-2 w-full rounded-xl bg-fill px-4 py-3 text-2xl font-semibold text-label outline-none ring-accent focus:ring-2"
                placeholder="75,0"
              />
            </label>
            <button
              type="button"
              disabled={updateWeight.isPending}
              onClick={saveWeight}
              className="mt-5 w-full rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground disabled:opacity-50"
            >
              {updateWeight.isPending ? "Salvataggio…" : "Salva nuovo peso"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CaloriesCard({
  profileComplete,
  sessions,
  tests,
  races,
  loading,
}: {
  profileComplete: boolean;
  sessions?: SessionRow[];
  tests?: import("@/lib/athletics-queries").TestRow[];
  races?: import("@/lib/athletics-queries").RaceRow[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="ios-card min-h-28 animate-pulse bg-fill-secondary" />;
  }
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const sum =
    (sessions ?? [])
      .filter((s) => s.ended_at && new Date(s.started_at) >= since)
      .reduce((a, s) => a + (Number(s.calories_burned) || 0), 0) +
    (tests ?? [])
      .filter((t) => new Date(t.date) >= since)
      .reduce((a, t) => a + (Number(t.calories_burned) || 0), 0) +
    (races ?? [])
      .filter((r) => new Date(r.date) >= since)
      .reduce((a, r) => a + (Number(r.calories_burned) || 0), 0);

  return (
    <section className="ios-card flex min-h-28 flex-col items-start justify-between p-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-warning/15">
        <Flame className="size-4 text-warning" />
      </div>
      <div className="mt-3 min-w-0">
        <div className="text-[10px] font-semibold uppercase leading-tight text-label-tertiary">
          Kcal bruciate oggi
        </div>
        {profileComplete || sum > 0 ? (
          <div className="mt-1 text-xl font-bold tabular-nums text-label">
            {Math.round(sum)} kcal
          </div>
        ) : (
          <div className="mt-1 text-xs leading-tight text-label-secondary">Completa il profilo</div>
        )}
      </div>
    </section>
  );
}
