import type { MuscleGroup } from "@/lib/muscle-map";

const ACTIVE = "#ff5a1f";
const IDLE = "#3a3a37";
const OUTLINE = "#858581";
const DIVIDER = "#20201e";

type FigureProps = { active: Set<MuscleGroup> };
type MuscleProps = FigureProps & { group: MuscleGroup; d: string };

function Muscle({ group, active, d }: MuscleProps) {
  return (
    <path
      d={d}
      fill={active.has(group) ? ACTIVE : IDLE}
      stroke={DIVIDER}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-colors duration-300"
    />
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 124 276" className="h-[18rem] min-w-0 flex-1" aria-hidden="true">
      <g fill={IDLE} stroke={OUTLINE} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="62" cy="20" rx="12.5" ry="17.5" />
        <path d="M54 35c1 5-1 8-5 10-9 3-15 8-18 16-3 11-5 24-7 36l-9 42c-1 5 0 9 3 11l3 1 1 7c1 4 4 6 6 4 1-2 0-5-1-8 2 5 5 7 7 4 1-2-1-6-3-10l8-31 3-17 1 33-5 37-2 38-3 42-8 10c-2 3 0 5 4 5h12c4 0 6-2 6-5l6-40 7-40 2-17 1 17 7 40 6 40c0 3 2 5 6 5h12c4 0 6-2 4-5l-8-10-3-42-2-38-5-37 1-33 3 17 8 31c-2 4-4 8-3 10 2 3 5 1 7-4-1 3-2 6-1 8 2 2 5 0 6-4l1-7 3-1c3-2 4-6 3-11l-9-42c-2-12-4-25-7-36-3-8-9-13-18-16-4-2-6-5-5-10" />
      </g>
      {children}
    </svg>
  );
}

function FrontFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M48 46c-8 1-14 4-18 10-3 5-3 11-1 16 5-3 10-2 14 2l5-12c2-5 2-10 0-16Z" />
      <Muscle group="shoulders" active={active} d="M76 46c8 1 14 4 18 10 3 5 3 11 1 16-5-3-10-2-14 2l-5-12c-2-5-2-10 0-16Z" />

      <Muscle group="chest" active={active} d="M50 46c4-3 8-4 11-3v26c-5 3-12 3-17 0-4-3-5-9-3-14 2-5 5-7 9-9Z" />
      <Muscle group="chest" active={active} d="M74 46c-4-3-8-4-11-3v26c5 3 12 3 17 0 4-3 5-9 3-14-2-5-5-7-9-9Z" />

      <Muscle group="biceps" active={active} d="M31 74c5-2 9 0 11 4 1 8-1 18-5 26-2 4-5 6-8 4-2-2-2-6-1-10l3-18c1-5 2-8 5-10Z" />
      <Muscle group="biceps" active={active} d="M93 74c-5-2-9 0-11 4-1 8 1 18 5 26 2 4 5 6 8 4 2-2 2-6 1-10l-3-18c-1-5-2-8-5-10Z" />
      <Muscle group="forearms" active={active} d="M27 108c4 1 7 4 8 8-2 10-5 20-9 29-2 4-5 5-8 3-2-2-1-6 0-10l7-27Z" />
      <Muscle group="forearms" active={active} d="M97 108c-4 1-7 4-8 8 2 10 5 20 9 29 2 4 5 5 8 3 2-2 1-6 0-10l-7-27Z" />

      <Muscle group="abs" active={active} d="M46 72c4 1 9 2 15 1v15H45c-2-6-1-11 1-16Z" />
      <Muscle group="abs" active={active} d="M78 72c-4 1-9 2-15 1v15h16c2-6 1-11-1-16Z" />
      <Muscle group="abs" active={active} d="M45 90h16v16H44c-1-6-1-11 1-16Z" />
      <Muscle group="abs" active={active} d="M79 90H63v16h17c1-6 1-11-1-16Z" />
      <Muscle group="abs" active={active} d="M44 108h17v19c-6 2-12 1-17-2-2-6-2-12 0-17Z" />
      <Muscle group="abs" active={active} d="M80 108H63v19c6 2 12 1 17-2 2-6 2-12 0-17Z" />
      <Muscle group="abs" active={active} d="M41 75c4 4 5 10 4 17l-3 34-7-14 3-26c0-5 1-9 3-11Z" />
      <Muscle group="abs" active={active} d="M83 75c-4 4-5 10-4 17l3 34 7-14-3-26c0-5-1-9-3-11Z" />

      <Muscle group="quads" active={active} d="M43 132c5-4 11-4 16-1l-1 33c-1 15-4 28-9 39-6-8-8-19-7-33l-1-23c0-7 0-11 2-15Z" />
      <Muscle group="quads" active={active} d="M60 132c2-2 4-2 6 0l5 35c1 12-1 23-5 33l-5-10-2-27Z" />
      <Muscle group="quads" active={active} d="M81 132c-5-4-11-4-16-1l1 33c1 15 4 28 9 39 6-8 8-19 7-33l1-23c0-7 0-11-2-15Z" />
      <Muscle group="quads" active={active} d="M64 132c-2-2-4-2-6 0l-5 35c-1 12 1 23 5 33l5-10 2-27Z" />

      <Muscle group="calves" active={active} d="M42 207c4-5 10-6 15-2 2 10 0 23-4 35l-7 20-6-2 2-26Z" />
      <Muscle group="calves" active={active} d="M82 207c-4-5-10-6-15-2-2 10 0 23 4 35l7 20 6-2-2-26Z" />
    </Figure>
  );
}

function BackFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M48 46c-8 1-14 4-18 10-3 5-3 11-1 16 5-3 10-2 14 2l5-12c2-5 2-10 0-16Z" />
      <Muscle group="shoulders" active={active} d="M76 46c8 1 14 4 18 10 3 5 3 11 1 16-5-3-10-2-14 2l-5-12c-2-5-2-10 0-16Z" />

      <Muscle group="back" active={active} d="M51 45c4-2 7-3 10-2v27c-7-1-13-4-18-9 0-7 3-13 8-16Z" />
      <Muscle group="back" active={active} d="M73 45c-4-2-7-3-10-2v27c7-1 13-4 18-9 0-7-3-13-8-16Z" />
      <Muscle group="back" active={active} d="M42 63c5 5 11 8 19 10v54c-6 2-12 1-17-2-4-10-6-20-5-31l-2-16c0-6 2-11 5-15Z" />
      <Muscle group="back" active={active} d="M82 63c-5 5-11 8-19 10v54c6 2 12 1 17-2 4-10 6-20 5-31l2-16c0-6-2-11-5-15Z" />
      <Muscle group="back" active={active} d="M56 125c4 2 8 2 12 0l2 10-8 8-8-8Z" />

      <Muscle group="triceps" active={active} d="M31 74c5-2 9 0 11 4 1 8-1 18-5 26-2 4-5 6-8 4-2-2-2-6-1-10l3-18c1-5 2-8 5-10Z" />
      <Muscle group="triceps" active={active} d="M93 74c-5-2-9 0-11 4-1 8 1 18 5 26 2 4 5 6 8 4 2-2 2-6 1-10l-3-18c-1-5-2-8-5-10Z" />
      <Muscle group="forearms" active={active} d="M27 108c4 1 7 4 8 8-2 10-5 20-9 29-2 4-5 5-8 3-2-2-1-6 0-10l7-27Z" />
      <Muscle group="forearms" active={active} d="M97 108c-4 1-7 4-8 8 2 10 5 20 9 29 2 4 5 5 8 3 2-2 1-6 0-10l-7-27Z" />

      <Muscle group="glutes" active={active} d="M43 132c6-3 12-3 18 0v27c-5 6-13 7-19 3-6-4-7-13-4-21 1-4 2-7 5-9Z" />
      <Muscle group="glutes" active={active} d="M81 132c-6-3-12-3-18 0v27c5 6 13 7 19 3 6-4 7-13 4-21-1-4-2-7-5-9Z" />

      <Muscle group="hamstrings" active={active} d="M43 166c5 2 11 2 16 0l-1 26c-1 14-4 27-9 37-6-7-8-18-7-31l-1-19c0-6 0-10 2-13Z" />
      <Muscle group="hamstrings" active={active} d="M81 166c-5 2-11 2-16 0l1 26c1 14 4 27 9 37 6-7 8-18 7-31l1-19c0-6 0-10-2-13Z" />
      <Muscle group="calves" active={active} d="M42 207c4-5 10-6 15-2 2 10 0 23-4 35l-7 20-6-2 2-26Z" />
      <Muscle group="calves" active={active} d="M82 207c-4-5-10-6-15-2-2 10 0 23 4 35l7 20 6-2-2-26Z" />
    </Figure>
  );
}

export function MuscleSilhouette({ active }: FigureProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#20201e] px-3 py-3">
      <div className="mx-auto flex max-w-[25rem] items-center justify-center gap-2 sm:gap-5">
        <FrontFigure active={active} />
        <BackFigure active={active} />
      </div>
    </div>
  );
}
