import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";

import { supabase } from "@/integrations/supabase/client";
import { Search, Star, Video, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctors/")({
  head: () => ({ meta: [{ title: "Find a doctor — Medic" }] }),
  component: Doctors,
});

function Doctors() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["approved-doctors"],
    queryFn: async () => {
      const { data: doctors, error: doctorsError } = await supabase
        .from("doctor_profiles")
        .select("user_id, specialty, fee, location, years_exp, rating, reviews_count")
        .eq("kyc_status", "approved")
        .order("rating", { ascending: false })
        .limit(50);
      if (doctorsError) throw doctorsError;

      const ids = (doctors ?? []).map((doctor) => doctor.user_id);
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return (doctors ?? []).map((doctor) => ({ ...doctor, profile: profilesById.get(doctor.user_id) ?? null }));
    },
  });

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((doctor: any) => [
      doctor.profile?.full_name,
      doctor.specialty,
      doctor.location,
    ].some((value) => String(value ?? "").toLowerCase().includes(term)));
  }, [data, search]);

  return (
    <MobileShell role="user">
      <PageHeader title="Find a doctor" subtitle="Verified specialists ready to consult" />
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-soft)]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-6 flex-1 bg-transparent text-sm outline-none" placeholder="Search by name, specialty…" />
        </div>

        <div className="mt-5 space-y-3">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && error && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load verified doctors. Please try again.</p>
            </div>
          )}
          {!isLoading && !error && (data?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">No verified doctors yet. Check back soon.</p>
            </div>
          )}
          {!isLoading && !error && (data?.length ?? 0) > 0 && filteredDoctors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">No doctors match your search.</p>
            </div>
          )}
          {filteredDoctors.map((d: any) => (
            <Link
              key={d.user_id}
              to="/doctors/$id"
              params={{ id: d.user_id }}
              className="block rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition active:scale-[0.99] hover:border-primary/40"
            >
              <article>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary">
                    {d.profile?.avatar_url
                      ? <img src={d.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (d.profile?.full_name ?? "Dr").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.profile?.full_name ?? "Doctor"}</p>
                    <p className="text-xs text-muted-foreground">{d.specialty ?? "General"} · {d.years_exp ?? 0}y exp.</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {Number(d.rating ?? 0).toFixed(1)} ({d.reviews_count ?? 0})</span>
                      {d.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From</div>
                    <div className="font-semibold">₦{Number(d.fee ?? 0).toLocaleString()}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    <Video className="h-3.5 w-3.5" /> View profile
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
