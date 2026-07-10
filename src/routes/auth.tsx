Exit code: 0
Wall time: 0.5 seconds
Output:
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/home` },
            });
      if (error) throw error;
      toast.success(mode === "signin" ? "Bentornato!" : "Account creato");
      navigate({ to: next && next.startsWith("/") ? next : "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/home` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile accedere con Google");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="ios-card w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-label">Allenamento Palestra</h1>
        <p className="mt-1 text-sm text-label-secondary">
          {mode === "signin" ? "Accedi al tuo account" : "Crea un nuovo account"}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-fill-secondary px-4 py-3 text-base text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-fill-secondary px-4 py-3 text-base text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="ios-btn-primary w-full"
          >
            {loading ? "..." : mode === "signin" ? "Accedi" : "Registrati"}
          </button>
          <div className="flex items-center gap-3 py-1 text-xs text-label-tertiary">
            <span className="h-px flex-1 bg-separator" /> oppure <span className="h-px flex-1 bg-separator" />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={signInWithGoogle}
            className="w-full rounded-xl border border-separator bg-background px-4 py-3 text-base font-medium text-label active:opacity-70 disabled:opacity-50"
          >
            Accedi con Google
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-accent"
        >
          {mode === "signin"
            ? "Non hai un account? Registrati"
            : "Hai giÃ  un account? Accedi"}
        </button>
      </div>
    </div>
  );
}

