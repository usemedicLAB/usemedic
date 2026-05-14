import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Loader2, Camera, Megaphone, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Profile — Admin" }] }),
  component: AdminProfile,
});

function AdminProfile() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["my-profile", user.id] }); }
  };

  const upload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
    toast.success("Avatar updated");
  };

  const initials = (form.full_name || user?.email || "A").slice(0, 2).toUpperCase();

  return (
    <MobileShell role="admin">
      <PageHeader title="Profile" subtitle="Admin account" />
      <div className="px-5 pt-6 pb-6">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <label className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[image:var(--gradient-primary)] text-lg font-bold text-white">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            <span className="absolute -bottom-0 -right-0 flex h-6 w-6 items-center justify-center rounded-full bg-card text-primary border border-border"><Camera className="h-3 w-3" /></span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </label>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{form.full_name || "Set your name"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
          <Button onClick={save} disabled={busy} variant="hero" className="w-full rounded-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>

        <Link to="/admin/settings" className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><SettingsIcon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Payments & settings</p>
            <p className="text-xs text-muted-foreground">Stripe keys and webhook</p>
          </div>
        </Link>

        <Link to="/admin/banners" className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Megaphone className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Home banners</p>
            <p className="text-xs text-muted-foreground">Upload flyers shown to patients</p>
          </div>
        </Link>

        <Button onClick={signOut} variant="outline" className="mt-6 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </MobileShell>
  );
}
