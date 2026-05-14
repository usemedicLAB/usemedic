import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users } from "lucide-react";

export const Route = createFileRoute("/doctor/patients")({
  head: () => ({ meta: [{ title: "Patients — Medic" }] }),
  component: Patients,
});

function Patients() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-patients"],
    queryFn: async () => {
      const { data: appts } = await supabase.from("appointments").select("patient_id, scheduled_at").eq("doctor_id", user!.id);
      const map = new Map<string, { last: string; count: number }>();
      for (const a of appts ?? []) {
        const ex = map.get(a.patient_id);
        if (!ex || new Date(a.scheduled_at) > new Date(ex.last)) map.set(a.patient_id, { last: a.scheduled_at, count: (ex?.count ?? 0) + 1 });
        else map.set(a.patient_id, { ...ex, count: ex.count + 1 });
      }
      const ids = Array.from(map.keys());
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      return (profs ?? []).map((p: any) => ({ ...p, ...map.get(p.id)! }));
    },
    enabled: !!user,
  });

  return (
    <MobileShell role="doctor">
      <PageHeader title="Patients" subtitle="People you've consulted with" />
      <div className="px-5 pt-5 space-y-2">
        {(data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No patients yet.</p>
          </div>
        )}
        {data?.map((p: any) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
              {(p.full_name ?? "P").slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.full_name ?? "Patient"}</p>
              <p className="text-xs text-muted-foreground">{p.count} visit(s) · last {new Date(p.last).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
