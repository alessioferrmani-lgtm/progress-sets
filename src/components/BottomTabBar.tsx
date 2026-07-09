import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Dumbbell, User } from "lucide-react";
import type { ComponentType } from "react";

type Tab = {
  to: "/home" | "/workouts" | "/profile";
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/workouts", label: "Schede", icon: Dumbbell },
  { to: "/profile", label: "Profilo", icon: User },
];

export function BottomTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Hide during workout run / summary (immersive screens)
  if (
    pathname.includes("/workouts/") &&
    (pathname.endsWith("/run") || pathname.endsWith("/edit") || pathname.endsWith("/new"))
  )
    return null;
  if (pathname.includes("/sessions/")) return null;

  return (
    <nav className="ios-tabbar fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active =
            tab.to === "/home"
              ? pathname === "/home" || pathname === "/"
              : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
              style={{ color: active ? "var(--color-accent)" : "var(--color-label-secondary)" }}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
