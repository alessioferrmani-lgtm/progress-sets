import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { RestTimerBar } from "@/components/RestTimerBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { InterruptedWorkoutPrompt } from "@/components/InterruptedWorkoutPrompt";

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
  const immersiveWorkout = /^\/workouts\/(?:free|[^/]+\/run)\/?$/.test(pathname);

  return (
    <div
      className={
        immersiveWorkout
          ? "min-h-screen bg-background"
          : "min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+72px)]"
      }
    >
      <Outlet />
      <RestTimerBar />
      <BottomTabBar />
      <InterruptedWorkoutPrompt />
    </div>
  );
}
