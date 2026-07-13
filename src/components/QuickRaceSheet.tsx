import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForRace } from "@/lib/calories";
import { formatDistance } from "@/lib/athletics-queries";
import { DistancePicker } from "./DistancePicker";
import { BottomSheet } from "./BottomSheet";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function QuickRaceSheet({
  open,
  onClose,
  presetDistance,
}: {
  open: boolean;
  onClose: () => void;
  presetDistance: number | null;
}) {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState("");
  const [sensations, setSensations] = useState("");
  const [distance, setDistance] = useState<number | null>(presetDistance);
  const [showMore, setShowMore] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [placement, setPlacement] = useState("");
  const [category, setCategory] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const distanceLocked = presetDistance != null;

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessione scaduta");
      const distance_m = distance;
      const time_sec = parseTime(timeStr);
      if (!distance_m) throw new Error("Seleziona una distanza");
      if (!time_sec) throw new Error("Inserisci un tempo valido (es. 42.18 o 12:30)");
      const finalName =
        name.trim() ||
        `Gara ${formatDistance(distance_m)} · ${format(new Date(date), "d MMM yyyy", { locale: it })}`;
      const calories = profileQ.data
        ? computeCaloriesForRace(profileQ.data, {
            distance_m,
            time_sec,
            avg_hr: null,
          })
        : null;
      const payload = {
        user_id: u.user.id,
        name: finalName,
        date,
        location: location.trim() || null,
        distance_m,
        time_sec,
        placement: placement ? Number(placement) : null,
        category: category.trim() || null,
        avg_hr: null,
        notes: sensations.trim() || null,
        calories_burned: calories,
      };
      // eslint-disable-next-line no-console
      console.log("[QuickRaceSheet] insert payload", payload);
      const { error } = await supabase.from("races").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gara salvata");
      qc.invalidateQueries({ queryKey: ["races"] });
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      setTimeStr("");
      setSensations("");
      setName("");
      setLocation("");
      setPlacement("");
      setCategory("");
      setShowMore(false);
      setErr(null);
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        distanceLocked && presetDistance
          ? `Nuova gara ${formatDistance(presetDistance)}`
          : "Nuova gara"
      }
    >
      <div className="space-y-3">
        {!distanceLocked && (
          <div className="rounded-xl bg-fill p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label-secondary">
              Distanza
            </div>
            <DistancePicker value={distance} onChange={setDistance} />
          </div>
        )}
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
            Tempo (secondi con . oppure mm:ss)
          </span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="es. 42.18 o 12:30"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="w-full rounded-xl bg-fill px-4 py-3 text-base text-label outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-label-secondary">Sensazioni</span>
          <textarea
            placeholder="Come è andata? Ritmo, condizioni, gara tattica…"
            value={sensations}
            onChange={(e) => setSensations(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl bg-fill px-4 py-3 text-sm text-label outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl bg-fill/60 px-4 py-2.5 text-sm font-medium text-label-secondary active:opacity-70"
        >
          <span>Altri dettagli (opz.)</span>
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showMore && (
          <div className="space-y-2 rounded-xl bg-fill/40 p-3">
            <SmallField label="Nome gara">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Campestre di Milano"
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-label outline-none"
              />
            </SmallField>
            <SmallField label="Luogo">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg bg-background px-3 py-2 text-sm text-label outline-none"
              />
            </SmallField>
            <div className="grid grid-cols-2 gap-2">
              <SmallField label="Posiz.">
                <input
                  type="number"
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full rounded-lg bg-background px-3 py-2 text-sm text-label outline-none"
                />
              </SmallField>
              <SmallField label="Categoria">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-background px-3 py-2 text-sm text-label outline-none"
                />
              </SmallField>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>
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

function SmallField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase text-label-tertiary">{label}</span>
      {children}
    </label>
  );
}

function parseTime(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map(Number);
    if (parts.some(Number.isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
