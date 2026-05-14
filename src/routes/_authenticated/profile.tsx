import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, FileText, Loader2, Camera, Upload, Trash2, FileImage } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Medic" }] }),
  component: Profile,
});

function Profile() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", dob: "", gender: "" });
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", dob: profile.dob ?? "", gender: profile.gender ?? "" });
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form, dob: form.dob || null });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["my-profile"] }); }
  };

  const upload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Avatar updated");
  };

  const initials = (form.full_name || user?.email || "U").slice(0, 2).toUpperCase();
  return (
    <MobileShell role="user">
      <PageHeader title="Profile" />
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
            <div><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
          </div>
          <div><Label>Gender</Label><Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="Female / Male / Other" /></div>
          <Button onClick={save} disabled={busy} variant="hero" className="w-full rounded-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <Link to="/prescriptions" className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><FileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Prescriptions</p>
              <p className="text-xs text-muted-foreground">Your e-prescriptions</p>
            </div>
          </Link>
        </div>

        <MedicalRecords userId={user!.id} />

        <Button onClick={signOut} variant="outline" className="mt-6 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </MobileShell>
  );
}

interface RecordRow { id: string; title: string | null; type: string; file_path: string | null; created_at: string; }

function MedicalRecords({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");

  const { data: records } = useQuery({
    queryKey: ["my-records", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("medical_records")
        .select("id, title, type, file_path, created_at")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []) as RecordRow[];
    },
  });

  const upload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) { toast.error("Max 15 MB"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("medical-records").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("medical_records").insert({
        patient_id: userId,
        uploaded_by: userId,
        type: file.type.startsWith("image/") ? "image" : "document",
        title: title.trim() || file.name,
        file_path: path,
      });
      if (error) throw error;
      setTitle("");
      qc.invalidateQueries({ queryKey: ["my-records", userId] });
      toast.success("Record uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: RecordRow) => {
    if (r.file_path) await supabase.storage.from("medical-records").remove([r.file_path]);
    await supabase.from("medical_records").delete().eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["my-records", userId] });
  };

  const open = async (r: RecordRow) => {
    if (!r.file_path) return;
    const { data } = await supabase.storage.from("medical-records").createSignedUrl(r.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="mt-6">
      <h2 className="font-display text-base font-bold">Medical records</h2>
      <p className="mt-1 text-xs text-muted-foreground">Lab results, scans, past notes. Visible to your doctor during consultations.</p>
      <div className="mt-3 rounded-2xl border border-border bg-card p-3 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title (e.g. Blood test Aug 2025)" className="h-10 rounded-xl" />
        <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface text-sm text-muted-foreground hover:border-primary/50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload file (PDF or image)"}
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
        </label>
      </div>

      <div className="mt-3 space-y-2">
        {(records ?? []).map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {r.type === "image" ? <FileImage className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <button onClick={() => open(r)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold">{r.title || r.type}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </button>
            <button onClick={() => remove(r)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {(records ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">
            No records yet.
          </div>
        )}
      </div>
    </div>
  );
}
