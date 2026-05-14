import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MedicLogo } from "@/components/medic-logo";
import { useAuth, homePathFor } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Medic" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, user, primaryRole, loading } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<"user" | "doctor">("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && primaryRole) nav({ to: homePathFor(primaryRole) });
  }, [user, primaryRole, loading, nav]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error, needsConfirm } = await signUp(email.trim(), password, fullName.trim(), role);
    setBusy(false);
    if (error) { toast.error(error); return; }
    if (needsConfirm) nav({ to: "/verify-email", search: { email: email.trim() } as never });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
        <MedicLogo />
        <div className="mt-8">
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Join Medic in less than a minute.</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {([
            { v: "user", label: "I'm a patient", Icon: UserIcon },
            { v: "doctor", label: "I'm a doctor", Icon: Stethoscope },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setRole(v)}
              className={cn(
                "flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-all",
                role === v ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <Icon className={cn("h-5 w-5", role === v ? "text-primary" : "text-muted-foreground")} />
              <span className="mt-2 text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters. Avoid leaked passwords.</p>
          </div>
          <Button type="submit" disabled={busy} variant="hero" size="xl" className="w-full rounded-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </form>

        <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
