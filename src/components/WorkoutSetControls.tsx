import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  elapsedClock,
  pauseClock,
  setLabel,
  type Measurement,
  type WorkoutRow,
} from "@/lib/set-measurement";

export function WorkoutSetControls({
  rows,
  index,
  onSelect,
  onField,
  onPatch,
  onConfigure,
  anotherClockRunning = false,
}: {
  rows: WorkoutRow[];
  index: number;
  onSelect: (index: number) => void;
  onField: (field: "weight" | "reps", value: string) => void;
  onPatch: (patch: Partial<WorkoutRow>) => void;
  onConfigure: (unilateral: boolean, type: Measurement) => void;
  anotherClockRunning?: boolean;
}) {
  const row = rows[index] ?? rows[0];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  if (!row) return null;
  const unilateral = rows[0]?.side !== undefined && rows[0].side !== "both";
  const type = row.reps_type ?? "count";
  const locked = rows.some((r) => r.completed || r.clock?.startedAt != null);
  const running = row.clock?.startedAt != null;
  const milliseconds = elapsedClock(row.clock, now);
  const time = `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}.${Math.floor((milliseconds % 1000) / 100)}`;
  return (
    <>
      <details className="workout-options rounded-xl bg-fill-secondary px-3 py-2 text-sm text-label-secondary">
        <summary className="cursor-pointer">
          {unilateral ? "Monopodalico / unilaterale · SX e DX" : "Bilaterale"} ·{" "}
          {type === "time" ? "A tempo" : type === "distance" ? "Distanza" : "Ripetizioni"}
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2">
            SX / DX separati
            <Switch
              checked={unilateral}
              disabled={locked}
              onCheckedChange={(value) => onConfigure(value, type)}
              aria-label="Monopodalico / unilaterale"
            />
          </label>
          <label className="flex items-center gap-2">
            Misura
            <select
              aria-label="Tipo di serie"
              value={type === "unspecified" ? "count" : type}
              disabled={locked}
              onChange={(e) => onConfigure(unilateral, e.target.value as Measurement)}
              className="rounded-lg bg-fill px-2 py-2 text-label"
            >
              <option value="count">Ripetizioni</option>
              <option value="time">Secondi</option>
              <option value="distance">Metri</option>
            </select>
          </label>
        </div>
        {locked && (
          <p className="mt-2 text-xs">
            Per proteggere le serie registrate, il tipo si cambia prima della prima conferma.
          </p>
        )}
        {unilateral && (
          <p className="mt-2 text-xs">
            Ogni serie ha un lato SX e uno DX. Inserisci il carico usato sul singolo lato.
          </p>
        )}
      </details>
      <div
        className="workout-set-picker mt-3 flex gap-2 overflow-x-auto pb-1"
        aria-label="Serie dell’esercizio"
      >
        {rows.map((r, i) => (
          <button
            key={r.set_number}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Seleziona serie ${setLabel(r)}`}
            aria-pressed={i === index}
            className={`min-h-10 min-w-10 shrink-0 rounded-full border px-2 text-sm font-semibold ${i === index ? "border-accent bg-accent text-accent-foreground" : r.completed ? "border-success bg-success/15 text-success" : "border-separator bg-fill text-label-secondary"}`}
          >
            {setLabel(r)}
          </button>
        ))}
      </div>
      {unilateral && (
        <p className="mt-2 text-sm font-semibold text-accent">
          Serie {setLabel(row)} · lato {row.side === "left" ? "sinistro" : "destro"}
        </p>
      )}
      <div className="workout-values mt-3 grid grid-cols-2 gap-3">
        <Value
          label="Carico kg"
          value={row.weight}
          step={2.5}
          disabled={row.completed}
          onChange={(v) => onField("weight", v)}
        />
        <Value
          label={type === "time" ? "Secondi" : type === "distance" ? "Metri" : "Ripetizioni"}
          value={row.reps}
          step={type === "time" ? 5 : 1}
          disabled={row.completed || running}
          onChange={(v) =>
            type === "time" ? onPatch({ reps: v, clock: undefined }) : onField("reps", v)
          }
        />
      </div>
      {type === "time" && (
        <section
          className="set-stopwatch mt-3 rounded-2xl bg-fill-secondary p-3"
          aria-label="Cronometro serie"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-label-secondary">Cronometro serie</span>
            <output className="text-2xl font-semibold tabular-nums text-label">{time}</output>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={row.completed || anotherClockRunning}
              onClick={() => {
                const at = Date.now();
                setNow(at);
                onPatch({
                  clock: running
                    ? pauseClock(row.clock, at)
                    : {
                        elapsedMs: row.clock?.stopped ? 0 : elapsedClock(row.clock, at),
                        startedAt: at,
                      },
                });
              }}
              className="min-h-11 rounded-full border border-accent px-3 text-sm font-semibold text-accent disabled:opacity-40"
            >
              {running
                ? "Pausa"
                : row.clock?.stopped
                  ? "Riavvia"
                  : milliseconds > 0
                    ? "Riprendi"
                    : "Avvia"}
            </button>
            <button
              type="button"
              disabled={row.completed || row.clock?.stopped || (!running && milliseconds === 0)}
              onClick={() => {
                const seconds = Math.round(elapsedClock(row.clock) / 100) / 10;
                onPatch({
                  clock: { elapsedMs: seconds * 1000, startedAt: null, stopped: true },
                  reps: String(Math.max(0.1, seconds)),
                });
              }}
              className="min-h-11 rounded-full bg-accent px-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
            >
              Stop
            </button>
          </div>
          <p className="mt-2 text-xs text-label-secondary">
            {anotherClockRunning
              ? "Un’altra serie ha il cronometro attivo."
              : "Stop riporta i secondi nel campo. Conferma serie li salva."}
          </p>
        </section>
      )}
    </>
  );
}

function Value({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  step: number;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const change = (dir: number) =>
    onChange(
      String(
        Math.max(
          0,
          Math.round((Number((value || "0").replace(",", ".")) + dir * step) * 100) / 100,
        ),
      ),
    );
  return (
    <label className="workout-value-card min-w-0 rounded-2xl bg-fill-secondary p-3 text-center">
      <span className="workout-value-label text-xs font-semibold uppercase tracking-wide text-label-secondary">
        {label}
      </span>
      <span className="workout-value-control mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => change(-1)}
          disabled={disabled}
          aria-label={`Diminuisci ${label}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <input
          aria-label={label}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="workout-value-input w-full min-w-0 bg-transparent py-2 text-center text-3xl font-semibold tabular-nums text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
        />
        <button
          type="button"
          onClick={() => change(1)}
          disabled={disabled}
          aria-label={`Aumenta ${label}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </span>
    </label>
  );
}
