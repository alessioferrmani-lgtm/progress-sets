import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProfile, upsertMyProfile } from "@/lib/profile-queries";
import {
  ACTIVITY_LABELS,
  SEX_LABELS,
  ageFromDOB,
  isProfileComplete,
  type ActivityLevel,
  type Sex,
} from "@/lib/calories";
import { ChevronRight, LogOut, Mail, Check, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const email = user?.email ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: fetchMyProfile,
    enabled: !!user,
  });

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!profile) return;
    setHeight(profile.height_cm ? String(profile.height_cm) : "");
    setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
    setDob(profile.date_of_birth ?? "");
    setSex((profile.sex ?? "") as Sex | "");
    setActivity((profile.activity_level ?? "") as ActivityLevel | "");
    setDisplayName(profile.display_name ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      upsertMyProfile({
        display_name: displayName.trim() || null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        date_of_birth: dob || null,
        sex: (sex || null) as Sex | null,
        activity_level: (activity || null) as ActivityLevel | null,
      }),
    onSuccess: () => {
      toast.success("Profilo aggiornato");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = isProfileComplete(profile ?? null);
  const age = ageFromDOB(dob || null);

  return (
    <div className="mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="py-2 text-3xl font-bold text-label">Profilo</h1>

      <div className="ios-card mt-3 flex items-center gap-3 p-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-accent"
          style={{ background: "var(--color-accent-soft)" }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-label">{profile?.display_name || email}</div>
          <div className="text-xs text-label-secondary">
            {complete ? "Profilo completo" : "Profilo incompleto"}
          </div>
        </div>
      </div>

      {/* Physical data */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          <Settings className="h-3 w-3" /> Impostazioni
        </h2>
        <div className="ios-card">
          <Field label="Nome">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Come vuoi essere chiamato"
              className="w-48 bg-transparent text-right text-base text-label outline-none"
            />
          </Field>
        </div>
      </section>

      {/* Physical data */}
      <section className="mt-6">
        <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-label-secondary">
          I miei dati
        </h2>
        <div className="ios-card divide-y divide-separator">
          <Field label="Altezza (cm)">
            <input
              type="number"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-24 bg-transparent text-right text-base text-label outline-none"
              placeholder="—"
            />
          </Field>
          <Field label="Peso (kg)">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-24 bg-transparent text-right text-base text-label outline-none"
              placeholder="—"
            />
          </Field>
          <Field label="Data di nascita">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="bg-transparent text-right text-base text-label outline-none"
            />
          </Field>
          {age !== null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-label-secondary">Età</span>
              <span className="text-sm font-medium text-label">{age} anni</span>
            </div>
          )}
          <Field label="Sesso">
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | "")}
              className="bg-transparent text-right text-base text-label outline-none"
            >
              <option value="">—</option>
              {(Object.keys(SEX_LABELS) as Sex[]).map((k) => (
                <option key={k} value={k}>{SEX_LABELS[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Livello attività">
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel | "")}
              className="bg-transparent text-right text-base text-label outline-none"
            >
              <option value="">—</option>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-2 px-1 text-[11px] leading-snug text-label-tertiary">
          Questi dati servono per calcolare le calorie bruciate in allenamenti,
          test e gare. Il peso viene salvato automaticamente in uno storico ad
          ogni modifica.
        </p>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {save.isPending ? "Salvataggio…" : "Salva dati"}
        </button>
      </section>

      <ul className="ios-list mt-6">
        <li>
          <Link to="/workouts" className="ios-list-row">
            <span className="min-w-0 flex-1 text-sm text-label">Le mie schede</span>
            <ChevronRight className="h-4 w-4 text-label-tertiary" />
          </Link>
        </li>
        <li>
          <Link to="/athletics" className="ios-list-row">
            <span className="min-w-0 flex-1 text-sm text-label">Atletica</span>
            <ChevronRight className="h-4 w-4 text-label-tertiary" />
          </Link>
        </li>
        <li>
          <a href="mailto:?subject=Feedback" className="ios-list-row">
            <Mail className="h-4 w-4 text-label-secondary" />
            <span className="min-w-0 flex-1 text-sm text-label">Feedback</span>
            <ChevronRight className="h-4 w-4 text-label-tertiary" />
          </a>
        </li>
      </ul>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/auth" });
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-fill py-3 text-base font-semibold text-danger active:scale-[0.97]"
      >
        <LogOut className="h-4 w-4" /> Esci
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-label">{label}</span>
      {children}
    </label>
  );
}
