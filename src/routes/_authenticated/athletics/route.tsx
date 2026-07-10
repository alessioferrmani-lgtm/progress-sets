import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchPerformanceLog, formatDistance, formatTime } from "@/lib/athletics-queries";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Trophy, TrendingUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/athletics")({
  component: AthleticsLayout,
});

function AthleticsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRaces = pathname.startsWith("/athletics/races");

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="pb-3 text-3xl font-bold text-label">Atletica</h1>

      <InsightsCards />

      {/* Segmented control */}
      <div className="mt-4 flex rounded-xl bg-fill p-1">
        <SegBtn to="/athletics/tests" active={!isRaces}>Test</SegBtn>
        <SegBtn to="/athletics/races" active={isRaces}>Gare</SegBtn>
      </div>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}

function SegBtn({
  to,
  active,
  children,
}: {
  to: "/athletics/tests" | "/athletics/races";
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={
        "flex-1 rounded-lg py-1.5 text-center text-sm font-semibold transition-all " +
        (active
          ? "bg-background text-label shadow-sm"
          : "text-label-secondary")
      }
    >
      {children}
    </Link>
  );
}

function InsightsCards() {
  const { data: perf } = useQuery({
    queryKey: ["performance_log"],
    queryFn: fetchPerformanceLog,
  });

  const insights = useMemo(() => {
    if (!perf || perf.length === 0) return [];
    // Group by distance bucket (exact match)
    const byDist = new Map<number, typeof perf>();
    perf.forEach((p) => {
      const arr = byDist.get(p.distance_m) ?? [];
      arr.push(p);
      byDist.set(p.distance_m, arr);
    });

    const out: Array<{ icon: "trophy" | "up" | "spark"; text: string }> = [];

    // 1. Best ever on the most recently used distance
    const mostRecent = perf[0];
    const sameDist = byDist.get(mostRecent.distance_m) ?? [];
    const best = sameDist.reduce((a, b) => (a.time_sec <= b.time_sec ? a : b));
    out.push({
      icon: "trophy",
      text: `Il tuo miglior ${formatDistance(best.distance_m)} è ${formatTime(best.time_sec)} il ${format(new Date(best.date), "d MMM yyyy", { locale: it })}`,
    });

    // 2. Improvement vs 1y ago on same distance
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const priorYear = sameDist.filter((p) => new Date(p.date) < oneYearAgo);
    if (priorYear.length && best.time_sec < priorYear[0].time_sec) {
      const delta = priorYear[0].time_sec - best.time_sec;
      out.push({
        icon: "up",
        text: `Hai migliorato il tuo ${formatDistance(best.distance_m)} di ${delta.toFixed(1)}s rispetto all'anno scorso`,
      });
    }

    // 3. Rank of most recent among same distance
    const sortedAsc = [...sameDist].sort((a, b) => a.time_sec - b.time_sec);
    const rank = sortedAsc.findIndex((p) => p.id === mostRecent.id) + 1;
    if (rank > 0 && sortedAsc.length > 1) {
      out.push({
        icon: "spark",
        text: `L'ultima prova sui ${formatDistance(mostRecent.distance_m)} è la tua ${rank}ª miglior prestazione di sempre`,
      });
    }

    return out.slice(0, 3);
  }, [perf]);

  if (!insights.length) return null;

  return (
    <div className="mt-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
      {insights.map((i, k) => {
        const Icon = i.icon === "trophy" ? Trophy : i.icon === "up" ? TrendingUp : Sparkles;
        return (
          <div
            key={k}
            className="ios-card min-w-[85%] shrink-0 snap-start p-3"
          >
            <Icon className="mb-1.5 h-4 w-4 text-accent" />
            <p className="text-sm leading-snug text-label">{i.text}</p>
          </div>
        );
      })}
    </div>
  );
}
