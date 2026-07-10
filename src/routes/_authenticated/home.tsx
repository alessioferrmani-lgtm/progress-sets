import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchAllTimePRs,
  fetchRecentSessions,
  fetchRecentSets,
  bucketByWeek,
  type SessionRow,
  type SetRow,
} from "@/lib/dashboard-queries";
import { musclesFor, type MuscleGroup } from "@/lib/muscle-map";
import { WeeklyVolumeChart } from "@/components/dashboard/WeeklyVolumeChart";
import { MuscleSilhouette } from "@/components/dashboard/MuscleSilhouette";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-queries";
import { isProfileComplete } from "@/lib/calories";
import { fetchAllTests } from "@/lib/athletics-queries";
import { fetchRaces } from "@/lib/athletics-queries";
import {
  Flame,
  Trophy,
  ChevronRight,
  ArrowRight,
  Calendar as CalendarIcon,
  History,
  UserCog,
} from "lucide-react";
import {
  startOfISOWeek,
  endOfISOWeek,
  subDays,
  subWeeks,
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

  const today = new Date();
  const dateLabel = format(today, "EEEE d MMMM", { locale: it });

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      {/* Header */}
      <header className="pb-3 pt-1">
        <p className="text-sm capitalize text-label-secondary">{dateLabel}</p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-label">
          Ciao, {displayName}
        </h1>
      </header>

      <div className="space-y-4">
        <ProfileBanner profile={profileQ.data} loading={profileQ.isLoading} />

        <CaloriesCard
          profileComplete={isProfileComplete(profileQ.data ?? null)}
          sessions={sessionsQ.data}
          tests={testsQ.data}
          races={racesQ.data}
          loading={sessionsQ.isLoading || testsQ.isLoading || racesQ.isLoading}
        />

        <StreakSection sessions={sessionsQ.data} loading={sessionsQ.isLoading} />

        <VolumeSection
          sessions={sessionsQ.data}
          sets={setsQ.data}
          loading={sessionsQ.isLoading || setsQ.isLoading}
        />

        <MuscleSection
          sessions={sessionsQ.data}
          sets={setsQ.data}
          loading={setsQ.isLoading}
        />

        <PRsSection
          prs={prsQ.data}
          sets={setsQ.data}
          loading={prsQ.isLoading || setsQ.isLoading}
        />

        <RecentSessionsSection
          sessions={sessionsQ.data}
          sets={setsQ.data}
          loading={sessionsQ.isLoading}
        />

        <MonthCalendarSection sessions={sessionsQ.data} />

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
  return (
    <div
      className="ios-card animate-pulse bg-fill-secondary"
      style={{ height: h }}
    />
  );
}

function StreakSection({
  sessions,
  loading,
}: {
  sessions?: SessionRow[];
  loading: boolean;
}) {
  if (loading || !sessions) return <Skeleton h={96} />;
  const now = new Date();
  const currentWeekStart = startOfISOWeek(now);
  const currentWeekHas = sessions.some(
    (s) => new Date(s.started_at) >= currentWeekStart,
  );
  // Count consecutive prior weeks (excluding current if empty) that have at least one session
  let streak = 0;
  const cursor = new Date(currentWeekStart);
  if (currentWeekHas) streak = 1;
  for (let i = 1; i < 104; i++) {
    const start = subWeeks(cursor, i);
    const end = endOfISOWeek(start);
    const has = sessions.some((s) => {
      const t = new Date(s.started_at);
      return t >= start && t <= end;
    });
    if (has) streak = (currentWeekHas ? 1 : 0) + i;
    else break;
  }

  if (!currentWeekHas) {
    return (
      <section className="ios-card p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--color-accent-soft)" }}
          >
            <Flame className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-label">Inizia la tua settimana</div>
            <div className="text-xs text-label-secondary">
              {streak > 0
                ? `Non perdere la serie di ${streak} settimane`
                : "Registra il primo allenamento"}
            </div>
          </div>
          <Link
            to="/workouts"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:scale-[0.97]"
          >
            Inizia
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="ios-card flex items-center gap-3 p-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--color-accent-soft)" }}
      >
        <Flame className="h-6 w-6 text-accent" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-tight text-label">
          {streak} {streak === 1 ? "settimana" : "settimane"} di fila
        </div>
        <div className="text-xs text-label-secondary">Continua così</div>
      </div>
    </section>
  );
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

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Petto",
  back: "Schiena",
  shoulders: "Spalle",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  abs: "Addome",
  quads: "Quadricipiti",
  hamstrings: "Femorali",
  glutes: "Glutei",
  calves: "Polpacci",
  forearms: "Avambracci",
};

