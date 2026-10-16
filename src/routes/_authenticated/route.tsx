import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { RestTimerBar } from "@/components/RestTimerBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { InterruptedWorkoutPrompt } from "@/components/InterruptedWorkoutPrompt";
import { SitesAgentTools } from "@/components/SitesAgentTools";

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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const detailWithoutTabs = pathname.includes("/sessions/") || /\/workouts\/.*\/(?:edit|new)\/?$/.test(pathname);
  const immersiveWorkout = /^\/workouts\/(?:free|[^/]+\/run)\/?$/.test(pathname);

  return (
    <div
      className={
        immersiveWorkout
          ? "pryme-app-shell pryme-app-immersive min-h-screen bg-background"
          : `pryme-app-shell ${detailWithoutTabs ? "pryme-app-detail" : "pryme-app-tabs"} min-h-screen bg-background`
      }
    >
      <div className="pryme-page-scroll"><Outlet /></div>
      <SitesAgentTools />
      <RestTimerBar />
      <BottomTabBar />
      <InterruptedWorkoutPrompt />
    </div>
  );
}
