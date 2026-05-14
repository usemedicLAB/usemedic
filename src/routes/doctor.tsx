import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, homePathFor } from "@/hooks/use-auth";

export const Route = createFileRoute("/doctor")({ component: Gate });

function Gate() {
  const { user, loading, primaryRole } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login" });
    else if (primaryRole && primaryRole !== "doctor") nav({ to: homePathFor(primaryRole), replace: true });
  }, [user, loading, primaryRole, nav]);
  if (loading || !user || !primaryRole) return null;
  if (primaryRole !== "doctor") return null;
  return <Outlet />;
}
