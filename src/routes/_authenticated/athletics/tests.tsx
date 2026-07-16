import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
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
import { ChevronRight, Plus, Timer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DistancePicker } from "@/components/DistancePicker";

export const Route = createFileRoute("/_authenticated/athletics/tests")({
  component: TestsListPage,
});

function TestsListPage() {
  const qc = useQueryClient();
  const isTestsIndex = useRouterState({
    select: (state) => state.location.pathname.replace(/\/+$/, "") === "/athletics/tests",
  });
  const typesQ = useQuery({ queryKey: ["test_types"], queryFn: fetchTestTypes });
  const testsQ = useQuery({ queryKey: ["tests", "all"], queryFn: fetchAllTests });
  const [showNew, setShowNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TestType | null>(null);

  const deleteCustomType = useMutation({
    mutationFn: async (testType: TestType) => {
      if (!testType.is_custom) throw new Error("I Test standard non possono essere eliminati.");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sessione scaduta. Esci e accedi di nuovo.");

      const { error: testsError } = await supabase
        .from("tests")
        .delete()
        .eq("test_type_id", testType.id)
        .eq("user_id", user.id);
      if (testsError) throw testsError;

      const { data, error } = await supabase
        .from("test_types")
        .delete()
        .eq("id", testType.id)
        .eq("user_id", user.id)
        .eq("is_custom", true)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Il Test personalizzato non è stato eliminato.");
    },
    onSuccess: async () => {
      setPendingDelete(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["test_types"] }),
        qc.invalidateQueries({ queryKey: ["tests"] }),
        qc.invalidateQueries({ queryKey: ["performance_log"] }),
        qc.invalidateQueries({ queryKey: ["dash"] }),
      ]);
      toast.success("Test personalizzato eliminato");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // This route is also the layout parent of /athletics/tests/$typeId.
  // Rendering the list unconditionally hides the matched detail route.
  if (!isTestsIndex) return <Outlet />;

  const stats = new Map<string, { count: number; best: number | null }>();
  (testsQ.data ?? []).forEach((t) => {
    const s = stats.get(t.test_type_id) ?? { count: 0, best: null };
    s.count++;
    const val = t.time_sec ?? null;
    if (val != null && (s.best === null || val < s.best)) s.best = val;
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
            <li key={tt.id} className="ios-list-row">
              <Timer className="h-4 w-4 text-accent" />
              <Link
                to="/athletics/tests/$typeId"
                params={{ typeId: tt.id }}
                className="min-w-0 flex-1 text-left active:opacity-70"
              >
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
                        {tt.result_type === "TIME" ? formatTime(s.best) : formatDistance(s.best)}
                      </span>
                    </>
                  )}
                </div>
              </Link>
              {tt.is_custom && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(tt)}
                  disabled={deleteCustomType.isPending}
                  aria-label={`Elimina tipo ${tt.name}`}
                  className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-danger/10 px-3 text-sm font-semibold text-danger active:opacity-70 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              )}
              <ChevronRight className="h-4 w-4 text-label-tertiary" />
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

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-custom-test-title"
          onClick={() => !deleteCustomType.isPending && setPendingDelete(null)}
        >
          <div
            className="ios-card w-full max-w-sm bg-background p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="delete-custom-test-title" className="text-lg font-bold text-label">
                  Eliminare “{pendingDelete.name}”?
                </h3>
                <p className="mt-1 text-sm text-label-secondary">
                  {stats.get(pendingDelete.id)?.count
                    ? `Verranno eliminate anche ${stats.get(pendingDelete.id)!.count} prove collegate, record e statistiche.`
                    : "Il Test personalizzato verrà rimosso definitivamente."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleteCustomType.isPending}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-fill text-label"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleteCustomType.isPending}
                className="min-h-11 rounded-full bg-fill px-4 py-2.5 font-semibold text-label"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => deleteCustomType.mutate(pendingDelete)}
                disabled={deleteCustomType.isPending}
                className="min-h-11 rounded-full bg-danger px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {deleteCustomType.isPending ? "Eliminazione…" : "Elimina tutto"}
              </button>
            </div>
          </div>
        </div>
      )}
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
                (kind === "DISTANCE"
                  ? "bg-background text-label shadow-sm"
                  : "text-label-secondary")
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
