import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/muscle-map";
import { MUSCLE_VECTOR_PATHS } from "@/lib/muscle-vector-paths";
type Props = {
  active: Set<MuscleGroup>;
  selected?: MuscleGroup | null;
  onSelect?: (group: MuscleGroup) => void;
  onCategorySelect?: (group: MuscleGroup) => void;
};
export function MuscleSilhouette({ active, selected, onSelect, onCategorySelect }: Props) {
  return (
    <div className="rounded-2xl bg-[#20201e] p-3">
      <div className="mb-2 grid grid-cols-2 text-center text-sm text-label-secondary">
        <span>Davanti</span>
        <span>Dietro</span>
      </div>
      <svg
        viewBox="0 0 418 554"
        className="mx-auto block h-auto w-full max-w-[418px]"
        aria-label="Mappa muscolare: rosso allenato, grigio non coinvolto, giallo selezionato"
      >
        <image href="/muscle-map/body-reference-v3.svg" width="418" height="554" />
        {(Object.keys(MUSCLE_VECTOR_PATHS) as MuscleGroup[]).map((group) => (
          <g
            key={group}
            style={{
              color: group === selected ? "#ffe600" : active.has(group) ? "#ff5a45" : group === "feet" ? "#20201e" : "#646973",
              cursor: onSelect ? "pointer" : "default",
            }}
            onClick={() => onSelect?.(group)}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={MUSCLE_LABELS[group]}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect?.(group);
              }
            }}
          >
            <title>{MUSCLE_LABELS[group]}</title>
            <g dangerouslySetInnerHTML={{ __html: MUSCLE_VECTOR_PATHS[group] }} />
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm text-label-secondary">
        <span>
          <i className="inline-block size-2 rounded-full bg-[#ff5a45]" /> Allenati
        </span>
        <span>
          <i className="inline-block size-2 rounded-full bg-[#646973]" /> Non coinvolti
        </span>
        {selected && (
          <span>
            <i className="inline-block size-2 rounded-full bg-[#ffe600]" /> Selezionato
          </span>
        )}
      </div>
      {onSelect && (
        <div
          className="mt-3 flex flex-wrap justify-center gap-2"
          aria-label="Gruppi muscolari allenati"
        >
          {[...active].map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => (onCategorySelect ?? onSelect)(group)}
              aria-pressed={selected === group}
              className={
                "min-h-11 rounded-full border px-3 text-sm font-semibold " +
                (selected === group ? "border-[#ffe600] text-[#ffe600]" : "border-separator text-label")
              }
            >
              {MUSCLE_LABELS[group]}
            </button>
          ))}
        </div>
      )}
      {onCategorySelect && (
        <p className="mt-3 text-center text-sm text-label-secondary">
          Un tocco evidenzia il gruppo. Tocca di nuovo per gli esercizi.
        </p>
      )}
    </div>
  );
}
