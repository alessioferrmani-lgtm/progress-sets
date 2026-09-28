import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/home";
}
export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: safeNext(search.next) });
  }, component: AuthPage,
});
function AuthPage() {
  const { next } = Route.useSearch();
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6">
    <section className="ios-card w-full max-w-sm p-7 text-center">
      <img src="/progress-sets-track-flame-icon-192.png" alt="" className="mx-auto size-24 rounded-[24px]" />
      <h1 className="mt-5 text-3xl font-bold text-label">Progress Sets</h1>
      <p className="mt-3 text-sm leading-relaxed text-label-secondary">Le tue schede, l’atletica e i tuoi progressi. Ora su ChatGPT Sites.</p>
      <a href={`/signin-with-chatgpt?return_to=${encodeURIComponent(safeNext(next))}`} target="_top" className="ios-btn-primary mt-7 block w-full">Accedi con ChatGPT</a>
      <p className="mt-4 text-xs leading-relaxed text-label-tertiary">Allenamenti e routine vengono salvati nel tuo account. Non serve una nuova password.</p>
    </section>
  </main>;
}
