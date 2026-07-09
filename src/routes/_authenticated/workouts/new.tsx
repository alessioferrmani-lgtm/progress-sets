import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchExercises, fetchTemplate } from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workouts/new")({
  component: () => <TemplateEditor mode="new" />,
});

type Row = {
  key: string;
  exercise_id: string;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number | null;
  rest_seconds: number;
};

export function TemplateEditor({
  mode,
  templateId,
}: {
  mode: "new" | "edit";
  templateId?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  useEffect(() => {
    if (existing) {
      setName(existing.template.name);
      setRows(
        existing.exercises.map((e) => ({
          key: e.id,
          exercise_id: e.exercise_id,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_weight_kg: e.target_weight_kg,
          rest_seconds: e.rest_seconds,
        })),
      );
    }
  }, [existing]);

  const addExercise = () => {
    const first = allExercises?.[0];
    if (!first) return;
    setRows((r) => [
      ...r,
      {
        key: crypto.randomUUID(),
        exercise_id: first.id,
        target_sets: 3,
        target_reps: 10,
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

  const save = async () => {
    if (!name.trim()) return toast.error("Inserisci un nome");
    if (rows.length === 0) return toast.error("Aggiungi almeno un esercizio");
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;
      let tid = templateId;
      if (mode === "new") {
        const { data, error } = await supabase
          .from("workout_templates")
          .insert({ name: name.trim(), user_id: userId })
          .select("id")
          .single();
        if (error) throw error;
        tid = data.id;
      } else {
        const { error } = await supabase
          .from("workout_templates")
          .update({ name: name.trim(), updated_at: new Date().toISOString() })
          .eq("id", tid!);
        if (error) throw error;
        await supabase.from("template_exercises").delete().eq("template_id", tid!);
      }
      const payload = rows.map((r, i) => ({
        template_id: tid!,
        exercise_id: r.exercise_id,
        order_index: i,
        target_sets: r.target_sets,
        target_reps: r.target_reps,
        target_weight_kg: r.target_weight_kg,
        rest_seconds: r.rest_seconds,
      }));
      const { error: ie } = await supabase.from("template_exercises").insert(payload);
      if (ie) throw ie;
      toast.success("Scheda salvata");
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", tid] });
      navigate({ to: "/workouts" });
    } catch (err) {
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

      <div className="mt-4 space-y-2">
        {rows.map((r, idx) => (
          <div key={r.key} className="ios-card p-3">
            <div className="flex items-center gap-2">
              <select
                value={r.exercise_id}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((rr) =>
                    rr.map((x, i) => (i === idx ? { ...x, exercise_id: v } : x)),
                  );
                }}
                className="min-w-0 flex-1 rounded-lg bg-fill-secondary px-2 py-2 text-sm text-label"
              >
                {(allExercises ?? []).map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
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
                  setRows((rr) =>
                    rr.map((x, i) => (i === idx ? { ...x, target_sets: v ?? 0 } : x)),
                  )
                }
              />
              <NumField
                label="Reps"
                value={r.target_reps}
                onChange={(v) =>
                  setRows((rr) =>
                    rr.map((x, i) => (i === idx ? { ...x, target_reps: v ?? 0 } : x)),
                  )
                }
              />
              <NumField
                label="Kg"
                allowNull
                value={r.target_weight_kg ?? undefined}
                onChange={(v) =>
                  setRows((rr) =>
                    rr.map((x, i) =>
                      i === idx ? { ...x, target_weight_kg: v ?? null } : x,
                    ),
                  )
                }
              />
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
          </div>
        ))}
        <button
          onClick={addExercise}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-separator py-3 text-sm font-medium text-label-secondary active:opacity-70"
        >
          <Plus className="h-4 w-4" /> Aggiungi esercizio
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="ios-btn-primary mt-6 w-full"
      >
        {saving ? "Salvataggio…" : "Salva scheda"}
      </button>
    </div>
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
