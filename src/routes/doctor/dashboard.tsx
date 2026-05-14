import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, Clock, Calendar, MessageCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/doctor/dashboard")({
  head: () => ({ meta: [{ title: "Doctor dashboard — Medic" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["doctor-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("doctor_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const { data: meProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const fullName = meProfile?.full_name || user?.email?.split("@")[0] || "Doctor";

  const { data: appts } = useQuery({
    queryKey: ["doctor-today-appts", user?.id],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, mode, fee, reason, patient_id")
        .eq("doctor_id", user!.id)
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: revenue } = useQuery({
    queryKey: ["doctor-revenue", user?.id],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("appointments")
        .select("fee, status")
        .eq("doctor_id", user!.id)
        .gte("scheduled_at", since.toISOString());
      return (data ?? []).filter((a) => a.status === "completed").reduce((s, a) => s + Number(a.fee ?? 0), 0);
    },
    enabled: !!user,
  });

  const status = profile?.kyc_status ?? "pending";

  const initials = fullName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const openConsultation = async (appointmentId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_consultation", { _appointment_id: appointmentId });
    if (!error && data) nav({ to: "/doctor/consultations/$id", params: { id: data as string } });
  };

  return (
    <MobileShell role="doctor">
      <div className="flex items-center gap-3 px-5 pt-8">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-white shadow-[var(--shadow-glow)]">
          {meProfile?.avatar_url ? <img src={meProfile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <p className="font-display text-[17px] font-bold leading-tight truncate">Dr. {fullName}</p>
        </div>
      </div>
      <PageHeader title="Today" subtitle="Your dashboard" />
      <div className="px-5 pt-5">
        {status !== "approved" && (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft p-4">
            <div className="flex items-start gap-3">
              {status === "rejected" ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-primary" />}
              <div>
                <p className="font-semibold text-primary-deep">
                  {status === "rejected" ? "KYC needs attention" : "KYC under review"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {status === "rejected"
                    ? profile?.kyc_notes ?? "Please resubmit your documents."
                    : "We typically verify within 24–48 hours. You'll be listed once approved."}
                </p>
                <Button asChild size="sm" variant="hero" className="mt-3 rounded-full">
                  <Link to="/doctor/kyc">{status === "rejected" ? "Resubmit" : "Review submission"}</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Kpi label="Today" value={String(appts?.length ?? 0)} Icon={Calendar} />
          <Kpi label="Patients" value={String(profile?.patients_count ?? 0)} Icon={MessageCircle} />
          <Kpi label="Rating" value={Number(profile?.rating ?? 0).toFixed(1)} Icon={ShieldCheck} />
          <Kpi label="30d revenue" value={`₦${Number(revenue ?? 0).toLocaleString()}`} Icon={Wallet} />
        </div>

        <h2 className="mt-6 font-display text-base font-bold">Today's appointments</h2>
        <div className="mt-3 space-y-2">
          {(appts?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">No appointments yet today.</p>
            </div>
          )}
          {appts?.map((a: any) => (
            <button
              key={a.id}
              type="button"
              onClick={() => openConsultation(a.id)}
              className="block rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-deep">
                  {a.mode}
                </span>
              </div>
              {a.reason && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.reason}</p>}
            </button>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

function Kpi({ label, value, Icon }: { label: string; value: string; Icon: typeof Calendar }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
