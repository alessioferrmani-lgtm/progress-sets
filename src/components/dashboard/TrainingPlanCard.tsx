import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTrainingPlan,
  saveTrainingPlanItem,
  todayKey,
  updateTrainingPlanItem,
  type TrainingPlanItem,
} from "@/lib/athlete-queries";

const TYPE_LABELS: Record<string, string> = {
  strength: "Pesi",
  running: "Corsa",
  test: "Test",
  race: "Gara",
  recovery: "Recupero",
  other: "Altro",
};

export function TrainingPlanCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [type, setType] = useState("strength");
  const [target, setTarget] = useState("");
  const from = todayKey();
  const to = todayKey(addDays(new Date(), 6));
  const planQ = useQuery({
    queryKey: ["training-plan", userId, from, to],
    queryFn: () => fetchTrainingPlan(from, to),
  });
  const addItem = useMutation({
    mutationFn: () =>
      saveTrainingPlanItem({
        date,
        title: title.trim(),
        type,
        target: target.trim() || null,
        status: "planned",
        notes: null,
        linked_session_id: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plan", userId] });
      setTitle("");
      setTarget("");
      setEditorOpen(false);
      toast.success("Allenamento aggiunto al piano");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossibile aggiungere l’allenamento"),
  });
  const toggleItem = useMutation({
    mutationFn: (item: TrainingPlanItem) =>
      updateTrainingPlanItem(item.id, {
        status: item.status === "completed" ? "planned" : "completed",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training-plan", userId] }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossibile aggiornare il piano"),
  });
  const items = useMemo(() => planQ.data ?? [], [planQ.data]);

  if (planQ.isError) return null;
  return (
    <section className="ios-card p-4" data-testid="training-plan-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-accent" />
          <h2 className="text-base font-bold text-label">Piano dei prossimi giorni</h2>
        </div>
        <button
          type="button"
          onClick={() => setEditorOpen((open) => !open)}
          aria-label={editorOpen ? "Chiudi piano" : "Aggiungi allenamento"}
          className="flex size-8 items-center justify-center rounded-full bg-fill text-accent"
        >
          {editorOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>
      <p className="mt-1 text-xs text-label-secondary">
        Programma, esegui e confronta il previsto con il reale.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-fill-secondary p-3 text-center text-xs text-label-secondary">
          Nessun allenamento programmato. Aggiungi il prossimo obiettivo.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <PlanRow key={item.id} item={item} onToggle={() => toggleItem.mutate(item)} />
          ))}
        </ul>
      )}

      {editorOpen && (
        <div className="mt-4 border-t border-separator/60 pt-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="text-[10px] font-semibold uppercase text-label-secondary">
              Allenamento
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Forza gambe"
                className="mt-1 w-full rounded-xl bg-fill px-3 py-2 text-sm font-semibold text-label outline-none ring-accent focus:ring-2"
              />
            </label>
            <label className="text-[10px] font-semibold uppercase text-label-secondary">
              Data
              <input
                type="date"
                value={date}
                min={from}
                max={to}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 rounded-xl bg-fill px-3 py-2 text-sm font-semibold text-label outline-none ring-accent focus:ring-2"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-xl bg-fill px-3 py-2 text-sm font-semibold text-label outline-none"
            >
              <option value="strength">Pesi</option>
              <option value="running">Corsa</option>
              <option value="test">Test</option>
              <option value="race">Gara</option>
              <option value="recovery">Recupero</option>
              <option value="other">Altro</option>
            </select>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Obiettivo (es. 5x5 @ 80kg)"
              className="rounded-xl bg-fill px-3 py-2 text-sm text-label outline-none ring-accent focus:ring-2"
            />
          </div>
          <button
            type="button"
            disabled={!title.trim() || addItem.isPending}
            onClick={() => addItem.mutate()}
            className="mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {addItem.isPending ? "Salvataggio…" : "Aggiungi al piano"}
          </button>
        </div>
      )}
    </section>
  );
}

function PlanRow({ item, onToggle }: { item: TrainingPlanItem; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-fill-secondary p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.status === "completed" ? `Riapri ${item.title}` : `Completa ${item.title}`}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${item.status === "completed" ? "border-success bg-success text-white" : "border-separator text-label-tertiary"}`}
      >
        {item.status === "completed" && <Check className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-semibold ${item.status === "completed" ? "text-label-tertiary line-through" : "text-label"}`}
        >
          {item.title}
        </div>
        <div className="mt-0.5 text-xs text-label-secondary">
          {format(new Date(`${item.date}T12:00:00`), "EEE d MMM", { locale: it })} ·{" "}
          {TYPE_LABELS[item.type] ?? "Allenamento"}
          {item.target ? ` · ${item.target}` : ""}
        </div>
      </div>
    </li>
  );
}
