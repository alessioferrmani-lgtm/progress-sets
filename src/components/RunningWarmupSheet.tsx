import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, ListPlus, Plus, Trash2, X } from "lucide-react";
import { RUNNING_DRILLS, type RunningDrill } from "@/lib/running-drills";
import { RunningDrillIllustration } from "@/components/RunningDrillIllustration";

type SavedRoutine = {
  id: string;
  name: string;
  drillIds: string[];
  createdAt: string;
};

const ROUTINES_STORAGE_KEY = "progress-sets:running-drill-routines";

export function RunningWarmupSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<"drills" | "routine">("drills");
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [routineDrillIds, setRoutineDrillIds] = useState<string[]>([]);
  const [routineName, setRoutineName] = useState("");
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  const selectedDrill = selectedDrillId
    ? RUNNING_DRILLS.find((drill) => drill.id === selectedDrillId)
    : undefined;
  const groupedDrills = useMemo(() => {
    const groups = new Map<string, RunningDrill[]>();
    RUNNING_DRILLS.forEach((drill) => {
      const group = groups.get(drill.category) ?? [];
      group.push(drill);
      groups.set(drill.category, group);
    });
    return [...groups.entries()];
  }, []);

  useEffect(() => {
    if (!open) return;
    setView("drills");
    setSelectedDrillId(null);
    setRoutineDrillIds([]);
    setRoutineName("");
    setStorageReady(false);
    try {
      const raw = window.localStorage.getItem(ROUTINES_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setSavedRoutines(Array.isArray(parsed) ? parsed.filter(isSavedRoutine) : []);
    } catch {
      setSavedRoutines([]);
    } finally {
      setStorageReady(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !storageReady) return;
    try {
      window.localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(savedRoutines));
    } catch {
      // The routine editor remains usable when storage is unavailable/private.
    }
  }, [open, savedRoutines, storageReady]);

  if (!open) return null;

  const addToRoutine = (drillId: string) => {
    setRoutineDrillIds((current) =>
      current.includes(drillId) ? current.filter((id) => id !== drillId) : [...current, drillId],
    );
  };

  const saveRoutine = () => {
    const name = routineName.trim();
    if (!name || routineDrillIds.length === 0) return;
    setSavedRoutines((current) => [
      ...current,
      {
        id: createRoutineId(),
        name,
        drillIds: routineDrillIds,
        createdAt: new Date().toISOString(),
      },
    ]);
    setRoutineName("");
  };

  const moveRoutineDrill = (index: number, direction: -1 | 1) => {
    setRoutineDrillIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/50" role="presentation">
      <section
        className="max-h-[94vh] w-full overflow-hidden rounded-t-[30px] bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="running-warmup-sheet-title"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-separator" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Atletica</p>
            <h2 id="running-warmup-sheet-title" className="text-2xl font-bold text-label">
              Riscaldamento
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-fill text-label active:opacity-70"
            aria-label="Chiudi riscaldamento"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex rounded-xl bg-fill p-1">
          <button
            type="button"
            onClick={() => setView("drills")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${view === "drills" ? "bg-background text-label shadow-sm" : "text-label-secondary"}`}
          >
            Andature ({RUNNING_DRILLS.length})
          </button>
          <button
            type="button"
            onClick={() => setView("routine")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${view === "routine" ? "bg-background text-label shadow-sm" : "text-label-secondary"}`}
          >
            La mia routine {routineDrillIds.length > 0 ? `(${routineDrillIds.length})` : ""}
          </button>
        </div>

        <div className="mt-4 max-h-[calc(94vh-180px)] overflow-y-auto pb-2">
          {view === "drills" && selectedDrill ? (
            <DrillDetail
              drill={selectedDrill}
              inRoutine={routineDrillIds.includes(selectedDrill.id)}
              onBack={() => setSelectedDrillId(null)}
              onToggleRoutine={() => addToRoutine(selectedDrill.id)}
            />
          ) : view === "drills" ? (
            <div className="space-y-5">
              <div className="ios-card bg-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <ListPlus className="mt-0.5 size-5 shrink-0 text-accent" />
                  <p className="text-sm leading-snug text-label">
                    Tocca un’andatura per vedere l’illustrazione, il punto tecnico e aggiungerla alla tua routine.
                  </p>
                </div>
              </div>
              {groupedDrills.map(([category, drills]) => (
                <section key={category} aria-labelledby={`running-category-${category}`}>
                  <h3
                    id={`running-category-${category}`}
                    className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-label-secondary"
                  >
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {drills.map((drill) => (
                      <button
                        key={drill.id}
                        type="button"
                        onClick={() => setSelectedDrillId(drill.id)}
                        className="ios-card overflow-hidden p-0 text-left active:scale-[0.98]"
                      >
                        <RunningDrillIllustration drill={drill} compact />
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-label">{drill.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-label-secondary">
                            {drill.description}
                          </p>
                          <p className="mt-1 text-xs text-label-secondary">{drill.dosage}</p>
                          {routineDrillIds.includes(drill.id) && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                              <Check className="size-3" /> Nella routine
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <RoutineEditor
              drillIds={routineDrillIds}
              routineName={routineName}
              savedRoutines={savedRoutines}
              onNameChange={setRoutineName}
              onSave={saveRoutine}
              onRemove={(id) => setRoutineDrillIds((current) => current.filter((item) => item !== id))}
              onMove={moveRoutineDrill}
              onLoad={(routine) => setRoutineDrillIds(routine.drillIds)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function DrillDetail({
  drill,
  inRoutine,
  onBack,
  onToggleRoutine,
}: {
  drill: RunningDrill;
  inRoutine: boolean;
  onBack: () => void;
  onToggleRoutine: () => void;
}) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-accent">
        <ArrowLeft className="size-4" /> Tutte le andature
      </button>
      <RunningDrillIllustration drill={drill} />
      <div className="ios-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{drill.category}</p>
            <h3 className="mt-1 text-2xl font-bold text-label">{drill.name}</h3>
          </div>
          <span className="rounded-full bg-fill px-3 py-1 text-xs font-semibold text-label-secondary">
            {drill.dosage}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-label-secondary">
          {drill.description}
        </p>
        <div className="mt-3 rounded-xl bg-fill px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-label-tertiary">
            Punto tecnico
          </p>
          <p className="mt-1 text-sm leading-relaxed text-label-secondary">{drill.cue}</p>
        </div>
        <button
          type="button"
          onClick={onToggleRoutine}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold ${inRoutine ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"}`}
        >
          {inRoutine ? <Check className="size-4" /> : <Plus className="size-4" />}
          {inRoutine ? "Nella routine" : "Aggiungi alla routine"}
        </button>
      </div>
    </div>
  );
}

function RoutineEditor({
  drillIds,
  routineName,
  savedRoutines,
  onNameChange,
  onSave,
  onRemove,
  onMove,
  onLoad,
}: {
  drillIds: string[];
  routineName: string;
  savedRoutines: SavedRoutine[];
  onNameChange: (value: string) => void;
  onSave: () => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onLoad: (routine: SavedRoutine) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="ios-card p-4">
        <h3 className="text-lg font-bold text-label">Crea una routine</h3>
        <p className="mt-1 text-sm text-label-secondary">Aggiungi le andature dal catalogo e definisci il tuo ordine.</p>
        <input
          value={routineName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Nome routine (es. Pre-gara 5 km)"
          aria-label="Nome routine"
          className="mt-4 w-full rounded-xl bg-fill-secondary px-4 py-3 text-sm text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
        />
        {drillIds.length === 0 ? (
          <p className="mt-4 rounded-xl bg-fill p-4 text-center text-sm text-label-secondary">
            Apri un’andatura e tocca “Aggiungi alla routine”.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-separator rounded-xl bg-fill">
            {drillIds.map((id, index) => {
              const drill = RUNNING_DRILLS.find((item) => item.id === id);
              if (!drill) return null;
              return (
                <li key={id} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-label">{drill.name}</span>
                  <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="rounded-full p-1 text-label-secondary disabled:opacity-30" aria-label={`Sposta ${drill.name} sopra`}>
                    <ChevronUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => onMove(index, 1)} disabled={index === drillIds.length - 1} className="rounded-full p-1 text-label-secondary disabled:opacity-30" aria-label={`Sposta ${drill.name} sotto`}>
                    <ChevronDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => onRemove(id)} className="rounded-full p-1 text-danger" aria-label={`Rimuovi ${drill.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={!routineName.trim() || drillIds.length === 0}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
        >
          <ListPlus className="size-4" /> Salva routine
        </button>
      </div>

      {savedRoutines.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-label-secondary">Routine salvate</h3>
          <div className="space-y-2">
            {savedRoutines.map((routine) => (
              <button key={routine.id} type="button" onClick={() => onLoad(routine)} className="ios-card flex w-full items-center gap-3 p-3 text-left active:opacity-70">
                <ListPlus className="size-5 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-label">{routine.name}</span>
                  <span className="block text-xs text-label-secondary">{routine.drillIds.length} andature</span>
                </span>
                <ArrowLeft className="size-4 rotate-180 text-label-tertiary" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function isSavedRoutine(value: unknown): value is SavedRoutine {
  if (!value || typeof value !== "object") return false;
  const routine = value as Partial<SavedRoutine>;
  return (
    typeof routine.id === "string" &&
    typeof routine.name === "string" &&
    typeof routine.createdAt === "string" &&
    Array.isArray(routine.drillIds) &&
    routine.drillIds.every((id) => typeof id === "string" && RUNNING_DRILLS.some((drill) => drill.id === id))
  );
}

function createRoutineId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `routine-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
