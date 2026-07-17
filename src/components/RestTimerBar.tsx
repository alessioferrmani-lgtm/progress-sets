import { useRestTimer } from "@/lib/rest-timer-store";
import { Plus, Minus, X } from "lucide-react";

export function RestTimerBar() {
  const { running, endsAt, duration, now, addSeconds, skip } = useRestTimer();
  if (!running) return null;
  const remainingMs = Math.max(0, endsAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainingMs / (duration * 1000)) * 100));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-50 px-3">
      <div className="ios-blur mx-auto max-w-md overflow-hidden rounded-2xl shadow-lg">
        <div className="relative h-1 bg-fill-secondary">
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-label-tertiary">
              Recupero
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums leading-tight text-label">
              {mm}:{ss}
            </div>
          </div>
          <button
            type="button"
            onClick={() => addSeconds(-15)}
            className="flex h-10 min-w-[88px] items-center justify-center gap-1 rounded-full bg-fill px-3 text-sm font-semibold text-label active:scale-[0.97]"
            aria-label="Diminuisci recupero di 15 secondi"
          >
            <Minus className="h-4 w-4" />
            15 sec
          </button>
          <button
            type="button"
            onClick={() => addSeconds(15)}
            className="flex h-10 min-w-[88px] items-center justify-center gap-1 rounded-full bg-fill px-3 text-sm font-semibold text-label active:scale-[0.97]"
            aria-label="Aumenta recupero di 15 secondi"
          >
            <Plus className="h-4 w-4" />
            15 sec
          </button>
          <button
            type="button"
            onClick={skip}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground active:scale-[0.97]"
            aria-label="Salta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
