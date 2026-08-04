import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ListFilter,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RUNNING_DRILLS, runningDrillById } from "@/lib/running-drills";

const CONFIG_STORAGE_KEY = "progress-sets:home-warmup-drills";
const DEFAULT_DRILL_IDS = [
  "marcia-tecnica",
  "a-march",
  "a-skip",
  "skip-basso",
  "skip-medio",
  "calciata-dietro",
  "corsa-calciata",
  "corsa-balzata",
];

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readDrillIds(raw: string | null) {
  if (!raw) return DEFAULT_DRILL_IDS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_DRILL_IDS;
    const valid = parsed.filter(
      (id): id is string => typeof id === "string" && !!runningDrillById(id),
    );
    return [...new Set(valid)];
  } catch {
    return DEFAULT_DRILL_IDS;
  }
}

export function CustomizableWarmupReminder() {
  const [drillIds, setDrillIds] = useState(DEFAULT_DRILL_IDS);
  const [completed, setCompleted] = useState<string[]>([]);
  const [configReady, setConfigReady] = useState(false);
  const [completionReady, setCompletionReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftIds, setDraftIds] = useState(DEFAULT_DRILL_IDS);
  const [search, setSearch] = useState("");
  const currentDay = todayKey();
  const completionStorageKey = `progress-sets:running-warmup:${currentDay}`;

  useEffect(() => {
    try {
      const configured = readDrillIds(window.localStorage.getItem(CONFIG_STORAGE_KEY));
      setDrillIds(configured.length > 0 ? configured : DEFAULT_DRILL_IDS);
    } catch {
      setDrillIds(DEFAULT_DRILL_IDS);
    } finally {
      setConfigReady(true);
    }
  }, []);

  useEffect(() => {
    if (!configReady) return;
    setCompletionReady(false);
    try {
      const stored = window.localStorage.getItem(completionStorageKey);
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      const valid = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string" && drillIds.includes(id))
        : [];
      setCompleted([...new Set(valid)]);
    } catch {
      setCompleted([]);
    } finally {
      setCompletionReady(true);
    }
  }, [completionStorageKey, configReady, drillIds]);

  useEffect(() => {
    if (!configReady || !completionReady) return;
    try {
      window.localStorage.setItem(completionStorageKey, JSON.stringify(completed));
    } catch {
      // The checklist remains usable when browser storage is unavailable.
    }
  }, [completed, completionReady, completionStorageKey, configReady]);

  const selectedDrills = drillIds
    .map((id) => runningDrillById(id))
    .filter((drill): drill is NonNullable<typeof drill> => Boolean(drill));
  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("it-IT");
    return RUNNING_DRILLS.filter(
      (drill) =>
        !query ||
        drill.name.toLocaleLowerCase("it-IT").includes(query) ||
        drill.category.toLocaleLowerCase("it-IT").includes(query),
    );
  }, [search]);

  const toggleCompleted = (id: string) => {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const openEditor = () => {
    setDraftIds(drillIds);
    setSearch("");
    setEditorOpen(true);
  };

  const toggleDraft = (id: string) => {
    setDraftIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const moveDraft = (index: number, direction: -1 | 1) => {
    setDraftIds((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const saveConfiguration = () => {
    if (draftIds.length === 0) {
      toast.error("Seleziona almeno un’andatura");
      return;
    }
    setDrillIds(draftIds);
    setCompleted((current) => current.filter((id) => draftIds.includes(id)));
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(draftIds));
    } catch {
      // The in-memory configuration still applies for this session.
    }
    setEditorOpen(false);
    toast.success("Riscaldamento Home aggiornato");
  };

  const resetDraft = () => setDraftIds(DEFAULT_DRILL_IDS);
  const finished = completed.filter((id) => drillIds.includes(id)).length;

  return (
    <>
      <section
        className="ios-card mt-5 p-4"
        aria-labelledby="running-warmup-title"
        data-testid="running-warmup-reminder"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <ClipboardCheck className="size-5 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="running-warmup-title" className="text-base font-bold text-label">
                  Riscaldamento pre-corsa
                </h2>
                <p className="mt-0.5 text-xs text-label-secondary">Promemoria personalizzabile</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">
                {finished}/{drillIds.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill-secondary">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${drillIds.length ? (finished / drillIds.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 divide-y divide-separator rounded-xl bg-fill">
          {selectedDrills.map((drill) => {
            const isDone = completed.includes(drill.id);
            return (
              <button
                key={drill.id}
                type="button"
                aria-pressed={isDone}
                onClick={() => toggleCompleted(drill.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-fill-secondary"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isDone ? "border-accent bg-accent text-accent-foreground" : "border-separator"
                  }`}
                >
                  {isDone && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm ${isDone ? "text-label-tertiary line-through" : "text-label"}`}
                >
                  {drill.name}
                </span>
                <span className="text-xs text-label-secondary">{drill.dosage}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-label-secondary">
            {finished === drillIds.length
              ? "Riscaldamento completato. Buona corsa!"
              : "Segna ogni passaggio mentre lo esegui."}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {finished > 0 && (
              <button
                type="button"
                onClick={() => setCompleted([])}
                className="text-xs font-semibold text-accent"
              >
                Azzera
              </button>
            )}
            <button
              type="button"
              onClick={openEditor}
              data-testid="customize-running-warmup"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              <Pencil className="size-3.5" /> Personalizza
            </button>
          </div>
        </div>
      </section>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          role="presentation"
          onClick={() => setEditorOpen(false)}
        >
          <section
            className="max-h-[92vh] w-full overflow-hidden rounded-t-[28px] bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="running-warmup-editor-title"
            data-testid="running-warmup-editor"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-fill" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">Home</p>
                <h2 id="running-warmup-editor-title" className="text-xl font-bold text-label">
                  Imposta le andature
                </h2>
                <p className="mt-1 text-sm text-label-secondary">
                  Scegli gli esercizi e trascinali nell’ordine in cui vuoi eseguirli.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-label-secondary"
                aria-label="Chiudi personalizzazione"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[calc(92vh-250px)] space-y-4 overflow-y-auto pb-2">
              <div className="ios-card p-3">
                <div className="flex items-center gap-2">
                  <ListFilter className="size-4 text-accent" />
                  <h3 className="text-sm font-semibold text-label">
                    Ordine Home ({draftIds.length})
                  </h3>
                </div>
                {draftIds.length === 0 ? (
                  <p className="mt-3 text-sm text-label-secondary">Nessuna andatura selezionata.</p>
                ) : (
                  <ol className="mt-3 divide-y divide-separator rounded-xl bg-fill">
                    {draftIds.map((id, index) => {
                      const drill = runningDrillById(id);
                      if (!drill) return null;
                      return (
                        <li key={id} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-label">
                            {drill.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveDraft(index, -1)}
                            disabled={index === 0}
                            className="rounded-full p-1 text-label-secondary disabled:opacity-30"
                            aria-label={`Sposta ${drill.name} sopra`}
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDraft(index, 1)}
                            disabled={index === draftIds.length - 1}
                            className="rounded-full p-1 text-label-secondary disabled:opacity-30"
                            aria-label={`Sposta ${drill.name} sotto`}
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleDraft(id)}
                            className="rounded-full p-1 text-danger"
                            aria-label={`Rimuovi ${drill.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 rounded-xl bg-fill px-3 py-2.5 text-sm text-label">
                  <ListFilter className="size-4 text-label-tertiary" />
                  <span className="sr-only">Cerca andatura</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cerca andatura"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-label-tertiary"
                  />
                </label>
                <div className="mt-2 divide-y divide-separator rounded-xl bg-fill">
                  {filteredCatalog.map((drill) => {
                    const selected = draftIds.includes(drill.id);
                    return (
                      <button
                        key={drill.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleDraft(drill.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-fill-secondary"
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-separator"
                          }`}
                        >
                          {selected && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-label">
                            {drill.name}
                          </span>
                          <span className="block text-xs text-label-secondary">
                            {drill.category} · {drill.dosage}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-separator pt-3">
              <button
                type="button"
                onClick={resetDraft}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-fill px-4 text-sm font-semibold text-label"
              >
                <RotateCcw className="size-4" /> Predefinito
              </button>
              <button
                type="button"
                onClick={saveConfiguration}
                disabled={draftIds.length === 0}
                className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-40"
              >
                Salva Home
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
