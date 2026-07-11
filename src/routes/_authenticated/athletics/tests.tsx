import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllTests,
  fetchTestTypes,
  formatTime,
  formatDistance,
  type TestType,
} from "@/lib/athletics-queries";
import { ChevronRight, Plus, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { DistancePicker } from "@/components/DistancePicker";

export const Route = createFileRoute("/_authenticated/athletics/tests")({
  component: TestsListPage,
});

function TestsListPage() {
  const typesQ = useQuery({ queryKey: ["test_types"], queryFn: fetchTestTypes });
  const testsQ = useQuery({ queryKey: ["tests", "all"], queryFn: fetchAllTests });
  const [showNew, setShowNew] = useState(false);

  const stats = new Map<string, { count: number; best: number | null }>();
  (testsQ.data ?? []).forEach((t) => {
    const s = stats.get(t.test_type_id) ?? { count: 0, best: null };
    s.count++;
    const val = t.time_sec ?? null;
    if (val != null && (s.best === null || val < s.best)) s.best = val;
    // For DISTANCE tests, treat "best" as MAX distance covered
    if (t.time_sec == null && t.distance_covered_m != null) {
      const cur = s.best === null ? -Infinity : s.best;
      if (t.distance_covered_m > cur) s.best = t.distance_covered_m;
    }
    stats.set(t.test_type_id, s);
  });

  return (
    <>
      <ul className="ios-list">
        {(typesQ.data ?? []).map((tt) => {
          const s = stats.get(tt.id);
          return (
            <li key={tt.id}>
              <Link
                to="/athletics/tests/$typeId"
                params={{ typeId: tt.id }}
                className="ios-list-row"
              >
                <Timer className="h-4 w-4 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-label">
                    {tt.name}
                    {tt.is_custom && (
                      <span className="ml-1.5 rounded-full bg-fill px-1.5 py-0.5 text-[9px] uppercase text-label-tertiary">
                        custom
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-label-secondary">
                    {s?.count ?? 0} {s?.count === 1 ? "prova" : "prove"}
                    {s?.best != null && (
                      <>
                        {" · migliore "}
                        <span className="font-semibold text-label">
                          {tt.result_type === "TIME"
                            ? formatTime(s.best)
                            : formatDistance(s.best)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-label-tertiary" />
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => setShowNew(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-sm font-semibold text-accent active:opacity-70"
      >
        <Plus className="h-4 w-4" /> Test personalizzato
      </button>

      {showNew && <NewCustomTypeSheet onClose={() => setShowNew(false)} />}
    </>
  );
}

function NewCustomTypeSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TestType["result_type"]>("TIME");
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (kind === "TIME" && !distance) throw new Error("Seleziona una distanza");
      if (kind === "DISTANCE" && !duration) throw new Error("Inserisci la durata");
      const { error } = await supabase.from("test_types").insert({
        user_id: u.user!.id,
        name: name.trim(),
        result_type: kind,
        distance_m: kind === "TIME" ? distance : null,
        duration_sec: kind === "DISTANCE" && duration ? Number(duration) : null,
        is_custom: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test creato");
      qc.invalidateQueries({ queryKey: ["test_types"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-label">Nuovo tipo di test</h3>
          <button onClick={onClose} className="text-label-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            placeholder="Nome del test (es. 200m rana)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-fill px-4 py-3 text-base text-label outline-none"
          />
          <div className="flex rounded-xl bg-fill p-1">
            <button
              onClick={() => setKind("TIME")}
              className={
                "flex-1 rounded-lg py-2 text-sm font-semibold " +
                (kind === "TIME" ? "bg-background text-label shadow-sm" : "text-label-secondary")
              }
            >
              A tempo
            </button>
            <button
              onClick={() => setKind("DISTANCE")}
              className={
                "flex-1 rounded-lg py-2 text-sm font-semibold " +
                (kind === "DISTANCE" ? "bg-background text-label shadow-sm" : "text-label-secondary")
              }
            >
              A distanza
            </button>
          </div>
          {kind === "TIME" ? (
            <div className="rounded-xl bg-fill p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
                Distanza standard
              </div>
              <DistancePicker value={distance} onChange={setDistance} />
            </div>
          ) : (
            <input
              type="number"
              placeholder="Durata fissa (secondi, es. 720)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-xl bg-fill px-4 py-3 text-base text-label outline-none"
            />
          )}
          <button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="w-full rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground disabled:opacity-50"
          >
            {create.isPending ? "Creazione…" : "Crea test"}
          </button>
        </div>
      </div>
    </div>
  );
}