function MuscleSection({
  sessions,
  sets,
  loading,
}: {
  sessions?: SessionRow[];
  sets?: SetRow[];
  loading: boolean;
}) {
  if (loading || !sets || !sessions) return <Skeleton h={260} />;
  const since = subDays(new Date(), 7);
  const recentSets = sets.filter((s) => new Date(s.completed_at) >= since);
  const active = new Set<MuscleGroup>();
  recentSets.forEach((s) => musclesFor(s.exercise_name).forEach((g) => active.add(g)));

  const weekStart = startOfISOWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const sessionDays = new Set(
    sessions.map((s) => format(new Date(s.started_at), "yyyy-MM-dd")),
  );

  return (
    <section className="ios-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-label">Muscoli allenati</h2>
        <span className="text-xs text-label-secondary">ultimi 7 giorni</span>
      </div>
      {active.size === 0 ? (
        <p className="py-4 text-center text-sm text-label-secondary">
          Nessun allenamento negli ultimi 7 giorni.
        </p>
      ) : (
        <>
          <MuscleSilhouette active={active} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from(active).map((g) => (
              <span
                key={g}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-accent"
                style={{ background: "var(--color-accent-soft)" }}
              >
                {MUSCLE_LABELS[g]}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="mt-4 flex items-center justify-between">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const has = sessionDays.has(key);
          const isToday = isSameDay(d, new Date());
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium uppercase text-label-tertiary">
                {format(d, "EEEEEE", { locale: it })}
              </span>
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                  (has
                    ? "bg-accent text-accent-foreground"
                    : isToday
                      ? "border border-accent text-accent"
                      : "bg-fill text-label-secondary")
                }
              >
                {format(d, "d")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
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
            <li
              key={i}
              className="ios-list-row"
            >
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
              <div className="text-base font-semibold tabular-nums text-label">
                {r.weight}kg
              </div>
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
          <p className="text-sm text-label-secondary">
            Non hai ancora completato allenamenti.
          </p>
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
                  (new Date(s.ended_at).getTime() -
                    new Date(s.started_at).getTime()) /
                    60000,
                )
              : 0;
            const sessSets = (sets ?? []).filter((x) => x.session_id === s.id);
            const volume = sessSets.reduce(
              (a, x) => a + x.weight_kg * x.reps,
              0,
            );
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
                      {volume >= 1000
                        ? `${(volume / 1000).toFixed(1)}k`
                        : Math.round(volume)}
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

function MonthCalendarSection({ sessions }: { sessions?: SessionRow[] }) {
  if (!sessions) return null;
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const days = eachDayOfInterval({ start, end });
  const leadingBlanks = (getDay(start) + 6) % 7; // Monday-first

  const byDay = new Map<string, string>(); // yyyy-MM-dd -> template name
  sessions.forEach((s) => {
    const key = format(new Date(s.started_at), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, s.template_name ?? "Allenamento");
  });

  return (
    <details className="ios-card group p-4">
      <summary className="flex cursor-pointer items-center justify-between list-none">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-label-secondary" />
          <span className="text-base font-semibold text-label">
            {format(now, "MMMM yyyy", { locale: it })}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-label-tertiary transition-transform group-open:rotate-90" />
      </summary>
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
          const has = byDay.has(key);
          const isToday = isSameDay(d, new Date());
          return (
            <div key={key} className="flex flex-col items-center gap-0.5 py-1">
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs " +
                  (has
                    ? "bg-accent font-semibold text-accent-foreground"
                    : isToday
                      ? "border border-accent text-accent"
                      : "text-label")
                }
              >
                {format(d, "d")}
              </span>
              {has && (
                <span className="w-full truncate text-[8px] leading-tight text-label-secondary">
                  {byDay.get(key)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </details>
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
        <div className="text-sm font-semibold text-label">
          Completa il tuo profilo
        </div>
        <div className="text-xs text-label-secondary">
          Aggiungi altezza, peso e data di nascita per calcolare le calorie.
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-label-tertiary" />
    </Link>
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
    return (
      <div className="ios-card animate-pulse bg-fill-secondary" style={{ height: 88 }} />
    );
  }
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sum =
    (sessions ?? [])
      .filter((s) => new Date(s.started_at) >= since)
      .reduce((a, s) => a + (Number((s as unknown as { calories_burned: number | null }).calories_burned) || 0), 0) +
    (tests ?? [])
      .filter((t) => new Date(t.date) >= since)
      .reduce((a, t) => a + (Number(t.calories_burned) || 0), 0) +
    (races ?? [])
      .filter((r) => new Date(r.date) >= since)
      .reduce((a, r) => a + (Number(r.calories_burned) || 0), 0);

  return (
    <section className="ios-card flex items-center gap-3 p-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--color-accent-soft)" }}
      >
        <Flame className="h-6 w-6 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase text-label-tertiary">
          Calorie bruciate · 7 giorni
        </div>
        {profileComplete ? (
          <div className="text-2xl font-bold tabular-nums text-label">
            {Math.round(sum)} kcal
          </div>
        ) : (
          <div className="text-sm text-label-secondary">
            Completa il profilo per vedere le calorie
          </div>
        )}
      </div>
    </section>
  );
}
