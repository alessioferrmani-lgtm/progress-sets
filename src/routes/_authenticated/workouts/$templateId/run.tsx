import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPreviousSets,
  fetchTemplate,
  type TemplateExercise,
} from "@/lib/workout-queries";
import { supabase } from "@/integrations/supabase/client";
import { useRestTimer } from "@/lib/rest-timer-store";
import { toast } from "sonner";
import { X, Check, Plus, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workouts/$templateId/run")({
  component: RunPage,
});

type Row = {
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
  completedAt?: number;
  logId?: string;
};

function RunPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();

  const { data: templateData } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTemplate(templateId),
  });

  const exercises = templateData?.exercises ?? [];
  const exerciseIds = useMemo(() => exercises.map((e) => e.exercise_id), [exercises]);

  const { data: previous } = useQuery({
    queryKey: ["previous-sets", exerciseIds.join(",")],
    queryFn: () => fetchPreviousSets(exerciseIds),
    enabled: exerciseIds.length > 0,
  });

  // Create session on mount
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ user_id: u.user!.id, template_id: templateId })
        .select("id,started_at")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (mounted) {
        setSessionId(data.id);
        setStartedAt(new Date(data.started_at).getTime());
      }
    })();
    return () => {
      mounted = false;
    };
  }, [templateId]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, Row[]>>({});

  // Initialize rows once template + previous loaded
  useEffect(() => {
    if (!templateData || !previous) return;
    setRowsByExercise((current) => {
      if (Object.keys(current).length > 0) return current;
      const next: Record<string, Row[]> = {};
      templateData.exercises.forEach((ex) => {
        const prevMap = previous.get(ex.exercise_id);
        next[ex.id] = Array.from({ length: ex.target_sets }, (_, i) => {
          const setNum = i + 1;
          const p = prevMap?.get(setNum);
          const kg = p?.weight_kg ?? ex.target_weight_kg ?? 0;
          const reps = p?.reps ?? ex.target_reps;
          return {
            set_number: setNum,
            weight: kg ? String(kg) : "",
            reps: reps ? String(reps) : "",
            completed: false,
          };
        });
      });
      return next;
    });
  }, [templateData, previous]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const em = Math.floor(elapsed / 60);
  const es = String(elapsed % 60).padStart(2, "0");

  const timer = useRestTimer();

  const activeEx = exercises[activeIdx];
  const rows = activeEx ? rowsByExercise[activeEx.id] ?? [] : [];

  const totalSets = exercises.reduce((s, e) => s + e.target_sets, 0);
  const completedSets = Object.values(rowsByExercise)
    .flat()
    .filter((r) => r.completed).length;

  const confirmSet = async (rowIdx: number) => {
    if (!sessionId || !activeEx) return;
    const row = rows[rowIdx];
    if (row.completed) return;
    const weight = Number(row.weight || 0);
    const reps = parseInt(row.reps || "0", 10);
    if (!reps) {
      toast.error("Inserisci le ripetizioni");
      return;
    }
    // Compute rest_taken vs previous completed set in this session (any exercise)
    const allCompleted = Object.values(rowsByExercise)
      .flat()
      .filter((r) => r.completed && r.completedAt);
    const lastTs = allCompleted.length
      ? Math.max(...allCompleted.map((r) => r.completedAt!))
      : null;
    const restTaken = lastTs ? Math.round((Date.now() - lastTs) / 1000) : null;

    const { data, error } = await supabase
      .from("logged_sets")
      .insert({
        session_id: sessionId,
        exercise_id: activeEx.exercise_id,
        set_number: row.set_number,
        weight_kg: weight,
        reps,
        rest_taken_sec: restTaken,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const completedAt = Date.now();
    setRowsByExercise((current) => {
      const next = { ...current };
      const list = [...(next[activeEx.id] ?? [])];
      list[rowIdx] = { ...list[rowIdx], completed: true, completedAt, logId: data.id };
      next[activeEx.id] = list;
      return next;
    });
    // Start rest timer
    timer.start(activeEx.rest_seconds, activeEx.exercise_id);

    // Focus next: same exercise next uncompleted, else next exercise
    const nextInSame = rows.findIndex((r, i) => i > rowIdx && !r.completed);
    if (nextInSame === -1) {
      // Check if any other exercise still has uncompleted rows
      const anyIncomplete = exercises.some((ex, idx) => {
        if (idx <= activeIdx) return false;
        const list = rowsByExercise[ex.id] ?? [];
        return list.some((r) => !r.completed);
      });
      if (anyIncomplete && activeIdx < exercises.length - 1) {
        setActiveIdx(activeIdx + 1);
      }
    }
  };

  const finish = async () => {
    if (!sessionId) return;
    const endedAt = new Date();
    // Compute calories from profile + duration (MET-based for gym)
    let calories: number | null = null;
    try {
      const { fetchMyProfile } = await import("@/lib/profile-queries");
      const { computeCaloriesForSession } = await import("@/lib/calories");
      const profile = await fetchMyProfile();
      if (profile) {
        const durationMin = (endedAt.getTime() - startedAt) / 60000;
        calories = computeCaloriesForSession(profile, {
          duration_min: durationMin,
        });
      }
    } catch {
      // ignore, calories stays null
    }
    await supabase
      .from("workout_sessions")
      .update({ ended_at: endedAt.toISOString(), calories_burned: calories })
      .eq("id", sessionId);
    timer.skip();
    navigate({ to: "/sessions/$sessionId/summary", params: { sessionId } });
  };

  const cancel = async () => {
    if (!confirm("Uscire dall'allenamento? La sessione verrà chiusa.")) return;
    if (sessionId) {
      await supabase
        .from("workout_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    timer.skip();
    navigate({ to: "/workouts" });
  };

  if (!templateData) {
    return <div className="p-6 text-center text-label-tertiary">Caricamento…</div>;
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="ios-blur sticky top-0 z-10 flex items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          onClick={cancel}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-label"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-label">
            {templateData.template.name}
          </div>
          <div className="font-mono text-xs tabular-nums text-label-secondary">
            {em}:{es} · {completedSets}/{totalSets} serie
          </div>
        </div>
        <button
          onClick={finish}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
        >
          Fine
        </button>
      </div>

      {/* Exercise tabs */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
        {exercises.map((ex, i) => {
          const list = rowsByExercise[ex.id] ?? [];
          const done = list.filter((r) => r.completed).length;
          const isActive = i === activeIdx;
          return (
            <button
              key={ex.id}
              onClick={() => setActiveIdx(i)}
              className={
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                (isActive
                  ? "bg-accent text-accent-foreground"
                  : "bg-fill text-label-secondary")
              }
            >
              {ex.exercise.name} · {done}/{ex.target_sets}
            </button>
          );
        })}
      </div>

      {activeEx && (
        <div className="px-4">
          <div className="ios-card overflow-hidden">
            <div className="border-b border-separator px-4 py-3">
              <div className="text-base font-semibold text-label">
                {activeEx.exercise.name}
              </div>
              <div className="mt-0.5 text-xs text-label-secondary">
                Recupero target: {activeEx.rest_seconds}s
              </div>
            </div>
            <div className="grid grid-cols-[36px_1fr_1fr_1fr_44px] items-center gap-2 border-b border-separator bg-fill-secondary px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-label-tertiary">
              <div>Serie</div>
              <div>Precedente</div>
              <div className="text-center">Kg</div>
              <div className="text-center">Rep</div>
              <div />
            </div>
            <ul>
              {rows.map((r, i) => {
                const prev = previous?.get(activeEx.exercise_id)?.get(r.set_number);
                return (
                  <li
                    key={r.set_number}
                    className={
                      "grid grid-cols-[36px_1fr_1fr_1fr_44px] items-center gap-2 border-b border-separator px-3 py-2 last:border-b-0 " +
                      (r.completed ? "bg-row-completed" : "")
                    }
                  >
                    <div className="text-center text-sm font-semibold text-label">
                      {r.set_number}
                    </div>
                    <div className="text-xs text-label-secondary">
                      {prev ? `${prev.weight_kg}kg × ${prev.reps}` : "-"}
                    </div>
                    <NumberCell
                      value={r.weight}
                      disabled={r.completed}
                      step={2.5}
                      onChange={(v) =>
                        setRowsByExercise((c) => {
                          const next = { ...c };
                          const list = [...(next[activeEx.id] ?? [])];
                          list[i] = { ...list[i], weight: v };
                          next[activeEx.id] = list;
                          return next;
                        })
                      }
                    />
                    <NumberCell
                      value={r.reps}
                      disabled={r.completed}
                      step={1}
                      integer
                      onChange={(v) =>
                        setRowsByExercise((c) => {
                          const next = { ...c };
                          const list = [...(next[activeEx.id] ?? [])];
                          list[i] = { ...list[i], reps: v };
                          next[activeEx.id] = list;
                          return next;
                        })
                      }
                    />
                    <button
                      onClick={() => confirmSet(i)}
                      disabled={r.completed}
                      className={
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors " +
                        (r.completed
                          ? "bg-success text-white"
                          : "bg-fill text-label active:bg-accent active:text-accent-foreground")
                      }
                      aria-label="Conferma serie"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() =>
                setRowsByExercise((c) => {
                  const list = [...(c[activeEx.id] ?? [])];
                  const nextNum = list.length + 1;
                  const prev = previous?.get(activeEx.exercise_id)?.get(nextNum);
                  list.push({
                    set_number: nextNum,
                    weight: String(prev?.weight_kg ?? activeEx.target_weight_kg ?? ""),
                    reps: String(prev?.reps ?? activeEx.target_reps ?? ""),
                    completed: false,
                  });
                  return { ...c, [activeEx.id]: list };
                })
              }
              className="flex w-full items-center justify-center gap-1 py-2.5 text-sm font-medium text-accent active:opacity-70"
            >
              <Plus className="h-4 w-4" /> Aggiungi serie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberCell({
  value,
  onChange,
  disabled,
  step,
  integer,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  step: number;
  integer?: boolean;
}) {
  const inc = (dir: 1 | -1) => {
    const n = Number(value || 0) + dir * step;
    if (n < 0) return;
    onChange(integer ? String(Math.round(n)) : String(Math.round(n * 100) / 100));
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(-1)}
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
        aria-label="Diminuisci"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-full min-w-0 rounded-md bg-fill-secondary py-1.5 text-center text-sm font-medium text-label outline-none focus:ring-2 focus:ring-accent disabled:opacity-70"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inc(1)}
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md bg-fill text-label active:opacity-70 disabled:opacity-40"
        aria-label="Aumenta"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
