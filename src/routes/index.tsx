import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MedicLogo } from "@/components/medic-logo";
import { useAuth, homePathFor } from "@/hooks/use-auth";
import { Check, Ambulance, Stethoscope, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medic — See a doctor in minutes, from anywhere" },
      { name: "description", content: "Chat, voice or video consultations with verified specialists. Book in-person visits, get e-prescriptions, and manage your medical history — all in one place." },
      { property: "og:title", content: "Medic — See a doctor in minutes, from anywhere" },
      { property: "og:description", content: "Chat, voice or video consultations with verified specialists. Book in-person visits, get e-prescriptions, and manage your medical history — all in one place." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, primaryRole, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user && primaryRole) nav({ to: homePathFor(primaryRole) });
  }, [user, primaryRole, loading, nav]);

  return (
    <div className="min-h-[100dvh] bg-[image:var(--gradient-hero)] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-between gap-8 px-6 py-8">
        {/* Brand */}
        <header className="flex items-center justify-between">
          <MedicLogo variant="white" />
          <Link to="/login" className="text-xs font-medium text-white/85 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </header>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3">
          <article className="rounded-3xl bg-white p-5 text-foreground shadow-2xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white">
              <Stethoscope className="h-4.5 w-4.5" />
            </div>
            <p className="mt-4 font-display text-base font-bold leading-tight">Care from afar</p>
            <p className="mt-1 text-xs text-muted-foreground">Verified doctors, on demand.</p>
          </article>
          <article className="rounded-3xl bg-rose-500 p-5 text-white shadow-2xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15">
              <Ambulance className="h-4.5 w-4.5" />
            </div>
            <p className="mt-4 font-display text-base font-bold leading-tight">Emergency 24/7</p>
            <p className="mt-1 text-xs text-white/85">Rapid ambulance response.</p>
          </article>
        </div>

        {/* Hero copy + CTA */}
        <div className="text-center">
          <h1 className="mx-auto max-w-sm font-display text-[26px] font-extrabold leading-[1.1] tracking-tight">
            See a doctor in minutes, from anywhere.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-white/85">
            Chat, voice or video with verified specialists. Book visits, get e-prescriptions, manage your records.
          </p>

          <Button asChild size="xl" className="mt-6 h-13 w-full rounded-full bg-white text-primary-deep shadow-xl hover:bg-white/95">
            <Link to="/signup">Get Started</Link>
          </Button>

          {/* Trust strip */}
          <ul className="mt-5 flex items-center justify-center gap-4 text-[11px] text-white/80">
            <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Verified</li>
            <li className="h-3 w-px bg-white/25" />
            <li className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 24/7</li>
            <li className="h-3 w-px bg-white/25" />
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> HIPAA-aware</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
