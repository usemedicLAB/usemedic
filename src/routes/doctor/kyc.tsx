import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, type FormEvent, type DragEvent } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UploadCloud, ShieldCheck, ShieldAlert, Clock, CheckCircle2, FileText, X } from "lucide-react";

export const Route = createFileRoute("/doctor/kyc")({
  head: () => ({ meta: [{ title: "KYC verification — Medic" }] }),
  component: Kyc,
});

const DOC_TYPES = [
  { type: "license", label: "Medical license", required: true },
  { type: "gov_id", label: "Government ID", required: true },
  { type: "selfie", label: "Selfie holding ID", required: true },
  { type: "certificate", label: "Certificates (optional)", required: false },
] as const;

type DocType = (typeof DOC_TYPES)[number]["type"];
type DoctorDocument = { id: string; type: DocType; file_path: string };

function Kyc() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["doctor-profile", user?.id],
    queryFn: async () => (await supabase.from("doctor_profiles").select("*").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const { data: docs } = useQuery({
    queryKey: ["doctor-docs", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("doctor_documents").select("id, type, file_path").eq("doctor_id", user!.id);
      return (data ?? []) as DoctorDocument[];
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    specialty: "", years_exp: 0, fee: 0, location: "", license_number: "", bio: "",
  });
  useEffect(() => {
    if (!profile) return;
    setForm({
      specialty: profile.specialty ?? "",
      years_exp: profile.years_exp ?? 0,
      fee: Number(profile.fee ?? 0),
      location: profile.location ?? "",
      license_number: profile.license_number ?? "",
      bio: profile.bio ?? "",
    });
  }, [profile]);

  const status = profile?.kyc_status ?? "pending";
  const StatusBanner = () => {
    if (status === "approved") return (
      <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-primary-deep">
        <ShieldCheck className="h-5 w-5" />
        <div><p className="font-semibold">Verified</p><p className="text-xs">You're listed in the doctor directory.</p></div>
      </div>
    );
    if (status === "rejected") return (
      <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-destructive">
        <ShieldAlert className="h-5 w-5" />
        <div><p className="font-semibold">Action needed</p><p className="text-xs">{profile?.kyc_notes ?? "Please update your documents and resubmit."}</p></div>
      </div>
    );
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-muted p-4">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div><p className="font-semibold">Pending review</p><p className="text-xs text-muted-foreground">Submit your details to get verified within 24–48h.</p></div>
      </div>
    );
  };

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("doctor_profiles").upsert({
        user_id: user.id,
        specialty: form.specialty,
        years_exp: Number(form.years_exp) || 0,
        fee: Number(form.fee) || 0,
        location: form.location,
        license_number: form.license_number,
        bio: form.bio,
        kyc_status: status === "approved" ? "approved" : "pending",
      });
      if (error) throw error;
      toast.success("Saved. We'll review shortly.");
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell role="doctor">
      <PageHeader title="KYC verification" subtitle="Verify your credentials to start consulting" />
      <div className="px-5 pt-5 pb-6">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <StatusBanner />

            <form onSubmit={submitProfile} className="mt-5 space-y-4">
              <div>
                <Label>Specialty</Label>
                <Input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="e.g. Cardiology" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Years experience</Label><Input type="number" min={0} max={70} value={form.years_exp} onChange={(e) => setForm({ ...form, years_exp: Number(e.target.value) })} className="mt-1.5 h-11 rounded-xl" /></div>
                <div><Label>Fee (₦)</Label><Input type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} className="mt-1.5 h-11 rounded-xl" /></div>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="City" /></div>
              <div><Label>License number</Label><Input required value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5 min-h-24 rounded-xl" placeholder="Tell patients about your experience" /></div>
              <Button type="submit" disabled={busy} variant="hero" className="w-full rounded-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold">Documents</p>
              <p className="text-xs text-muted-foreground -mt-2">Drag a file or tap to choose. Uploads start automatically. PDF or image, up to 8&nbsp;MB.</p>
              {DOC_TYPES.map((d) => (
                <DocDropzone
                  key={d.type}
                  doc={d}
                  existing={(docs ?? []).filter((x) => x.type === d.type)}
                  onChanged={() => qc.invalidateQueries({ queryKey: ["doctor-docs"] })}
                  userId={user?.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function DocDropzone({ doc, existing, onChanged, userId }: {
  doc: { type: DocType; label: string; required: boolean };
  existing: DoctorDocument[];
  onChanged: () => void;
  userId?: string;
}) {
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!userId) { toast.error("Not signed in"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("File must be under 8 MB"); return; }
    setUploading(true);
    setProgress(`Uploading ${file.name}…`);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${userId}/${doc.type}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("doctor-kyc")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (upErr) throw upErr;
      const { error: dErr } = await supabase
        .from("doctor_documents")
        .insert({ doctor_id: userId, type: doc.type, file_path: path });
      if (dErr) throw dErr;
      toast.success(`${doc.label} uploaded`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (rec: DoctorDocument) => {
    try {
      await supabase.storage.from("doctor-kyc").remove([rec.file_path]);
      const { error } = await supabase.from("doctor_documents").delete().eq("id", rec.id);
      if (error) throw error;
      toast.success("Removed");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const hasFiles = existing.length > 0;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${over ? "border-primary bg-primary-soft" : hasFiles ? "border-border bg-card" : "border-border bg-surface"}`}
    >
      <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-3 text-left">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${hasFiles ? "bg-primary text-white" : "bg-primary-soft text-primary"}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasFiles ? <CheckCircle2 className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {doc.label}{doc.required && <span className="ml-1 text-destructive">*</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {progress ?? (hasFiles ? `${existing.length} file(s) uploaded — drop to add another` : "Drag & drop or tap to choose")}
          </p>
        </div>
      </button>

      {hasFiles && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {existing.map((rec) => (
            <li key={rec.id} className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-[11px]">{rec.file_path.split("/").pop()}</span>
              <button type="button" onClick={() => remove(rec)} className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
    </div>
  );
}
