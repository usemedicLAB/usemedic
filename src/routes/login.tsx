import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MedicLogo } from "@/components/medic-logo";
import { useAuth, homePathFor } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Medic" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, primaryRole, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && primaryRole) nav({ to: homePathFor(primaryRole) });
  }, [user, primaryRole, loading, nav]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error, redirectTo } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Welcome back");
      window.setTimeout(() => {
        nav({ to: redirectTo ?? "/home", replace: true });
      }, 150);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-10">
        <MedicLogo />
        <div className="mt-10">
          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue your care journey.
          </p>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/reset-password" className="text-xs font-medium text-primary">
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-12 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            variant="hero"
            size="xl"
            className="w-full rounded-full"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
          </Button>
        </form>
        <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
          New to Medic?{" "}
          <Link to="/signup" className="font-semibold text-primary">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
