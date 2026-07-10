import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/athletics/")({
  beforeLoad: () => {
    throw redirect({ to: "/athletics/tests" });
  },
});
