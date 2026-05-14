import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/consultations/")({
  head: () => ({ meta: [{ title: "Chats — Medic" }] }),
  component: List,
});

function List() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-consultations"],
    queryFn: async () => {
      // appointments with consultations
      const { data: appts } = await supabase.rpc("my_appointments");
      const ids = (appts ?? []).map((a: any) => a.id);
      if (ids.length === 0) return [];
      const { data: cons } = await supabase.from("consultations").select("id, appointment_id, started_at").in("appointment_id", ids);
      const byAppt = new Map((cons ?? []).map((c: any) => [c.appointment_id, c]));
      return (appts ?? [])
        .map((a: any) => ({ a, c: byAppt.get(a.id) }))
        .filter((x: any) => x.c)
        .sort((x: any, y: any) => new Date(y.c.started_at).getTime() - new Date(x.c.started_at).getTime());
    },
    enabled: !!user,
  });

  return (
    <MobileShell role="user">
      <PageHeader title="Chats" subtitle="Pick up where you left off" />
      <div className="px-5 pt-5">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No active conversations.</p>
          </div>
        )}
        <div className="space-y-2">
          {data?.map(({ a, c }: any) => (
            <Link key={c.id} to="/consultations/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                {(a.doctor_name ?? "Dr").slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.doctor_name ?? "Doctor"}</p>
                <p className="truncate text-xs text-muted-foreground">{a.specialty ?? "Consultation"} · {new Date(c.started_at).toLocaleDateString()}</p>
              </div>
              <MessageCircle className="h-4 w-4 text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
