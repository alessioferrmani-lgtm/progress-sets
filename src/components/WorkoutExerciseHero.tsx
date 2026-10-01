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
  superset?: Array<{name: string; label: string; active: boolean; onSelect: () => void}>;
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
  const seriesProgress = Math.min(
    100,
    Math.max(0, (seriesPosition / Math.max(seriesCount, 1)) * 100),
  );
  const overallProgress = Math.min(
    100,
    Math.max(0, (completedSets / Math.max(totalSets, 1)) * 100),
  );

  return (
    <section
      className="workout-exercise-hero relative overflow-hidden rounded-[28px] border border-separator/80 bg-gradient-to-br from-fill-secondary via-background to-fill p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
      data-testid="workout-exercise-hero"
      aria-label={`Esercizio ${exercisePosition} di ${exerciseCount}: ${exerciseName}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="workout-exercise-hero-top relative flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-label-tertiary">
            {superset ? "Superserie" : "Esercizio"} {exercisePosition} di {exerciseCount}
          </p>
          <h2 className="workout-exercise-hero-title mt-3 text-[2rem] font-bold leading-[1.05] tracking-tight text-label">
            {superset ? "Giro " + seriesPosition + " di " + seriesCount : exerciseName}
          </h2>
          {superset && <div className="mt-3 space-y-2" aria-label="Sottoesercizi della superserie">{superset.map(child => <button key={child.label} type="button" onClick={child.onSelect} aria-pressed={child.active} className={"flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm " + (child.active ? "bg-accent/15 text-accent ring-1 ring-accent" : "bg-fill text-label-secondary")}><span className="font-bold">{child.label}</span><span>{child.name}</span></button>)}<p className="text-xs text-label-secondary">A e B senza pausa. Recupero a fine giro.</p></div>}
          {(objective || alternative) && (
            <details className="mt-2 text-sm text-label-secondary">
              <summary className="cursor-pointer">Indicazioni esercizio</summary>
              {objective && <p className="mt-2 leading-relaxed">{objective}</p>}
              {alternative && <p className="mt-1 leading-relaxed">Alternativa: {alternative}</p>}
            </details>
          )}
          <p className="workout-exercise-hero-series mt-3 text-sm font-medium text-label-secondary">
            Serie <span className="text-accent">{seriesPosition}</span> di {seriesCount}
            {side === "left" ? " · SX" : side === "right" ? " · DX" : ""}
            {rir ? ` · RIR ${rir}` : ""}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Salta esercizio"
            className="workout-exercise-hero-skip mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors active:bg-accent/10"
          >
            <SkipForward className="size-4" />
            Salta esercizio
          </button>
        </div>

        <div
          className="workout-exercise-hero-ring relative flex size-28 shrink-0 items-center justify-center rounded-full p-1"
          style={{
            background: `conic-gradient(var(--accent) ${seriesProgress}%, rgba(255,255,255,0.12) 0)`,
          }}
          aria-label={`${seriesPosition} di ${seriesCount} serie`}
        >
          <div className="flex size-full flex-col items-center justify-center rounded-full bg-background/95">
            <span className="text-4xl font-bold leading-none tabular-nums text-accent">
              {seriesPosition}
            </span>
            <span className="mt-1 text-xs font-medium text-label-secondary">di {seriesCount}</span>
          </div>
        </div>
      </div>

      <div className="workout-exercise-hero-progress relative mt-6">
        <div className="flex items-center justify-between text-xs font-medium text-label-secondary">
          <span>Progresso allenamento</span>
          <span className="tabular-nums">
            {completedSets}/{totalSets} serie
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
