import { useState } from "react";
import { STANDARD_DISTANCES } from "@/lib/standard-distances";

/**
 * Distance picker used everywhere the user must choose a distance.
 * Shows the standard list as selectable chips and adds an
 * "Altra distanza" option that reveals a numeric field for
 * non-standard values (cross, unusual race distances, …).
 */
export function DistancePicker({
  value,
  onChange,
  allowCustom = true,
}: {
  value: number | null;
  onChange: (m: number | null) => void;
  allowCustom?: boolean;
}) {
  const isStd =
    value != null && (STANDARD_DISTANCES as readonly number[]).includes(value);
  const [customMode, setCustomMode] = useState(
    allowCustom && value != null && !isStd,
  );
  const [customStr, setCustomStr] = useState(
    value != null && !isStd ? String(value) : "",
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {STANDARD_DISTANCES.map((d) => {
          const active = !customMode && value === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setCustomMode(false);
                onChange(d);
              }}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums active:scale-[0.97] " +
                (active
                  ? "bg-accent text-accent-foreground"
                  : "bg-fill text-label")
              }
            >
              {d < 1000 ? `${d}m` : `${d / 1000}km`}
            </button>
          );
        })}
        {allowCustom && (
          <button
            type="button"
            onClick={() => {
              setCustomMode(true);
              const n = Number(customStr);
              onChange(Number.isFinite(n) && n > 0 ? n : null);
            }}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold active:scale-[0.97] " +
              (customMode
                ? "bg-accent text-accent-foreground"
                : "bg-fill text-label")
            }
          >
            Altra
          </button>
        )}
      </div>
      {customMode && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="Distanza in metri"
          value={customStr}
          onChange={(e) => {
            setCustomStr(e.target.value);
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) && n > 0 ? n : null);
          }}
          className="mt-2 w-full rounded-xl bg-fill px-3 py-2 text-sm text-label outline-none"
        />
      )}
    </div>
  );
}
