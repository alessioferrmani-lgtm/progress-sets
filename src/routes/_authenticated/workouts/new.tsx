import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  fetchExercises,
  fetchTemplate,
  isGymExercise,
  type RepsType,
} from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { parseWorkoutLocally } from "../../../../supabase/functions/_shared/workout-parser";
import { storedMuscleGroupFor } from "@/lib/muscle-map";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/workouts/new")({
  component: WorkoutNewPage,
});

function WorkoutNewPage() {
  const [mode, setMode] = useState<"manual" | "import">("manual");
  return (
    <div>
      <div className="mx-auto flex max-w-md gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={() => setMode("manual")}
          className={
            "flex-1 rounded-xl py-2 text-sm font-semibold " +
            (mode === "manual"
              ? "bg-accent text-accent-foreground"
              : "bg-fill text-label-secondary")
          }
        >
          <Wrench className="mr-1 inline h-4 w-4" /> Builder manuale
        </button>
        <button
          onClick={() => setMode("import")}
          className={
            "flex-1 rounded-xl py-2 text-sm font-semibold " +
            (mode === "import"
              ? "bg-accent text-accent-foreground"
              : "bg-fill text-label-secondary")
          }
        >
          <FileText className="mr-1 inline h-4 w-4" /> Incolla scheda
        </button>
      </div>
      {mode === "manual" ? <TemplateEditor mode="new" embedded /> : <WorkoutImport />}
    </div>
  );
}

type Row = {
  key: string;
  exercise_id: string;
  target_sets: number;
  target_reps: number | null;
  reps_type: RepsType;
  reps_display: string | null;
  target_weight_kg: number | null;
  rest_seconds: number;
};

