import type { MuscleGroup } from "@/lib/muscle-map";

const ACTIVE = "#ff5a1f";
const IDLE = "#3a3a37";
const OUTLINE = "#777772";
const SEPARATOR = "#20201e";

type FigureProps = { active: Set<MuscleGroup> };
type MuscleProps = FigureProps & { group: MuscleGroup; d: string };

function Muscle({ group, active, d }: MuscleProps) {
  return (
    <path
      d={d}
      fill={active.has(group) ? ACTIVE : IDLE}
      stroke={SEPARATOR}
      strokeWidth="1.15"
      strokeLinejoin="round"
      className="transition-colors duration-300"
    />
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 150 320" className="h-[18rem] w-auto overflow-visible" aria-hidden="true">
      <g fill={IDLE} stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round">
        <path d="M62 39c1 5 0 9-4 12L46 56c-8 3-13 10-15 19l-8 38-9 39c-1 5 0 9 3 11l4 1 2 7c1 4 4 6 6 4 2-1 1-5 0-8l2 5c2 4 5 4 6 2 1-3-2-7-3-11l10-34 2 24-5 35-3 47-3 59-8 10c-2 3 0 6 4 6h13c4 0 6-2 7-6l8-56 6-40 1-16 1 16 6 40 8 56c1 4 3 6 7 6h13c4 0 6-3 4-6l-8-10-3-59-3-47-5-35 2-24 10 34c-1 4-4 8-3 11 1 2 4 2 6-2l2-5c-1 3-2 7 0 8 2 2 5 0 6-4l2-7 4-1c3-2 4-6 3-11l-9-39-8-38c-2-9-7-16-15-19l-12-5c-4-3-5-7-4-12Z" strokeWidth="1.45" />
        <ellipse cx="75" cy="22" rx="14" ry="19" strokeWidth="1.45" />
      </g>
      {children}
    </svg>
  );
}

function FrontFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M58 51c-8 0-15 3-20 8-4 4-5 10-4 16 6-1 11 1 15 5l7-12c2-4 2-9 2-13Z" />
      <Muscle group="shoulders" active={active} d="M92 51c8 0 15 3 20 8 4 4 5 10 4 16-6-1-11 1-15 5l-7-12c-2-4-2-9-2-13Z" />
      <Muscle group="chest" active={active} d="M59 53c5-4 10-5 15-4v27c-9 2-18 0-22-6-3-4-2-10 1-14Z" />
      <Muscle group="chest" active={active} d="M91 53c-5-4-10-5-15-4v27c9 2 18 0 22-6 3-4 2-10-1-14Z" />
      <Muscle group="biceps" active={active} d="M36 77c5-1 9 1 12 5 1 8 0 17-3 24l-9 20c-4-1-7-4-7-8l5-28Z" />
      <Muscle group="biceps" active={active} d="M114 77c-5-1-9 1-12 5-1 8 0 17 3 24l9 20c4-1 7-4 7-8l-5-28Z" />
      <Muscle group="forearms" active={active} d="M32 108c4 1 8 3 11 6-1 10-4 20-7 28l-9 22c-3 1-6-1-6-4l7-31Z" />
      <Muscle group="forearms" active={active} d="M118 108c-4 1-8 3-11 6 1 10 4 20 7 28l9 22c3 1 6-1 6-4l-7-31Z" />
      <Muscle group="abs" active={active} d="M57 78c5 2 11 3 17 2v17H55l1-12Z" />
      <Muscle group="abs" active={active} d="M93 78c-5 2-11 3-17 2v17h19l-1-12Z" />
      <Muscle group="abs" active={active} d="M55 99h19v18H53Z" />
      <Muscle group="abs" active={active} d="M76 99h19l2 18H76Z" />
      <Muscle group="abs" active={active} d="m53 119 21 1v21H51Z" />
      <Muscle group="abs" active={active} d="m76 120 21-1 2 22H76Z" />
      <Muscle group="abs" active={active} d="M48 82c5 2 7 5 7 12l-4 47-9-13 4-39Z" />
      <Muscle group="abs" active={active} d="M102 82c-5 2-7 5-7 12l4 47 9-13-4-39Z" />
      <Muscle group="quads" active={active} d="M50 146c5-3 10-3 14 1l-2 55-8 31c-6-5-8-17-7-34l2-37Z" />
      <Muscle group="quads" active={active} d="M66 146c3-2 6-1 8 1l-4 47-7 28-4-3 4-37Z" />
      <Muscle group="quads" active={active} d="M100 146c-5-3-10-3-14 1l2 55 8 31c6-5 8-17 7-34l-2-37Z" />
      <Muscle group="quads" active={active} d="M84 146c-3-2-6-1-8 1l4 47 7 28 4-3-4-37Z" />
      <Muscle group="hamstrings" active={active} d="M43 153c2-4 4-6 7-7l-3 51-5 31-8-4 6-43Z" />
      <Muscle group="hamstrings" active={active} d="M107 153c-2-4-4-6-7-7l3 51 5 31 8-4-6-43Z" />
      <Muscle group="calves" active={active} d="M47 235c5 3 10 4 15 2l-2 43-9 31-8-2 4-35Z" />
      <Muscle group="calves" active={active} d="M67 238c2 10 1 27-5 45l-3 10 1-39 2-17Z" />
      <Muscle group="calves" active={active} d="M103 235c-5 3-10 4-15 2l2 43 9 31 8-2-4-35Z" />
      <Muscle group="calves" active={active} d="M83 238c-2 10-1 27 5 45l3 10-1-39-2-17Z" />
    </Figure>
  );
}

function BackFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M58 51c-8 0-15 3-20 8-4 4-5 10-4 16 6-1 11 1 15 5l7-12c2-4 2-9 2-13Z" />
      <Muscle group="shoulders" active={active} d="M92 51c8 0 15 3 20 8 4 4 5 10 4 16-6-1-11 1-15 5l-7-12c-2-4-2-9-2-13Z" />
      <Muscle group="back" active={active} d="M61 51c4-2 8-3 13-2v29L49 68l4-11Z" />
      <Muscle group="back" active={active} d="M89 51c-4-2-8-3-13-2v29l25-10-4-11Z" />
      <Muscle group="back" active={active} d="M49 70c8 5 16 8 25 10v62H57c-5-11-7-25-7-40l-4-20Z" />
      <Muscle group="back" active={active} d="M101 70c-8 5-16 8-25 10v62h17c5-11 7-25 7-40l4-20Z" />
      <Muscle group="triceps" active={active} d="M36 77c5-1 9 1 12 5 1 8 0 17-3 24l-9 20c-4-1-7-4-7-8l5-28Z" />
      <Muscle group="triceps" active={active} d="M114 77c-5-1-9 1-12 5-1 8 0 17 3 24l9 20c4-1 7-4 7-8l-5-28Z" />
      <Muscle group="forearms" active={active} d="M32 108c4 1 8 3 11 6-1 10-4 20-7 28l-9 22c-3 1-6-1-6-4l7-31Z" />
      <Muscle group="forearms" active={active} d="M118 108c-4 1-8 3-11 6 1 10 4 20 7 28l9 22c3 1 6-1 6-4l-7-31Z" />
      <Muscle group="glutes" active={active} d="M53 145c7-3 14-2 21 1v30c-6 4-14 4-20 0-6-4-8-12-5-21Z" />
      <Muscle group="glutes" active={active} d="M97 145c-7-3-14-2-21 1v30c6 4 14 4 20 0 6-4 8-12 5-21Z" />
      <Muscle group="hamstrings" active={active} d="M51 181c7 2 13 3 19 1l-3 48-10 30c-7-5-10-16-9-32l1-31Z" />
      <Muscle group="hamstrings" active={active} d="M72 182c2 11 1 28-4 48l-7 20-3-3 6-39 2-26Z" />
      <Muscle group="hamstrings" active={active} d="M99 181c-7 2-13 3-19 1l3 48 10 30c7-5 10-16 9-32l-1-31Z" />
      <Muscle group="hamstrings" active={active} d="M78 182c-2 11-1 28 4 48l7 20 3-3-6-39-2-26Z" />
      <Muscle group="calves" active={active} d="M48 234c5 4 10 5 15 3l-3 44-9 30-8-2 4-35Z" />
      <Muscle group="calves" active={active} d="M67 238c2 11 1 27-5 46l-3 9 1-39 2-17Z" />
      <Muscle group="calves" active={active} d="M102 234c-5 4-10 5-15 3l3 44 9 30 8-2-4-35Z" />
      <Muscle group="calves" active={active} d="M83 238c-2 11-1 27 5 46l3 9-1-39-2-17Z" />
    </Figure>
  );
}

export function MuscleSilhouette({ active }: FigureProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#20201e] px-1 py-4">
      <div className="relative flex items-center justify-center gap-0 sm:gap-3">
        <FrontFigure active={active} />
        <BackFigure active={active} />
      </div>
    </div>
  );
}
