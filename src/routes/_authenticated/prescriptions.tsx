import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  head: () => ({ meta: [{ title: "Prescriptions — Medic" }] }),
  component: List,
});

function List() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-rx"],
    queryFn: async () => {
      const { data } = await supabase.from("prescriptions").select("id, items, issued_at, doctor_id").eq("patient_id", user!.id).order("issued_at", { ascending: false });
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.doctor_id)));
      const { data: docs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] } as any;
      const map = new Map((docs ?? []).map((d: any) => [d.id, d.full_name]));
      return (data ?? []).map((r: any) => ({ ...r, doctor_name: map.get(r.doctor_id) ?? "Doctor" }));
    },
    enabled: !!user,
  });

  return (
    <MobileShell role="user">
      <PageHeader title="Prescriptions" subtitle="Your e-prescriptions" />
      <div className="px-5 pt-5 space-y-3">
        {(data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No prescriptions yet.</p>
          </div>
        )}
        {data?.map((r: any) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{r.doctor_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.issued_at).toLocaleString()}</p>
              </div>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {(r.items ?? []).map((it: any, i: number) => (
                <li key={i} className="rounded-lg bg-surface p-2">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{it.dosage} · {it.frequency} · {it.duration}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </MobileShell>
  );
}