export function TemplateEditor({
  mode,
  templateId,
  embedded = false,
}: {
  mode: "new" | "edit";
  templateId?: string;
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  void embedded;
  const { data: allExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });
  const { data: existing } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTemplate(templateId!),
    enabled: mode === "edit" && !!templateId,
  });

  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const gymExercises = (allExercises ?? []).filter(isGymExercise);

  useEffect(() => {
    if (existing) {
      setName(existing.template.name);
      setRows(
        existing.exercises.map((e) => ({
          key: e.id,
          exercise_id: e.exercise_id,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          reps_type: e.reps_type,
          reps_display: e.reps_display,
          target_weight_kg: e.target_weight_kg,
          rest_seconds: e.rest_seconds,
        })),
      );
    }
  }, [existing]);

  const addExercise = () => {
    const first = gymExercises[0];
    if (!first) return;
    setRows((r) => [
      ...r,
      {
        key: crypto.randomUUID(),
        exercise_id: first.id,
        target_sets: 3,
        target_reps: 10,
        reps_type: "count",
        reps_display: "10",
        target_weight_kg: null,
        rest_seconds: 90,
      },
    ]);
  };
  const move = (idx: number, dir: -1 | 1) => {
    setRows((r) => {
      const next = [...r];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return r;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));

  const normalizedSearch = exerciseSearch
    .trim()
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const filteredExercises = gymExercises.filter((exercise) => {
    if (!normalizedSearch) return true;
    const haystack = `${exercise.name} ${exercise.muscle_group ?? ""} ${exercise.category ?? ""}`
      .toLocaleLowerCase("it")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return haystack.includes(normalizedSearch);
  });

  const save = async () => {
    if (!name.trim()) return toast.error("Inserisci un nome");
    if (rows.length === 0) return toast.error("Aggiungi almeno un esercizio");
    setSaving(true);
    let userId: string | null = null;
    let createdTemplateId: string | null = null;
    try {
      const { data: u } = await supabase.auth.getUser();
      const ownerId = u.user?.id;
      if (!ownerId) throw new Error("Sessione scaduta");
      userId = ownerId;
      let tid = templateId;
      let previousExerciseIds: string[] = [];
      if (mode === "new") {
        const { data, error } = await supabase
          .from("workout_templates")
          .insert({ name: name.trim(), user_id: ownerId })
          .select("id")
          .single();
        if (error) throw error;
        tid = data.id;
        createdTemplateId = data.id;
      } else {
        const { error } = await supabase
          .from("workout_templates")
          .update({ name: name.trim(), updated_at: new Date().toISOString() })
          .eq("id", tid!);
        if (error) throw error;
        const { data: previousRows, error: previousRowsError } = await supabase
          .from("template_exercises")
          .select("id")
          .eq("template_id", tid!);
        if (previousRowsError) throw previousRowsError;
        previousExerciseIds = (previousRows ?? []).map((row) => row.id);
      }
      const payload = rows.map((r, i) => ({
        template_id: tid!,
        exercise_id: r.exercise_id,
        order_index: i,
        target_sets: r.target_sets,
        target_reps: r.reps_type === "count" ? r.target_reps : null,
        reps_type: r.reps_type,
        reps_display: r.reps_display,
        target_weight_kg: r.target_weight_kg,
        rest_seconds: r.rest_seconds,
        user_id: ownerId,
      }));
      const { data: insertedRows, error: ie } = await supabase
        .from("template_exercises")
        .insert(payload)
        .select("id");
      if (ie) throw ie;
      if (mode === "edit" && previousExerciseIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("template_exercises")
          .delete()
          .in("id", previousExerciseIds);
        if (deleteError) {
          const insertedIds = (insertedRows ?? []).map((row) => row.id);
          if (insertedIds.length > 0) {
            await supabase.from("template_exercises").delete().in("id", insertedIds);
          }
          throw deleteError;
        }
      }
      toast.success("Scheda salvata");
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", tid] });
      navigate({ to: "/workouts" });
    } catch (err) {
      if (mode === "new" && createdTemplateId && userId) {
        await supabase
          .from("workout_templates")
          .delete()
          .eq("id", createdTemplateId)
          .eq("user_id", userId);
      }
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => navigate({ to: "/workouts" })}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-label active:opacity-70"
          aria-label="Indietro"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-label">
          {mode === "new" ? "Nuova scheda" : "Modifica scheda"}
        </h1>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome scheda (es. Push Day)"
        className="mt-3 w-full rounded-xl bg-fill-secondary px-4 py-3 text-base text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
      />

      <label className="mt-3 block rounded-xl bg-fill p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-label-secondary">
          Cerca esercizio
        </span>
        <input
          type="search"
          value={exerciseSearch}
          onChange={(event) => setExerciseSearch(event.target.value)}
          placeholder="Es. single-leg, squat, corsa…"
          aria-label="Cerca esercizio"
          data-testid="exercise-search"
          className="mt-2 w-full rounded-lg bg-fill-secondary px-3 py-2 text-sm text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="mt-1 block text-[11px] text-label-tertiary">
          {filteredExercises.length} esercizi disponibili
        </span>
      </label>

      <div className="mt-4 space-y-2">
        {rows.map((r, idx) => (
          <div key={r.key} className="ios-card p-3">
            <div className="flex items-center gap-2">
              <select
                value={r.exercise_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((rr) => rr.map((x, i) => (i === idx ? { ...x, exercise_id: v } : x)));
                }}
                className="min-w-0 flex-1 rounded-lg bg-fill-secondary px-2 py-2 text-sm text-label"
              >
                {(filteredExercises.some((exercise) => exercise.id === r.exercise_id)
                  ? filteredExercises
                  : [
                      ...(allExercises ?? []).filter((exercise) => exercise.id === r.exercise_id),
                      ...filteredExercises,
                    ]
                ).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}{ex.muscle_group ? ` · ${ex.muscle_group}` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => move(idx, -1)}
                className="rounded-full bg-fill p-1.5 text-label-secondary"
                aria-label="Su"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(idx, 1)}
                className="rounded-full bg-fill p-1.5 text-label-secondary"
                aria-label="Giù"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeRow(idx)}
                className="rounded-full bg-fill p-1.5 text-danger"
                aria-label="Rimuovi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
              <NumField
                label="Serie"
                value={r.target_sets}
                onChange={(v) =>
                  setRows((rr) => rr.map((x, i) => (i === idx ? { ...x, target_sets: v ?? 0 } : x)))
                }
              />
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase text-label-tertiary">
                  Ripetizioni
                </span>
                <input
                  value={r.reps_display ?? ""}
                  onChange={(e) => {
                    const s = e.target.value;
                    setRows((rr) =>
                      rr.map((x, i) => {
                        if (i !== idx) return x;
                        const asNum = Number(s);
                        const isCount = /^\d+(-\d+)?$/.test(s.trim());
                        return {
                          ...x,
                          reps_display: s,
                          reps_type: isCount
                            ? "count"
                            : /metri|km/i.test(s)
                              ? "distance"
                              : /sec|min/i.test(s)
                                ? "time"
                                : "unspecified",
                          target_reps:
                            isCount && Number.isFinite(asNum) ? Math.round(asNum) : x.target_reps,
                        };
                      }),
                    );
                  }}
                  placeholder="10 · 8-10 · 30 sec"
                  className="rounded-lg bg-fill-secondary px-2 py-1.5 text-center text-sm text-label outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
              <NumField
                label="Rec (s)"
                value={r.rest_seconds}
                onChange={(v) =>
                  setRows((rr) =>
                    rr.map((x, i) => (i === idx ? { ...x, rest_seconds: v ?? 0 } : x)),
                  )
                }
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <NumField
                label="Kg"
                allowNull
                value={r.target_weight_kg ?? undefined}
                onChange={(v) =>
                  setRows((rr) =>
                    rr.map((x, i) => (i === idx ? { ...x, target_weight_kg: v ?? null } : x)),
                  )
                }
              />
            </div>
          </div>
        ))}
        {rows.length > 0 && filteredExercises.length === 0 && (
          <p className="rounded-xl bg-fill p-3 text-center text-sm text-label-secondary">
            Nessun esercizio corrisponde alla ricerca. Prova un altro termine.
          </p>
        )}
        <button
          onClick={addExercise}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-separator py-3 text-sm font-medium text-label-secondary active:opacity-70"
        >
          <Plus className="h-4 w-4" /> Aggiungi esercizio
        </button>
      </div>

      <button onClick={save} disabled={saving} className="ios-btn-primary mt-6 w-full">
        {saving ? "Salvataggio…" : "Salva scheda"}
      </button>
    </div>
  );
}

