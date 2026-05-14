import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/mobile-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Heart, Brain, Baby, Bone, Sparkles, Stethoscope, Calendar, Star, LayoutGrid, Megaphone, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Medic" }] }),
  component: Home,
});

const SPECIALTIES = [
  { name: "Cardiology", Icon: Heart },
  { name: "Paediatrics", Icon: Baby },
  { name: "Neurology", Icon: Brain },
  { name: "Orthopaedics", Icon: Bone },
  { name: "Dermatology", Icon: Sparkles },
  { name: "General", Icon: Stethoscope },
];

function Home() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const fullName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const initials = fullName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <MobileShell role="user">
      <div className="px-5 pt-8">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-white shadow-[var(--shadow-glow)]">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hello</p>
              <p className="font-display text-[17px] font-bold leading-tight">{fullName}!</p>
            </div>
          </div>
          <button aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LayoutGrid className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
          <p className="px-2 text-[11px] font-semibold text-foreground/80">Looking for Doctors?</p>
          <Link to="/doctors" className="mt-1 flex items-center gap-2 px-2 py-1">
            <span className="flex-1 truncate text-sm text-muted-foreground">Search by name or department</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Search className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Promo / Ad slot */}
        <AdBanner />


        {/* Specialties */}
        <div className="mt-6 no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
          {SPECIALTIES.map(({ name, Icon }) => (
            <Link key={name} to="/doctors" className="flex min-w-[68px] flex-col items-center gap-1.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-semibold text-foreground/80">{name}</span>
            </Link>
          ))}
        </div>

        {/* Recent Visit */}
        <div className="mt-7 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-bold">My Recent Visit</h2>
          <Link to="/appointments" className="text-xs font-semibold text-primary">See All</Link>
        </div>
        <RecentVisits />

        {/* Schedule */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-bold">My Checkup Schedule</h2>
          <Link to="/appointments" className="text-xs font-semibold text-primary">See All</Link>
        </div>
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
          <Star className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled. We'll remind you when something's coming up.</p>
        </div>
      </div>
    </MobileShell>
  );
}

function RecentVisits() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-recent-appointments"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_appointments");
      return (data ?? []).slice(0, 5);
    },
  });

  if (isLoading) {
    return <div className="mt-3 h-28 animate-pulse rounded-2xl bg-surface" />;
  }
  if (!data || data.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted-foreground">No visits yet. Book your first consultation.</p>
        <Link to="/doctors" className="mt-2 inline-flex text-xs font-semibold text-primary">Find a doctor →</Link>
      </div>
    );
  }
  return (
    <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5">
      {data.map((a: any) => {
        const initials = (a.doctor_name ?? "Dr").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
        return (
          <Link key={a.id} to="/doctors/$id" params={{ id: a.doctor_id }} className="min-w-[240px] overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-soft text-sm font-bold text-primary">
                {a.doctor_avatar ? <img src={a.doctor_avatar} alt="" className="h-full w-full object-cover" /> : initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.doctor_name ?? "Doctor"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{a.specialty ?? "Specialist"}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(a.scheduled_at).toLocaleDateString()}</p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {a.mode === "video" ? <Video className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function AdBanner() {
  const { data: banner, isLoading, isFetching } = useQuery({
    queryKey: ["active-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners" as any)
        .select("title, subtitle, cta_label, cta_url, image_url")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { title?: string; subtitle?: string; cta_label?: string; cta_url?: string; image_url?: string } | null;
    },
    staleTime: 0,
  });

  if (isLoading || isFetching) {
    return (
      <div className="mt-5 h-40 overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="h-full w-full animate-pulse bg-[image:var(--gradient-soft)]" />
      </div>
    );
  }

  if (banner?.image_url) {
    return (
      <a href={banner.cta_url ?? "#"} target={banner.cta_url ? "_blank" : undefined} rel="noreferrer"
         className="mt-5 block overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-soft)]">
        <img src={banner.image_url} alt={banner.title ?? "Promotion"} className="h-40 w-full object-cover" />
      </a>
    );
  }

  return (
    <div className="relative mt-5 overflow-hidden rounded-3xl bg-[image:var(--gradient-hero)] p-5 text-white">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold leading-tight">{banner?.title ?? "Your health, our priority"}</p>
          <p className="mt-1 text-sm opacity-90">{banner?.subtitle ?? "Book trusted doctors in minutes."}</p>
          {banner?.cta_url ? (
            <a href={banner.cta_url} target="_blank" rel="noreferrer"
               className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary-deep">
              {banner.cta_label ?? "Learn more"}
            </a>
          ) : (
            <Link to="/doctors" className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary-deep">
              Find a doctor
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
