import { runningDrillImageFile, type RunningDrill } from "@/lib/running-drills";

export function RunningDrillIllustration({
  drill,
  compact = false,
}: {
  drill: Pick<RunningDrill, "id" | "name">;
  compact?: boolean;
}) {
  const height = compact ? 152 : 360;

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      aria-label={`Illustrazione ${drill.name}`}
      data-testid={`running-drill-image-${drill.id}`}
    >
      <img
        src={`/running-drills/${runningDrillImageFile(drill.id)}?v=20260804-3`}
        alt={`Illustrazione anatomica dell’andatura ${drill.name}`}
        width="1024"
        height="1536"
        loading="lazy"
        decoding="async"
        className="block w-full object-contain object-center"
        style={{ height }}
      />
    </div>
  );
}
