import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/doctor/consultations")({
  head: () => ({ meta: [{ title: "Consultations — Medic" }] }),
  component: List,
});

function List() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["doctor-consults"],
    queryFn: async () => {
      const { data: appts } = await supabase.from("appointments").select("id, patient_id, scheduled_at").eq("doctor_id", user!.id);
      const ids = (appts ?? []).map((a: any) => a.id);
      if (!ids.length) return [];
      const [{ data: cons }, { data: profs }] = await Promise.all([
        supabase.from("consultations").select("id, appointment_id, started_at").in("appointment_id", ids),
        supabase.from("profiles").select("id, full_name").in("id", (appts ?? []).map((a: any) => a.patient_id)),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const apptMap = new Map((appts ?? []).map((a: any) => [a.id, a]));
      return (cons ?? []).map((c: any) => ({
        c, patient_name: profMap.get(apptMap.get(c.appointment_id)?.patient_id) ?? "Patient",
      })).sort((a: any, b: any) => new Date(b.c.started_at).getTime() - new Date(a.c.started_at).getTime());
    },
    enabled: !!user,
  });

  return (
    <MobileShell role="doctor">
      <PageHeader title="Consultations" subtitle="Your active conversations" />
      <div className="px-5 pt-5 space-y-2">
        {(data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No active conversations.</p>
          </div>
        )}
        {data?.map(({ c, patient_name }: any) => (
          <Link key={c.id} to="/doctor/consultations/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
              {patient_name.slice(0,2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{patient_name}</p>
              <p className="text-xs text-muted-foreground">Started {new Date(c.started_at).toLocaleDateString()}</p>
            </div>
            <MessageCircle className="h-4 w-4 text-primary" />
          </Link>
        ))}
      </div>
    </MobileShell>
  );
}
