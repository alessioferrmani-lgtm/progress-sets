import type { MuscleGroup } from "@/lib/muscle-map";

const ACTIVE = "var(--color-accent)";
const IDLE = "var(--color-fill)";
const OUTLINE = "var(--color-label-tertiary)";

type FigureProps = { active: Set<MuscleGroup> };
type MuscleProps = FigureProps & { group: MuscleGroup; d: string };

function Muscle({ group, active, d }: MuscleProps) {
  return (
    <path
      d={d}
      fill={active.has(group) ? ACTIVE : IDLE}
      stroke="var(--color-background)"
      strokeWidth="1.1"
      strokeLinejoin="round"
      className="transition-colors duration-300"
    />
  );
}

function Figure({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 300" className="h-[15.5rem] w-auto overflow-visible" aria-hidden="true">
      <g fill="none" stroke={OUTLINE} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="60" cy="20" rx="12.5" ry="17" strokeWidth="1.35" />
        <path d="M52 34c0 5-1 8-5 11M68 34c0 5 1 8 5 11" strokeWidth="1.2" />
        <path
          d="M47 43C38 45 31 49 28 57c-4 13-6 27-9 40l-8 37c-1 5 1 8 4 9 3 0 4-3 5-7l10-34 4-15c0 13 1 25 0 35-1 14-5 28-7 42-1 6 1 10 4 11 4 1 6-3 7-8l8-36 2 39-3 55-2 57c0 6 2 10 6 10 4 0 6-3 7-9l4-51 1-30 2 30 4 51c1 6 3 9 7 9 4 0 6-4 6-10l-2-57-3-55 2-39 8 36c1 5 3 9 7 8 3-1 5-5 4-11-2-14-6-28-7-42-1-10 0-22 0-35l4 15 10 34c1 4 2 7 5 7 3-1 5-4 4-9l-8-37c-3-13-5-27-9-40-3-8-10-12-19-14"
          strokeWidth="1.55"
        />
        <path d="M34 87c5 16 10 30 12 44M86 87c-5 16-10 30-12 44M48 170h24" strokeWidth="0.9" opacity=".7" />
        <path d="M48 246c4 4 7 5 11 5M72 251c4 0 7-1 11-5" strokeWidth="0.9" opacity=".7" />
      </g>
      {children}
    </svg>
  );
}

function FrontFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M47 43c-8 1-14 5-18 11l-2 10c5 1 10 2 14 5l5-13Z" />
      <Muscle group="shoulders" active={active} d="M73 43c8 1 14 5 18 11l2 10c-5 1-10 2-14 5l-5-13Z" />
      <Muscle group="chest" active={active} d="M47 48c4-4 8-5 12-4v26c-9 1-15-2-18-8l2-12Z" />
      <Muscle group="chest" active={active} d="M73 48c-4-4-8-5-12-4v26c9 1 15-2 18-8l-2-12Z" />
      <Muscle group="biceps" active={active} d="M28 65c4 0 8 2 12 5l-2 20-9 20-6-3 4-24Z" />
      <Muscle group="biceps" active={active} d="M92 65c-4 0-8 2-12 5l2 20 9 20 6-3-4-24Z" />
      <Muscle group="forearms" active={active} d="M28 91l9 2-6 27-11 20-5-3 7-30Z" />
      <Muscle group="forearms" active={active} d="M92 91l-9 2 6 27 11 20 5-3-7-30Z" />
      <Muscle group="abs" active={active} d="M47 70h12v16H45l1-10Z" />
      <Muscle group="abs" active={active} d="M61 70h12l2 16H61Z" />
      <Muscle group="abs" active={active} d="M45 88h14v17H43Z" />
      <Muscle group="abs" active={active} d="M61 88h14l2 17H61Z" />
      <Muscle group="abs" active={active} d="m43 107 16 1v20H40Z" />
      <Muscle group="abs" active={active} d="m61 108 16-1 3 21H61Z" />
      <Muscle group="quads" active={active} d="M47 132h12l-1 41-10 34-8-4 5-40Z" />
      <Muscle group="quads" active={active} d="M73 132H61l1 41 10 34 8-4-5-40Z" />
      <Muscle group="hamstrings" active={active} d="M42 134h5l-4 68-8-4 5-37Z" />
      <Muscle group="hamstrings" active={active} d="M78 134h-5l4 68 8-4-5-37Z" />
      <Muscle group="calves" active={active} d="M47 210c4 2 7 3 11 2l-3 42-8 25-5-2 4-31Z" />
      <Muscle group="calves" active={active} d="M73 210c-4 2-7 3-11 2l3 42 8 25 5-2-4-31Z" />
    </Figure>
  );
}

function BackFigure({ active }: FigureProps) {
  return (
    <Figure>
      <Muscle group="shoulders" active={active} d="M47 43c-8 1-14 5-18 11l-2 10c5 1 10 2 14 5l5-13Z" />
      <Muscle group="shoulders" active={active} d="M73 43c8 1 14 5 18 11l2 10c-5 1-10 2-14 5l-5-13Z" />
      <Muscle group="back" active={active} d="M49 45c3-2 6-2 10-1v25L41 62l3-12Z" />
      <Muscle group="back" active={active} d="M71 45c-3-2-6-2-10-1v25l18-7-3-12Z" />
      <Muscle group="back" active={active} d="M41 64c6 4 12 7 18 8v57H43l-5-33Z" />
      <Muscle group="back" active={active} d="M79 64c-6 4-12 7-18 8v57h16l5-33Z" />
      <Muscle group="triceps" active={active} d="M28 65c4 0 8 2 12 5l-2 20-9 20-6-3 4-24Z" />
      <Muscle group="triceps" active={active} d="M92 65c-4 0-8 2-12 5l2 20 9 20 6-3-4-24Z" />
      <Muscle group="forearms" active={active} d="M28 91l9 2-6 27-11 20-5-3 7-30Z" />
      <Muscle group="forearms" active={active} d="M92 91l-9 2 6 27 11 20 5-3-7-30Z" />
      <Muscle group="glutes" active={active} d="M43 132h16v28c-10 2-17-4-18-14Z" />
      <Muscle group="glutes" active={active} d="M77 132H61v28c10 2 17-4 18-14Z" />
      <Muscle group="hamstrings" active={active} d="M43 161c5 2 10 3 16 2l-1 39-9 28-9-5 4-39Z" />
      <Muscle group="hamstrings" active={active} d="M77 161c-5 2-10 3-16 2l1 39 9 28 9-5-4-39Z" />
      <Muscle group="calves" active={active} d="M47 211c4 2 7 3 11 1l-3 43-8 24-5-2 4-31Z" />
      <Muscle group="calves" active={active} d="M73 211c-4 2-7 3-11 1l3 43 8 24 5-2-4-31Z" />
    </Figure>
  );
}

export function MuscleSilhouette({ active }: FigureProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-fill/50 px-2 pb-3 pt-4">
      <div className="pointer-events-none absolute inset-x-10 top-8 h-28 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex items-end justify-center gap-3 sm:gap-7">
        <div className="flex flex-col items-center">
          <FrontFigure active={active} />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-label-tertiary">Fronte</span>
        </div>
        <div className="flex flex-col items-center">
          <BackFigure active={active} />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-label-tertiary">Retro</span>
        </div>
      </div>
    </div>
  );
}
