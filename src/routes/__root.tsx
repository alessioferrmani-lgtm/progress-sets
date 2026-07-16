import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-label">404</h1>
        <p className="mt-2 text-sm text-label-secondary">Pagina non trovata.</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-label">Qualcosa è andato storto</h1>
        <p className="mt-2 text-sm text-label-secondary">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Riprova
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#F2F2F7" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Progress Sets" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "Progress Sets" },
      {
        name: "description",
        content:
          "Esecuzione guidata delle tue schede di palestra con timer di recupero automatico.",
      },
      { property: "og:title", content: "Allenamento Palestra" },
      {
        property: "og:description",
        content:
          "Esecuzione guidata delle tue schede di palestra con timer di recupero automatico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Allenamento Palestra" },
      {
        name: "twitter:description",
        content:
          "Esecuzione guidata delle tue schede di palestra con timer di recupero automatico.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7ddef21f-908b-4324-8336-5d4097dff2af/id-preview-26ad09ce--bf4c054a-13cc-4df5-8378-9f7f31ff86b3.lovable.app-1783668719085.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7ddef21f-908b-4324-8336-5d4097dff2af/id-preview-26ad09ce--bf4c054a-13cc-4df5-8378-9f7f31ff86b3.lovable.app-1783668719085.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeManager() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return null;
}

function AuthInvalidator() {
  const router = useRouter();
  useQuery({
    queryKey: ["__auth_boot"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id ?? null;
    },
    staleTime: Infinity,
  });
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <AuthInvalidator />
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
