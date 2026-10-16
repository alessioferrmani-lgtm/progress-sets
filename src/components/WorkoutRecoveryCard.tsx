import { Bell } from "lucide-react";
import { useState } from "react";
import { useRestTimer } from "@/lib/rest-timer-store";
export function WorkoutRecoveryCard() {
  const [permission, setPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const { running, endsAt, now, addSeconds, skip } = useRestTimer();
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <section
      className="workout-recovery-card rounded-2xl bg-fill-secondary p-3"
      aria-label="Timer recupero"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-label-secondary">Recupero</p>
          <output className="text-2xl font-bold tabular-nums text-warning">
            {running && remaining > 0
              ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
              : "--:--"}
          </output>
        </div>
        <div className="flex gap-1">
          <button
            disabled={!running}
            onClick={() => addSeconds(-15)}
            aria-label="Diminuisci recupero di 15 secondi"
            className="min-h-11 rounded-xl bg-fill px-3 text-sm disabled:opacity-40"
          >
            −15 s
          </button>
          <button
            disabled={!running}
            onClick={() => addSeconds(15)}
            aria-label="Aumenta recupero di 15 secondi"
            className="min-h-11 rounded-xl bg-fill px-3 text-sm disabled:opacity-40"
          >
            +15 s
          </button>
          <button
            disabled={!running}
            onClick={skip}
            className="min-h-11 rounded-xl bg-fill px-3 text-sm text-accent disabled:opacity-40"
          >
            Salta
          </button>
          {permission === "default" && (
            <button
              onClick={async () => setPermission(await Notification.requestPermission())}
              aria-label="Attiva notifica fine recupero"
              className="min-h-11 px-2 text-accent"
            >
              <Bell className="size-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
