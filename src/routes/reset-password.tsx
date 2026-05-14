import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MedicLogo } from "@/components/medic-logo";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Medic" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { resetPassword } = useAuth();
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setRecovery(true);
  }, []);

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await resetPassword(email.trim());
    setBusy(false);
    if (error) toast.error(error); else toast.success("Reset link sent. Check your email.");
  };
  const updatePwd = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated. You're signed in."); window.location.href = "/"; }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
        <MedicLogo />
        <div className="mt-10">
          <h1 className="font-display text-3xl font-bold">{recovery ? "Set a new password" : "Reset your password"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{recovery ? "Pick something strong you'll remember." : "We'll email you a secure link."}</p>
        </div>
        {recovery ? (
          <form onSubmit={updatePwd} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="pwd">New password</Label>
              <Input id="pwd" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="xl" className="w-full rounded-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </Button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="xl" className="w-full rounded-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
            </Button>
          </form>
        )}
        <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
