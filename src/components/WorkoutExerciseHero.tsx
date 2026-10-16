import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { SkipForward } from "lucide-react";

type WorkoutExerciseHeroProps = {
  exerciseName: string;
  exercisePosition: number;
  exerciseCount: number;
  seriesPosition: number;
  seriesCount: number;
  completedSets: number;
  totalSets: number;
  objective?: string | null;
  rir?: string | null;
  alternative?: string | null;
  side?: "both" | "left" | "right";
  superset?: Array<{ name: string; label: string; active: boolean; onSelect: () => void }>;
  onSkip: () => void;
};

/**
 * The shared hero for guided and free workouts. It keeps the exercise context,
 * local series progress and the skip action in the same visual hierarchy.
 */
export function WorkoutExerciseHero({
  exerciseName,
  exercisePosition,
  exerciseCount,
  seriesPosition,
  seriesCount,
  completedSets,
  totalSets,
  objective,
  rir,
  alternative,
  side,
  superset,
  onSkip,
}: WorkoutExerciseHeroProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <section
      data-testid="workout-exercise-hero"
      className="workout-exercise-hero rounded-2xl border border-separator bg-fill-secondary p-3"
      aria-label={`Esercizio ${exercisePosition} di ${exerciseCount}: ${exerciseName}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-label-secondary">
        <span>
          Esercizio {exercisePosition}/{exerciseCount} · Serie {seriesPosition}/{seriesCount}
          {side === "left" ? " · SX" : side === "right" ? " · DX" : ""}
          {rir ? ` · RIR ${rir}` : ""}
        </span>
        <button
          onClick={onSkip}
          aria-label="Salta esercizio"
          className="flex min-h-11 items-center gap-1 px-2 text-accent"
        >
          <SkipForward className="size-4" />
          Salta
        </button>
        {(objective || alternative || superset) && (
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="Indicazioni esercizio"
            className="min-h-11 px-2 text-accent"
          >
            Info
          </button>
        )}
      </div>
      <h2 className="text-xl font-bold leading-tight text-label">{exerciseName}</h2>
      {superset && (
        <div className="mt-2 flex gap-2">
          {superset.map((child) => (
            <button
              key={child.label}
              onClick={child.onSelect}
              aria-label={child.name}
              aria-pressed={child.active}
              className={
                "min-h-11 flex-1 rounded-xl px-3 text-sm " +
                (child.active ? "bg-accent text-accent-foreground" : "bg-fill text-label-secondary")
              }
            >
              {child.label}
              {child.active ? " · Attivo" : ""}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 h-1 rounded-full bg-fill">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, (completedSets / Math.max(1, totalSets)) * 100)}%` }}
        />
      </div>
      <BottomSheet open={infoOpen} onClose={() => setInfoOpen(false)} title={exerciseName}>
        <div className="space-y-3 text-label">
          {objective && <p>{objective}</p>}
          {alternative && <p>Alternativa: {alternative}</p>}
          {superset && (
            <>
              <p>A e B senza pausa. Recupero a fine giro.</p>
              {superset.map((c) => (
                <p key={c.label}>
                  {c.label}: {c.name}
                </p>
              ))}
            </>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
