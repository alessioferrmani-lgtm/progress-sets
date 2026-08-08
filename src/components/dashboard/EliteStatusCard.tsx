import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Activity, BatteryCharging, Moon, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  acuteChronicRatio,
  comparePeriods,
  computeReadiness,
  totalTrainingLoad,
} from "@/lib/athlete-insights";
import {
  fetchAthleteActivities,
  fetchTodayCheckin,
  saveCheckin,
  todayKey,
} from "@/lib/athlete-queries";

type FormState = {
  sleepHours: string;
  sleepQuality: string;
  soreness: string;
  stress: string;
  motivation: string;
  restingHr: string;
  hrvMs: string;
};

const EMPTY_FORM: FormState = {
  sleepHours: "8",
  sleepQuality: "3",
  soreness: "3",
  stress: "3",
  motivation: "3",
  restingHr: "",
  hrvMs: "",
};

export function EliteStatusCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const checkinQ = useQuery({
    queryKey: ["athlete-checkin", userId, todayKey()],
    queryFn: () => fetchTodayCheckin(),
  });
  const activitiesQ = useQuery({
    queryKey: ["athlete-activities", userId],
    queryFn: () => fetchAthleteActivities(),
  });
  const save = useMutation({
    mutationFn: () =>
      saveCheckin({
        sleep_hours: parseOptionalNumber(form.sleepHours),
        sleep_quality: parseScale(form.sleepQuality),
        soreness: parseScale(form.soreness),
        stress: parseScale(form.stress),
        motivation: parseScale(form.motivation),
        resting_hr: parseOptionalNumber(form.restingHr),
        hrv_ms: parseOptionalNumber(form.hrvMs),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["athlete-checkin", userId, todayKey()], data);
      setEditorOpen(false);
      toast.success("Stato di recupero aggiornato");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossibile salvare lo stato"),
  });

  const current = checkinQ.data;
  const readiness = useMemo(
    () =>
      computeReadiness({
        sleepHours: current?.sleep_hours,
        sleepQuality: current?.sleep_quality,
        soreness: current?.soreness,
        stress: current?.stress,
        motivation: current?.motivation,
        restingHr: current?.resting_hr,
        hrvMs: current?.hrv_ms,
      }),
    [current],
  );
  const load = useMemo(() => {
    const activities = activitiesQ.data ?? [];
    const now = new Date();
    const acuteStart = new Date(now);
    acuteStart.setDate(acuteStart.getDate() - 7);
    const previousStart = new Date(now);
    previousStart.setDate(previousStart.getDate() - 14);
    const acute = totalTrainingLoad(activities, acuteStart, now);
    const previous = totalTrainingLoad(activities, previousStart, acuteStart);
    return {
      acute,
      previous,
      comparison: comparePeriods(acute, previous),
      acwr: acuteChronicRatio(activities, now),
    };
  }, [activitiesQ.data]);
  const readinessLabel = current ? readiness.label : "Da compilare";
  const readinessScore = current ? String(readiness.score) : "—";
  const readinessAdvice = current
    ? readiness.recommendation
    : "Inserisci sonno, stress e indolenzimento per ricevere un consiglio personalizzato.";

  const openEditor = () => {
    setForm({
      sleepHours:
        current?.sleep_hours == null ? EMPTY_FORM.sleepHours : String(current.sleep_hours),
      sleepQuality:
        current?.sleep_quality == null ? EMPTY_FORM.sleepQuality : String(current.sleep_quality),
      soreness: current?.soreness == null ? EMPTY_FORM.soreness : String(current.soreness),
      stress: current?.stress == null ? EMPTY_FORM.stress : String(current.stress),
      motivation: current?.motivation == null ? EMPTY_FORM.motivation : String(current.motivation),
      restingHr: current?.resting_hr == null ? "" : String(current.resting_hr),
      hrvMs: current?.hrv_ms == null ? "" : String(current.hrv_ms),
    });
    setEditorOpen(true);
  };

  if (checkinQ.isError || activitiesQ.isError) return null;

  return (
    <section className="ios-card overflow-hidden p-4" data-testid="elite-status-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/15">
            <BatteryCharging className="size-5 text-accent" />
          </span>
          <div>
            <h2 className="text-base font-bold text-label">Stato atleta</h2>
            <p className="text-xs text-label-secondary">Recupero e carico delle ultime settimane</p>
          </div>
        </div>
        <button type="button" onClick={openEditor} className="text-xs font-semibold text-accent">
          Aggiorna
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric
          icon={Sparkles}
          value={readinessScore}
          label={readinessLabel}
          tone={current && readiness.score < 45 ? "warning" : "accent"}
        />
        <Metric icon={Activity} value={String(load.acute)} label="Carico 7g" />
        <Metric
          icon={ShieldAlert}
          value={load.acwr == null ? "—" : `${load.acwr}x`}
          label="ACWR"
          tone={load.acwr != null && load.acwr > 1.5 ? "warning" : "accent"}
        />
      </div>

      <p className="mt-3 rounded-2xl bg-fill-secondary px-3 py-2 text-xs leading-snug text-label-secondary">
        {readinessAdvice}
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-label-tertiary">
        <span className="flex items-center gap-1">
          <Moon className="size-3.5" />{" "}
          {current?.sleep_hours ? `${current.sleep_hours}h di sonno` : "Inserisci il sonno"}
        </span>
        <span>
          {load.comparison.percentage == null
            ? "Prima settimana"
            : `${load.comparison.percentage > 0 ? "+" : ""}${load.comparison.percentage}% vs settimana scorsa`}
        </span>
      </div>

      {editorOpen && (
        <div className="mt-4 border-t border-separator/60 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Sonno (ore)"
              value={form.sleepHours}
              onChange={(value) => setForm((s) => ({ ...s, sleepHours: value }))}
              min="0"
              max="24"
              step="0.5"
            />
            <NumberField
              label="FC riposo"
              value={form.restingHr}
              onChange={(value) => setForm((s) => ({ ...s, restingHr: value }))}
              min="25"
              max="240"
            />
            <NumberField
              label="HRV (ms)"
              value={form.hrvMs}
              onChange={(value) => setForm((s) => ({ ...s, hrvMs: value }))}
              min="0"
              max="500"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            <ScaleField
              label="Qualità sonno"
              value={form.sleepQuality}
              onChange={(value) => setForm((s) => ({ ...s, sleepQuality: value }))}
            />
            <ScaleField
              label="Indolenzimento"
              value={form.soreness}
              onChange={(value) => setForm((s) => ({ ...s, soreness: value }))}
            />
            <ScaleField
              label="Stress"
              value={form.stress}
              onChange={(value) => setForm((s) => ({ ...s, stress: value }))}
            />
            <ScaleField
              label="Motivazione"
              value={form.motivation}
              onChange={(value) => setForm((s) => ({ ...s, motivation: value }))}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="flex-1 rounded-full bg-fill py-2.5 text-sm font-semibold text-label-secondary"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {save.isPending ? "Salvataggio…" : "Salva stato"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  tone = "accent",
}: {
  icon: typeof Activity;
  value: string;
  label: string;
  tone?: "accent" | "warning";
}) {
  return (
    <div className="rounded-2xl bg-fill-secondary p-2.5 text-center">
      <Icon className={`mx-auto size-4 ${tone === "warning" ? "text-warning" : "text-accent"}`} />
      <div className="mt-1 text-lg font-bold tabular-nums text-label">{value}</div>
      <div className="text-[10px] text-label-secondary">{label}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  step?: string;
}) {
  return (
    <label className="text-[10px] font-semibold uppercase text-label-secondary">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-sm font-semibold text-label outline-none ring-accent focus:ring-2"
      />
    </label>
  );
}

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[10px] font-semibold uppercase text-label-secondary">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 accent-[var(--color-accent)]"
        />
        <span className="w-4 text-right text-xs font-bold tabular-nums text-label">{value}</span>
      </div>
    </label>
  );
}

function parseScale(value: string): number {
  return Math.min(5, Math.max(1, Number.parseInt(value, 10) || 3));
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
