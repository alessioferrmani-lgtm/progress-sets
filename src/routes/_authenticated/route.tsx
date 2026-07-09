import {
  Outlet,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { RestTimerBar } from "@/components/RestTimerBar";
import { BottomTabBar } from "@/components/BottomTabBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname },
      });
    }
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+72px)]">
      <Outlet />
      <RestTimerBar />
      <BottomTabBar />
    </div>
  );
}
