import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, LogOut, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

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
          <div className="truncate text-base font-semibold text-label">{email}</div>
          <div className="text-xs text-label-secondary">Account</div>
        </div>
      </div>

      <ul className="ios-list mt-4">
        <li>
          <Link to="/workouts" className="ios-list-row">
            <ChevronRight className="h-4 w-4 text-label-tertiary" />
            <span className="min-w-0 flex-1 text-sm text-label">Le mie schede</span>
            <ChevronRight className="h-4 w-4 text-label-tertiary" />
          </Link>
        </li>
        <li>
          <a href={`mailto:?subject=Feedback`} className="ios-list-row">
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
