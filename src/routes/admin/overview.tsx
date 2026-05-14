import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { Users, Stethoscope, FileCheck2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/overview")({
  head: () => ({ meta: [{ title: "Admin overview — Medic" }] }),
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 7); since.setHours(0, 0, 0, 0);
      const [users, doctors, pending, apptsList, recentUsers, rxOrdersList, ambList] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("doctor_profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "approved"),
        supabase.from("doctor_profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("appointments").select("fee, paid_at"),
        supabase.from("profiles").select("created_at").gte("created_at", since.toISOString()),
        supabase.from("pharmacy_orders").select("total, paid_at"),
        supabase.from("ambulance_bookings").select("fee, status"),
      ]);

      let revenue = 0;
      (apptsList.data ?? []).forEach((a: any) => { if (a.paid_at) revenue += Number(a.fee ?? 0); });
      (rxOrdersList.data ?? []).forEach((r: any) => { if (r.paid_at) revenue += Number(r.total ?? 0); });
      (ambList.data ?? []).forEach((a: any) => { if (a.status === "completed") revenue += Number(a.fee ?? 0); });

      // Build 7-day series
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        buckets[d.toISOString().slice(5, 10)] = 0;
      }
      (recentUsers.data ?? []).forEach((r: any) => {
        const k = new Date(r.created_at).toISOString().slice(5, 10);
        if (k in buckets) buckets[k]++;
      });
      const series = Object.entries(buckets).map(([day, count]) => ({ day, count }));
      return {
        users: users.count ?? 0,
        doctors: doctors.count ?? 0,
        pending: pending.count ?? 0,
        appts: apptsList.data?.length ?? 0,
        rxOrders: rxOrdersList.data?.length ?? 0,
        ambBookings: ambList.data?.length ?? 0,
        revenue,
        series,
      };
    },
  });

  const cards = [
    { label: "Total Revenue", value: `₦${(data?.revenue ?? 0).toLocaleString()}`, Icon: Activity, color: "text-emerald-500" },
    { label: "Total Users", value: data?.users ?? 0, Icon: Users, color: "text-primary" },
    { label: "Verified Doctors", value: data?.doctors ?? 0, Icon: Stethoscope, color: "text-primary" },
    { label: "KYC Pending", value: data?.pending ?? 0, Icon: FileCheck2, color: "text-yellow-500" },
    { label: "Pharmacy Orders", value: data?.rxOrders ?? 0, Icon: Activity, color: "text-primary" },
    { label: "Appointments", value: data?.appts ?? 0, Icon: Activity, color: "text-primary" },
  ];

  return (
    <MobileShell role="admin">
      <PageHeader title="Overview" subtitle="Platform health at a glance" />
      <div className="px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {cards.map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <Icon className={cn("h-5 w-5", color)} />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{label}</span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <p className="font-display text-sm font-bold">Signups (7d)</p>
          <div className="mt-4 flex h-36 items-end gap-2">
            {(data?.series ?? []).map((point) => {
              const max = Math.max(1, ...(data?.series ?? []).map((item) => item.count));
              return (
                <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-full bg-primary-soft px-1">
                    <div
                      className="w-full rounded-full bg-primary"
                      style={{ height: `${Math.max(8, (point.count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{point.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
