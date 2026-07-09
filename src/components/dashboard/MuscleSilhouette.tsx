import type { MuscleGroup } from "@/lib/muscle-map";

const ACTIVE = "var(--color-accent)";
const IDLE = "var(--color-fill)";

function color(g: MuscleGroup, active: Set<MuscleGroup>) {
  return active.has(g) ? ACTIVE : IDLE;
}

export function MuscleSilhouette({ active }: { active: Set<MuscleGroup> }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* FRONT */}
      <svg viewBox="0 0 120 220" className="h-44">
        {/* head */}
        <circle cx="60" cy="18" r="12" fill="var(--color-fill)" />
        {/* neck */}
        <rect x="55" y="28" width="10" height="8" fill="var(--color-fill)" />
        {/* shoulders */}
        <ellipse cx="38" cy="42" rx="12" ry="7" fill={color("shoulders", active)} />
        <ellipse cx="82" cy="42" rx="12" ry="7" fill={color("shoulders", active)} />
        {/* chest */}
        <path d="M35 44 Q60 40 85 44 L85 68 Q60 74 35 68 Z" fill={color("chest", active)} />
        {/* abs */}
        <rect x="48" y="70" width="24" height="34" rx="4" fill={color("abs", active)} />
        {/* biceps */}
        <ellipse cx="28" cy="60" rx="7" ry="14" fill={color("biceps", active)} />
        <ellipse cx="92" cy="60" rx="7" ry="14" fill={color("biceps", active)} />
        {/* forearms */}
        <ellipse cx="24" cy="88" rx="6" ry="14" fill={color("forearms", active)} />
        <ellipse cx="96" cy="88" rx="6" ry="14" fill={color("forearms", active)} />
        {/* quads */}
        <ellipse cx="48" cy="130" rx="10" ry="22" fill={color("quads", active)} />
        <ellipse cx="72" cy="130" rx="10" ry="22" fill={color("quads", active)} />
        {/* calves front (tibialis) */}
        <ellipse cx="48" cy="180" rx="7" ry="18" fill={color("calves", active)} />
        <ellipse cx="72" cy="180" rx="7" ry="18" fill={color("calves", active)} />
      </svg>
      {/* BACK */}
      <svg viewBox="0 0 120 220" className="h-44">
        {/* head */}
        <circle cx="60" cy="18" r="12" fill="var(--color-fill)" />
        <rect x="55" y="28" width="10" height="8" fill="var(--color-fill)" />
        {/* traps + back */}
        <path d="M40 40 Q60 36 80 40 L88 70 Q60 78 32 70 Z" fill={color("back", active)} />
        {/* lats */}
        <path d="M32 68 L88 68 L82 100 Q60 108 38 100 Z" fill={color("back", active)} />
        {/* triceps */}
        <ellipse cx="28" cy="62" rx="7" ry="14" fill={color("triceps", active)} />
        <ellipse cx="92" cy="62" rx="7" ry="14" fill={color("triceps", active)} />
        {/* forearms */}
        <ellipse cx="24" cy="90" rx="6" ry="14" fill={color("forearms", active)} />
        <ellipse cx="96" cy="90" rx="6" ry="14" fill={color("forearms", active)} />
        {/* glutes */}
        <ellipse cx="50" cy="115" rx="12" ry="10" fill={color("glutes", active)} />
        <ellipse cx="70" cy="115" rx="12" ry="10" fill={color("glutes", active)} />
        {/* hamstrings */}
        <ellipse cx="48" cy="145" rx="10" ry="20" fill={color("hamstrings", active)} />
        <ellipse cx="72" cy="145" rx="10" ry="20" fill={color("hamstrings", active)} />
        {/* calves */}
        <ellipse cx="48" cy="185" rx="8" ry="18" fill={color("calves", active)} />
        <ellipse cx="72" cy="185" rx="8" ry="18" fill={color("calves", active)} />
      </svg>
    </div>
  );
}
