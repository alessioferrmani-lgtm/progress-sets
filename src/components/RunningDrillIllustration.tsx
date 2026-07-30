import type { RunningDrill, RunningDrillPose } from "@/lib/running-drills";

export function RunningDrillIllustration({
  drill,
  compact = false,
}: {
  drill: Pick<RunningDrill, "name" | "pose">;
  compact?: boolean;
}) {
  const pose = drill.pose;
  const height = compact ? 112 : 164;

  return (
    <div className="overflow-hidden rounded-2xl bg-[#151b2d]" aria-label={`Illustrazione ${drill.name}`}>
      <svg
        viewBox="0 0 320 180"
        width="100%"
        height={height}
        role="img"
        aria-label={`Illustrazione dell’andatura ${drill.name}`}
        className="block"
      >
        <defs>
          <linearGradient id="running-drill-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#1f2e52" />
            <stop offset="1" stopColor="#10213e" />
          </linearGradient>
          <linearGradient id="running-drill-glow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0a84ff" stopOpacity="0.05" />
            <stop offset="0.5" stopColor="#0a84ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff9f0a" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#running-drill-bg)" />
        <path d="M0 145 C70 125 116 157 184 139 C235 125 268 137 320 121 V180 H0Z" fill="url(#running-drill-glow)" />
        <path d="M32 146 H288" stroke="#6f83a8" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 8" />
        <g fill="none" stroke="#f5f7ff" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="160" cy="34" r="13" fill="#ff9f0a" stroke="none" />
          <path d="M160 48 L157 91" strokeWidth="7" />
          <path d={armPath(pose)} stroke="#0a84ff" strokeWidth="6" />
          <path d={legPath(pose, "front")} stroke="#ff9f0a" strokeWidth="7" />
          <path d={legPath(pose, "back")} stroke="#0a84ff" strokeWidth="7" />
          <path d="M151 60 C137 67 133 79 136 90" stroke="#f5f7ff" strokeWidth="5" />
        </g>
        <circle cx="160" cy="96" r="4" fill="#f5f7ff" />
        <text x="18" y="28" fill="#c6d3ee" fontSize="11" fontWeight="600" letterSpacing="1.5">
          PROGRESS SETS · TECNICA
        </text>
      </svg>
    </div>
  );
}

function armPath(pose: RunningDrillPose) {
  switch (pose) {
    case "side":
      return "M156 58 L120 78 M164 58 L200 78";
    case "wall":
      return "M156 58 L126 72 M164 58 L184 82";
    case "start":
      return "M156 58 L126 88 M164 58 L190 90";
    default:
      return "M156 58 L132 84 M164 58 L185 83";
  }
}

function legPath(pose: RunningDrillPose, side: "front" | "back") {
  if (pose === "wall") {
    return side === "front" ? "M157 90 L188 119 L216 143" : "M158 90 L141 120 L119 144";
  }
  if (pose === "start") {
    return side === "front" ? "M157 90 L183 119 L208 143" : "M158 90 L132 114 L103 138";
  }
  if (pose === "side") {
    return side === "front" ? "M157 90 L193 116 L223 114" : "M158 90 L126 119 L98 120";
  }
  if (pose === "straight") {
    return side === "front" ? "M157 90 L181 120 L195 145" : "M158 90 L137 120 L125 145";
  }
  if (pose === "march") {
    return side === "front" ? "M157 90 L188 106 L213 96" : "M158 90 L137 120 L124 145";
  }
  return side === "front" ? "M157 90 L188 112 L210 134" : "M158 90 L135 109 L111 132";
}
