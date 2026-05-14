import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Star, MapPin, Award, Users, Calendar } from "lucide-react";
import { AvatarDisplay } from "@/components/ui/avatar-display";

export const Route = createFileRoute("/_authenticated/doctors/$id")({
  head: () => ({ meta: [{ title: "Doctor — Medic" }] }),
  component: DoctorProfile,
});

function DoctorProfile() {
  const { id } = useParams({ from: "/_authenticated/doctors/$id" });
  const { data, isLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => {
      const { data: dp, error: dpError } = await supabase
        .from("doctor_profiles")
        .select("user_id, specialty, bio, fee, location, years_exp, languages, rating, reviews_count, patients_count")
        .eq("user_id", id)
        .eq("kyc_status", "approved")
        .maybeSingle();
      if (dpError) throw dpError;
      const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", id).maybeSingle();
      if (profileError) throw profileError;
      const { data: avail } = await supabase.from("doctor_availability").select("weekday, start_time, end_time").eq("doctor_id", id);
      const { data: reviews } = await supabase.from("reviews").select("rating, comment, created_at, patient_id").eq("doctor_id", id).order("created_at", { ascending: false }).limit(10);
      return { d: dp ? { ...dp, profile } : null, avail: avail ?? [], reviews: reviews ?? [] };
    },
  });

  if (isLoading) return <MobileShell role="user"><div className="p-10 text-center text-sm text-muted-foreground">Loading…</div></MobileShell>;
  if (!data?.d) return <MobileShell role="user"><div className="p-10 text-center"><p className="text-sm text-muted-foreground">Doctor not found.</p><Button asChild variant="hero" className="mt-4 rounded-full"><Link to="/doctors">Back</Link></Button></div></MobileShell>;
  const d: any = data.d;
  const fullName = d.profile?.full_name || "Doctor";

  return (
    <MobileShell role="user">
      {/* Hero */}
      <div className="relative bg-[image:var(--gradient-hero)] px-5 pt-6 pb-24 text-white">
        <div className="flex items-center justify-between">
          <Link to="/doctors" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-5 w-5" /></Link>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <AvatarDisplay url={d.profile?.avatar_url} className="h-20 w-20 rounded-2xl bg-white/20" fallbackClassName="bg-transparent" iconClassName="text-white/70" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-white/70">{d.specialty ?? "Specialist"}</p>
            <h1 className="font-display text-2xl font-bold leading-tight">{fullName}</h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/85">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-300 text-yellow-300" /> {Number(d.rating ?? 0).toFixed(1)}</span>
              {d.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.location}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="relative z-10 -mt-10 px-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Award, label: "Experience", value: `${d.years_exp ?? 0}y` },
            { Icon: Star, label: "Rating", value: Number(d.rating ?? 0).toFixed(1) },
            { Icon: Users, label: "Patients", value: d.patients_count ?? 0 },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-card p-3 text-center shadow-[var(--shadow-card)]">
              <Icon className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-1 text-base font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6 pb-48 space-y-6">
        <section>
          <h2 className="font-display font-bold">About</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{d.bio || "No bio provided yet."}</p>
        </section>

        <section>
          <h2 className="font-display font-bold">Availability</h2>
          {data.avail.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">Doctor hasn't set their hours yet.</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {data.avail.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-card p-2 text-xs">
                  <p className="font-semibold">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][s.weekday]}</p>
                  <p className="text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display font-bold">Reviews</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {data.reviews.map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-primary text-primary" /> {r.rating}/5</div>
                  {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-20 z-30 px-5">
        <div className="mx-auto max-w-md rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consultation fee</p>
            <p className="font-bold">₦{Number(d.fee ?? 0).toLocaleString()}</p>
          </div>
          <Button asChild variant="hero" size="lg" className="rounded-full">
            <Link to="/book/$doctorId" params={{ doctorId: id }}><Calendar className="h-4 w-4" /> Book now</Link>
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
