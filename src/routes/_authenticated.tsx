import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, homePathFor } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({ component: Gate });

function Gate() {
  const { user, loading, primaryRole } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (primaryRole && primaryRole !== "user") {
      nav({ to: homePathFor(primaryRole), replace: true });
    }
  }, [user, loading, primaryRole, nav]);
  if (loading || !user) return null;
  if (primaryRole && primaryRole !== "user") return null;
  return <Outlet />;
}

