import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForTest } from "@/lib/calories";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import type { TestType } from "@/lib/athletics-queries";

export function QuickTestSheet({
  type,
  open,
  onClose,
}: {
  type: TestType | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [valueStr, setValueStr] = useState("");
  const [sensations, setSensations] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const isTime = type?.result_type === "TIME";

  const save = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error("Tipo non caricato");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessione scaduta");
      const num = Number(valueStr.replace(",", "."));
      if (!Number.isFinite(num) || num <= 0)
        throw new Error(isTime ? "Inserisci un tempo valido (es. 42.18)" : "Inserisci una distanza valida");
      const time_sec = isTime ? num : null;
      const distance_covered_m = !isTime ? num : null;
      const calories = profileQ.data
        ? computeCaloriesForTest(profileQ.data, {
            result_type: type.result_type,
            distance_m: type.distance_m,
            duration_sec: type.duration_sec,
            time_sec,
            avg_hr: null,
          })
        : null;
      const payload = {
        user_id: u.user.id,
        test_type_id: type.id,
        date,
        time_sec,
        distance_covered_m,
        avg_hr: null,
        weather: null,
        notes: null,
        observations: sensations.trim() || null,
        calories_burned: calories,
      };
      // eslint-disable-next-line no-console
      console.log("[QuickTestSheet] insert payload", payload);
      const { error } = await supabase.from("tests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prova salvata");
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      setValueStr("");
      setSensations("");
      setErr(null);
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={type ? type.name : "Nuova prova"}>
      <div className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-label-secondary">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl bg-fill px-4 py-3 text-base text-label outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-label-secondary">
            {isTime ? "Tempo (secondi, decimali con . )" : "Distanza (metri)"}
          </span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder={isTime ? "es. 42.18" : "es. 2400"}
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            className="w-full rounded-xl bg-fill px-4 py-3 text-base text-label outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-label-secondary">Sensazioni</span>
          <textarea
            placeholder="Come è andata? Fatica, ritmo, tecnica…"
            value={sensations}
            onChange={(e) => setSensations(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-fill px-4 py-3 text-sm text-label outline-none"
          />
        </label>
        {err && (
          <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {err}
          </div>
        )}
        <button
          disabled={save.isPending}
          onClick={() => {
            setErr(null);
            save.mutate();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {save.isPending ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </BottomSheet>
  );
}