type ImportedExercise = {
  name: string;
  muscle_group: string;
  sets: number;
  reps_type: RepsType;
  reps_value: number | null;
  reps_display: string;
  rest_sec: number;
};
type ImportedTemplate = { name: string; exercises: ImportedExercise[]; _warnings?: string[] };
type TemplateExerciseInsert = Database["public"]["Tables"]["template_exercises"]["Insert"];

function WorkoutImport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [templates, setTemplates] = useState<ImportedTemplate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const analyze = async () => {
    if (!rawText.trim()) return toast.error("Incolla una scheda o scegli un file di testo");
    setLoading(true);
    try {
      const parsed = parseWorkoutLocally(rawText) as ImportedTemplate[];
      setTemplates(
        parsed.map((template) => ({
          ...template,
          exercises: template.exercises.map((exercise) => ({
            ...exercise,
            muscle_group: storedMuscleGroupFor(exercise.name) ?? "",
          })),
        })),
      );
      toast.success("Scheda letta correttamente");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossibile analizzare la scheda. Riprova.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateExercise = (ti: number, ei: number, patch: Partial<ImportedExercise>) =>
    setTemplates(
      (all) =>
        all?.map((t, i) =>
          i === ti
            ? { ...t, exercises: t.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
            : t,
        ) ?? null,
    );

  const removeExercise = (ti: number, ei: number) =>
    setTemplates(
      (all) =>
        all?.map((t, i) =>
          i === ti ? { ...t, exercises: t.exercises.filter((_, j) => j !== ei) } : t,
        ) ?? null,
    );

  const save = async () => {
    if (!templates?.length) return;
    setSaving(true);
    const createdTemplateIds: string[] = [];
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessione scaduta");
      for (const template of templates) {
        if (!template.name.trim() || !template.exercises.length) {
          throw new Error("Ogni giorno deve avere un nome e almeno un esercizio");
        }
        const { data: created, error: templateError } = await supabase
          .from("workout_templates")
          .insert({ name: template.name.trim(), user_id: userId })
          .select("id")
          .single();
        if (templateError) throw templateError;
        createdTemplateIds.push(created.id);
        const rows: TemplateExerciseInsert[] = [];
        for (let index = 0; index < template.exercises.length; index++) {
          const exercise = template.exercises[index];
          if (!exercise.muscle_group) {
            throw new Error(`Seleziona il gruppo muscolare per “${exercise.name}”`);
          }
          const { data: existing, error: lookupError } = await supabase
            .from("exercises")
            .select("id,muscle_group,user_id")
            .ilike("name", exercise.name.trim())
            .limit(1)
            .maybeSingle();
          if (lookupError) throw lookupError;
          let exerciseId = existing?.id;
          if (!exerciseId || (existing && !existing.muscle_group && existing.user_id !== userId)) {
            const { data: custom, error: customError } = await supabase
              .from("exercises")
              .insert({
                name: exercise.name.trim(),
                muscle_group: exercise.muscle_group,
                user_id: userId,
              })
              .select("id")
              .single();
            if (customError) throw customError;
            exerciseId = custom.id;
          } else if (existing && !existing.muscle_group && existing.user_id === userId) {
            const { error: groupError } = await supabase
              .from("exercises")
              .update({ muscle_group: exercise.muscle_group })
              .eq("id", existing.id);
            if (groupError) throw groupError;
          }
          rows.push({
            template_id: created.id,
            exercise_id: exerciseId,
            order_index: index,
            target_sets: exercise.sets,
            target_reps: exercise.reps_type === "count" ? (exercise.reps_value ?? null) : null,
            reps_type: exercise.reps_type,
            reps_display: exercise.reps_display,
            rest_seconds: exercise.rest_sec,
            user_id: userId,
          });
        }
        const { error: rowsError } = await supabase.from("template_exercises").insert(rows);
        if (rowsError) throw rowsError;
      }
      toast.success("Scheda salvata");
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["exercises"] });
      navigate({ to: "/workouts" });
    } catch (error) {
      if (createdTemplateIds.length > 0) {
        await supabase
          .from("workout_templates")
          .delete()
          .in("id", createdTemplateIds)
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
      }
      toast.error(error instanceof Error ? error.message : "Impossibile salvare la scheda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-4">
      <h1 className="text-xl font-bold text-label">Incolla scheda scritta</h1>
      {!templates ? (
        <>
          <p className="mt-1 text-sm text-label-secondary">
            Incolla il testo oppure scegli un file .txt. Tutto viene letto sul dispositivo e potrai
            controllare il risultato prima di salvarlo.
          </p>
          <label className="ios-card mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-dashed border-separator px-4 py-3 text-sm font-semibold text-accent active:opacity-70">
            <FileText className="h-4 w-4" />
            <span>{fileName ? `File: ${fileName}` : "Scegli file di testo"}</span>
            <input
              type="file"
              accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) {
                  toast.error("Il file è troppo grande. Dimensione massima: 1 MB.");
                  event.target.value = "";
                  return;
                }
                try {
                  setRawText(await file.text());
                  setFileName(file.name);
                  setTemplates(null);
                  toast.success("File caricato");
                } catch {
                  toast.error("Impossibile leggere il file di testo");
                }
              }}
            />
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            placeholder={"GIORNO: Richiamo\n\nBox Jump\nSerie: 3\nRipetizioni: 3\nRecupero: 0"}
            className="ios-card mt-3 w-full resize-none bg-background p-4 text-sm text-label outline-none"
          />
          <button onClick={analyze} disabled={loading} className="ios-btn-primary mt-4 w-full">
            {loading ? "Analisi in corso…" : "Analizza scheda"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-label-secondary">
            Controlla e modifica ogni valore. Puoi correggere gli esercizi non interpretati.
          </p>
          <div className="mt-4 space-y-4">
            {templates.map((template, ti) => (
              <div key={ti} className="ios-card p-3">
                <input
                  value={template.name}
                  onChange={(e) =>
                    setTemplates(
                      (all) =>
                        all?.map((t, i) => (i === ti ? { ...t, name: e.target.value } : t)) ?? null,
                    )
                  }
                  className="w-full bg-transparent text-base font-semibold text-label outline-none"
                />
                {(template._warnings ?? []).length > 0 && (
                  <div className="mt-2 rounded-lg bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    {template._warnings!.join(" · ")}
                  </div>
                )}
                {template.exercises.map((exercise, ei) => (
                  <div key={ei} className="mt-3 rounded-xl bg-fill p-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={exercise.name}
                        onChange={(e) => updateExercise(ti, ei, { name: e.target.value })}
                        className="flex-1 bg-transparent text-sm font-medium text-label outline-none"
                      />
                      <button
                        onClick={() => removeExercise(ti, ei)}
                        className="rounded-full bg-background p-1 text-danger"
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <ImportNumber
                        label="Serie"
                        value={exercise.sets}
                        onChange={(sets) => updateExercise(ti, ei, { sets })}
                      />
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-label-tertiary">Ripetizioni</span>
                        <input
                          value={exercise.reps_display}
                          onChange={(e) => {
                            const s = e.target.value;
                            const asNum = Number(s);
                            const isCount = /^\d+(-\d+)?$/.test(s.trim());
                            updateExercise(ti, ei, {
                              reps_display: s,
                              reps_type: isCount
                                ? "count"
                                : /metri|km/i.test(s)
                                  ? "distance"
                                  : /sec|min/i.test(s)
                                    ? "time"
                                    : "unspecified",
                              reps_value:
                                isCount && Number.isFinite(asNum) ? Math.round(asNum) : null,
                            });
                          }}
                          className="rounded-lg bg-background px-2 py-1.5 text-center text-sm text-label outline-none"
                        />
                      </label>
                      <ImportNumber
                        label="Rec (s)"
                        value={exercise.rest_sec}
                        onChange={(rest_sec) => updateExercise(ti, ei, { rest_sec })}
                      />
                    </div>
                    <label className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-label-tertiary">Gruppo muscolare</span>
                      <select
                        value={exercise.muscle_group}
                        onChange={(event) =>
                          updateExercise(ti, ei, { muscle_group: event.target.value })
                        }
                        className="rounded-lg bg-background px-2 py-1.5 text-sm text-label outline-none"
                      >
                        <option value="">Seleziona</option>
                        {[
                          "Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti",
                          "Gambe", "Glutei", "Polpacci", "Caviglia", "Tibiali (stinchi)", "Core", "Avambracci",
                          "Cardio", "Atletica", "Full body",
                        ].map((group) => <option key={group}>{group}</option>)}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button onClick={() => setTemplates(null)} className="mt-4 w-full text-sm text-accent">
            Analizza di nuovo
          </button>
          <button onClick={save} disabled={saving} className="ios-btn-primary mt-3 w-full">
            {saving ? "Salvataggio…" : "Salva scheda"}
          </button>
        </>
      )}
    </div>
  );
}

function ImportNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-label-tertiary">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg bg-background px-2 py-1.5 text-center text-sm text-label outline-none"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  allowNull,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  allowNull?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase text-label-tertiary">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(allowNull ? undefined : 0);
          else onChange(Number(raw));
        }}
        className="rounded-lg bg-fill-secondary px-2 py-1.5 text-center text-sm text-label outline-none focus:ring-2 focus:ring-accent"
      />
    </label>
  );
}
