import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicLogo } from "@/components/medic-logo";
import { z } from "zod";

const search = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Verify your email — Medic" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { email } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
        <MedicLogo />
        <div className="mt-16 flex flex-1 flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-soft text-primary">
            <MailCheck className="h-10 w-10" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Check your inbox</h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{email ?? "your email"}</span>. Open it to activate your account, then come back and sign in.
          </p>
          <Button asChild variant="hero" size="xl" className="mt-10 w-full rounded-full">
            <Link to="/login">Continue to sign in</Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Didn't receive it? Check spam, or try again in a moment.</p>
        </div>
      </div>
    </div>
  );
}
