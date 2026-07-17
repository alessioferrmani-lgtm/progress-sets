import type { MuscleGroup } from "@/lib/muscle-map";

type Props = { active: Set<MuscleGroup> };

const LAYERS: MuscleGroup[] = [
  "shoulders",
  "chest",
  "biceps",
  "triceps",
  "forearms",
  "back",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
];

export function MuscleSilhouette({ active }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#20201e] px-2 py-3">
      <div className="relative mx-auto aspect-[418/554] h-[18rem] max-w-full">
        <img
          src="/muscle-map/body-base.png"
          alt="Sagoma anatomica fronte e retro"
          className="absolute inset-0 size-full select-none object-contain"
          draggable={false}
        />

        {LAYERS.map((group) =>
          active.has(group) ? (
            <img
              key={group}
              src={`/muscle-map/${group}.png`}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full select-none object-contain transition-opacity duration-300"
              draggable={false}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
