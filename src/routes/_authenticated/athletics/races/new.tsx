import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForRace } from "@/lib/calories";
import { DistancePicker } from "@/components/DistancePicker";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/athletics/races/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    distance: typeof s.distance === "number" ? s.distance : undefined,
  }),
  component: NewRacePage,
});

function NewRacePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { distance: presetDistance } = Route.useSearch();
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: fetchMyProfile });

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState<number | null>(presetDistance ?? null);
  const [time, setTime] = useState("");
  const [placement, setPlacement] = useState("");
  const [category, setCategory] = useState("");
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");
  const distanceLocked = presetDistance != null;

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessione scaduta");
      const distance_m = distance;
      const time_sec = parseTime(time);
      if (!distance_m) throw new Error("Seleziona una distanza");
      if (!time_sec) throw new Error("Inserisci un tempo valido");
      const finalName =
        name.trim() || `Gara ${distance_m}m · ${date}`;
      const calories = profileQ.data
        ? computeCaloriesForRace(profileQ.data, {
            distance_m,
            time_sec,
            avg_hr: hr ? Number(hr) : null,
          })
        : null;
      const payload = {
        user_id: u.user.id,
        name: finalName,
        date,
        location: location || null,
        distance_m,
        time_sec,
        placement: placement ? Number(placement) : null,
        category: category || null,
        avg_hr: hr ? Number(hr) : null,
        notes: notes || null,
        calories_burned: calories,
      };
      // eslint-disable-next-line no-console
      console.log("[races/new] insert payload", payload);
      const { error } = await supabase.from("races").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gara salvata");
      qc.invalidateQueries({ queryKey: ["races"] });
      qc.invalidateQueries({ queryKey: ["performance_log"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      navigate({ to: "/athletics/races" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <Link
        to="/athletics/races"
        className="mb-2 inline-flex items-center gap-1 text-sm text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Gare
      </Link>
      <h2 className="mb-4 text-2xl font-bold text-label">Nuova gara</h2>

      <div className="ios-card divide-y divide-separator">
        <F label="Nome"><Input v={name} on={setName} placeholder="es. 10km città" /></F>
        <F label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-right text-base text-label outline-none" />
        </F>
        <F label="Luogo"><Input v={location} on={setLocation} placeholder="opz." /></F>
        <F label="Tempo (mm:ss)"><Input v={time} on={setTime} placeholder="42:15" /></F>
        <F label="Posizionamento"><Input v={placement} on={setPlacement} type="number" placeholder="opz." /></F>
        <F label="Categoria"><Input v={category} on={setCategory} placeholder="opz." /></F>
        <F label="FC media (bpm)"><Input v={hr} on={setHr} type="number" placeholder="opz." /></F>
      </div>

      <div className="ios-card mt-3 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-label-secondary">
          <span>Distanza</span>
          {distanceLocked && <span className="text-label-tertiary">Bloccata dalla scelta PB</span>}
        </div>
        {distanceLocked ? (
          <div className="text-lg font-bold text-label">{distance}m</div>
        ) : (
          <DistancePicker value={distance} onChange={setDistance} />
        )}
      </div>
      <textarea
        placeholder="Note"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="ios-card mt-3 w-full resize-none bg-background p-3 text-sm text-label outline-none"
      />
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Salva gara
      </button>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-label">{label}</span>
      {children}
    </label>
  );
}
function Input({
  v, on, placeholder, type = "text",
}: { v: string; on: (s: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      value={v}
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      placeholder={placeholder}
      onChange={(e) => on(e.target.value)}
      className="w-40 bg-transparent text-right text-base text-label outline-none"
    />
  );
}

function parseTime(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length === 3) {
    const [h, m, sec] = parts.map(Number);
    if ([h, m, sec].some(Number.isNaN)) return null;
    return h * 3600 + m * 60 + sec;
  }
  if (parts.length === 2) {
    const [m, sec] = parts.map(Number);
    if ([m, sec].some(Number.isNaN)) return null;
    return m * 60 + sec;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
