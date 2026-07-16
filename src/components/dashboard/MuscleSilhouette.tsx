import type { MuscleGroup } from "@/lib/muscle-map";

const ACTIVE = "var(--color-accent)";
const IDLE = "var(--color-fill)";
const OUTLINE = "var(--color-label-tertiary)";

function color(group: MuscleGroup, active: Set<MuscleGroup>) {
  return active.has(group) ? ACTIVE : IDLE;
}

type MuscleProps = {
  group: MuscleGroup;
  active: Set<MuscleGroup>;
  d: string;
};

function Muscle({ group, active, d }: MuscleProps) {
  return (
    <path
      d={d}
      fill={color(group, active)}
      stroke="var(--color-background)"
      strokeWidth="1.35"
      strokeLinejoin="round"
      className="transition-colors duration-300"
    />
  );
}

function FigureFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 132 260"
      className="h-[13.5rem] w-auto overflow-visible"
      aria-hidden="true"
    >
      <g fill="none" stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="66" cy="18" rx="13" ry="16" strokeWidth="1.5" />
        <path d="M57 31v8M75 31v8M51 39 37 45 29 69 20 105l5 2 15-36 3 47-8 49 8 3 15-48h16l15 48 8-3-8-49 3-47 15 36 5-2-9-36-8-24-14-6" strokeWidth="1.65" />
        <path d="M58 122 48 169l-2 64 9 1 11-61 11 61 9-1-2-64-10-47" strokeWidth="1.65" />
      </g>
      {children}
    </svg>
  );
}

function FrontFigure({ active }: { active: Set<MuscleGroup> }) {
  return (
    <FigureFrame>
      <Muscle group="shoulders" active={active} d="M51 40q-10 1-16 8l-3 13 11 2 8-13Z" />
      <Muscle group="shoulders" active={active} d="M81 40q10 1 16 8l3 13-11 2-8-13Z" />
      <Muscle group="chest" active={active} d="M52 43q7-4 13-2v24q-10 2-17-4l-3-13Z" />
      <Muscle group="chest" active={active} d="M80 43q-7-4-13-2v24q10 2 17-4l3-13Z" />
      <Muscle group="biceps" active={active} d="m33 62 10 2-2 22-9 17-7-3 7-20Z" />
      <Muscle group="biceps" active={active} d="m99 62-10 2 2 22 9 17 7-3-7-20Z" />
      <Muscle group="forearms" active={active} d="m31 88 9 1-5 28-9 25-7-3 7-32Z" />
      <Muscle group="forearms" active={active} d="m101 88-9 1 5 28 9 25 7-3-7-32Z" />
      <Muscle group="abs" active={active} d="M54 66h11v15H52l1-11Z" />
      <Muscle group="abs" active={active} d="M67 66h11l1 15H67Z" />
      <Muscle group="abs" active={active} d="M52 83h13v15H50Z" />
      <Muscle group="abs" active={active} d="M67 83h13l2 15H67Z" />
      <Muscle group="abs" active={active} d="m50 100 15 1v17H47Z" />
      <Muscle group="abs" active={active} d="m67 101 15-1 3 18H67Z" />
      <Muscle group="quads" active={active} d="m48 123 17 1-2 42-10 26-8-3 3-32Z" />
      <Muscle group="quads" active={active} d="m84 123-17 1 2 42 10 26 8-3-3-32Z" />
      <Muscle group="calves" active={active} d="m48 174 14 2-4 42-10 11-2-3Z" />
      <Muscle group="calves" active={active} d="m84 174-14 2 4 42 10 11 2-3Z" />
    </FigureFrame>
  );
}

function BackFigure({ active }: { active: Set<MuscleGroup> }) {
  return (
    <FigureFrame>
      <Muscle group="shoulders" active={active} d="M51 40q-10 1-16 8l-3 13 11 2 8-13Z" />
      <Muscle group="shoulders" active={active} d="M81 40q10 1 16 8l3 13-11 2-8-13Z" />
      <Muscle group="back" active={active} d="m57 39 8 2v28L47 62l3-18Z" />
      <Muscle group="back" active={active} d="m75 39-8 2v28l18-7-3-18Z" />
      <Muscle group="back" active={active} d="M47 64 65 71v45H48l-5-28Z" />
      <Muscle group="back" active={active} d="m85 64-18 7v45h17l5-28Z" />
      <Muscle group="triceps" active={active} d="m33 62 10 2-2 22-9 17-7-3 7-20Z" />
      <Muscle group="triceps" active={active} d="m99 62-10 2 2 22 9 17 7-3-7-20Z" />
      <Muscle group="forearms" active={active} d="m31 88 9 1-5 28-9 25-7-3 7-32Z" />
      <Muscle group="forearms" active={active} d="m101 88-9 1 5 28 9 25 7-3-7-32Z" />
      <Muscle group="glutes" active={active} d="M48 119h17v27q-12 1-19-12Z" />
      <Muscle group="glutes" active={active} d="M84 119H67v27q12 1 19-12Z" />
      <Muscle group="hamstrings" active={active} d="m48 147 17 1-2 40-10 19-7-5 2-31Z" />
      <Muscle group="hamstrings" active={active} d="m84 147-17 1 2 40 10 19 7-5-2-31Z" />
      <Muscle group="calves" active={active} d="m49 190 13 2-4 31-10 7-2-5Z" />
      <Muscle group="calves" active={active} d="m83 190-13 2 4 31 10 7 2-5Z" />
    </FigureFrame>
  );
}

export function MuscleSilhouette({ active }: { active: Set<MuscleGroup> }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-fill/50 px-2 py-3">
      <div className="pointer-events-none absolute inset-x-12 top-5 h-24 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-end justify-center gap-1 sm:gap-3">
        <div className="flex flex-col items-center">
          <FrontFigure active={active} />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-label-tertiary">
            Fronte
          </span>
        </div>
        <div className="flex flex-col items-center">
          <BackFigure active={active} />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-label-tertiary">
            Retro
          </span>
        </div>
      </div>
    </div>
  );
}
