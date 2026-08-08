import { Bell, Clock3, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useRestTimer } from "@/lib/rest-timer-store";

export function WorkoutRecoveryCard() {
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  const { running, endsAt, duration, exerciseName, now, addSeconds, skip } = useRestTimer();

  if (!running) return null;

  const remainingMs = Math.max(0, endsAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainingMs / (duration * 1000)) * 100));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    setNotificationPermission(await Notification.requestPermission());
  };

  return (
    <section
      className="workout-recovery-card ios-card mt-4 overflow-hidden"
      aria-label="Timer recupero"
    >
      <div className="relative h-1 bg-fill-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Clock3 className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-label-tertiary">
            Recupero
          </div>
          <div className="font-mono text-3xl font-semibold tabular-nums leading-tight text-warning">
            {minutes}:{seconds}
          </div>
          <div className="truncate text-xs text-label-secondary">
            {exerciseName ?? "Prossima serie"}
          </div>
        </div>
        <button
          type="button"
          onClick={skip}
          className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent active:scale-[0.97]"
        >
          Pausa
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => addSeconds(-15)}
          className="flex min-h-11 items-center justify-center gap-1 rounded-full border border-accent bg-fill px-3 text-sm font-semibold text-accent active:scale-[0.97]"
          aria-label="Diminuisci recupero di 15 secondi"
        >
          <Minus className="size-4" /> −15 s
        </button>
        <button
          type="button"
          onClick={() => addSeconds(15)}
          className="flex min-h-11 items-center justify-center gap-1 rounded-full border border-accent bg-fill px-3 text-sm font-semibold text-accent active:scale-[0.97]"
          aria-label="Aumenta recupero di 15 secondi"
        >
          <Plus className="size-4" /> +15 s
        </button>
      </div>
      {notificationPermission === "default" && (
        <button
          type="button"
          onClick={enableNotifications}
          className="flex w-full items-center justify-center gap-2 border-t border-separator py-2 text-xs font-semibold text-accent active:bg-fill-secondary"
        >
          <Bell className="size-3.5" /> Attiva notifica fine recupero
        </button>
      )}
    </section>
  );
}
