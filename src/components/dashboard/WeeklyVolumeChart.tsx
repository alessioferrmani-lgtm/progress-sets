import { useMemo, useState } from "react";
import type { WeekBucket } from "@/lib/dashboard-queries";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Metric = "volume" | "reps" | "duration";

const METRICS: Array<{ key: Metric; label: string; unit: string; format: (n: number) => string }> = [
  {
    key: "volume",
    label: "Volume",
    unit: "kg",
    format: (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))),
  },
  { key: "reps", label: "Ripetizioni", unit: "rep", format: (n) => String(Math.round(n)) },
  {
    key: "duration",
    label: "Durata",
    unit: "min",
    format: (n) => (n >= 60 ? `${Math.floor(n / 60)}h ${Math.round(n % 60)}m` : `${Math.round(n)}m`),
  },
];

export function WeeklyVolumeChart({ weeks }: { weeks: WeekBucket[] }) {
  const [metric, setMetric] = useState<Metric>("volume");
  const meta = METRICS.find((m) => m.key === metric)!;
  const chartData = useMemo(
    () =>
      weeks.map((w) => ({
        week: w.weekLabel,
        value:
          metric === "volume" ? w.volume : metric === "reps" ? w.reps : w.durationMin,
      })),
    [weeks, metric],
  );
  const currentTotal = chartData[chartData.length - 1]?.value ?? 0;

  return (
    <section className="ios-card p-4">
      <div className="flex items-center gap-1 rounded-full bg-fill p-1 text-xs font-medium">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className="flex-1 rounded-full px-3 py-1.5 transition-colors"
            style={{
              background: metric === m.key ? "var(--color-surface)" : "transparent",
              color: metric === m.key ? "var(--color-label)" : "var(--color-label-secondary)",
              boxShadow: metric === m.key ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight text-label">
          {meta.format(currentTotal)}{" "}
          <span className="text-base font-medium text-label-secondary">{meta.unit}</span>
        </div>
        <div className="text-xs text-label-secondary">questa settimana</div>
      </div>
      <div className="mt-3 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--color-label-tertiary)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--color-accent-soft)" }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "0.5px solid var(--color-separator)",
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${meta.format(v)} ${meta.unit}`, meta.label]}
              labelFormatter={(l) => `Settimana del ${l}`}
            />
            <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
