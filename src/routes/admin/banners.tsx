import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners — Admin" }] }),
  component: AdminBanners,
});

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

function AdminBanners() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", subtitle: "", cta_label: "", cta_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners" as any).select("*").order("created_at", { ascending: false });
      return (data ?? []) as unknown as Banner[];
    },
  });

  const create = async () => {
    if (!user) return;
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("banners").upload(path, file, { upsert: true });
      if (up.error) { setBusy(false); toast.error(up.error.message); return; }
      image_url = supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("banners" as any).insert({ ...form, image_url, active: true, created_by: user.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Banner added");
    setForm({ title: "", subtitle: "", cta_label: "", cta_url: "" });
    setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  };

  const toggle = async (b: Banner) => {
    await supabase.from("banners" as any).update({ active: !b.active }).eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  };

  const remove = async (b: Banner) => {
    await supabase.from("banners" as any).delete().eq("id", b.id);
    qc.invalidateQueries({ queryKey: ["admin-banners"] });
    qc.invalidateQueries({ queryKey: ["active-banner"] });
  };

  return (
    <MobileShell role="admin">
      <PageHeader title="Banners" subtitle="Home page ads" />
      <div className="px-5 pt-5 pb-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
          <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1.5 h-11 rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="Learn more" /></div>
            <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="https://…" /></div>
          </div>
          <div>
            <Label>Flyer image (optional)</Label>
            <label className="mt-1.5 flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface text-sm text-muted-foreground hover:border-primary/50">
              <Upload className="h-4 w-4" /> {file?.name ?? "Choose image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Button onClick={create} disabled={busy} variant="hero" className="w-full rounded-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish banner
          </Button>
        </div>

        <div className="space-y-2">
          {(banners ?? []).map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex gap-3">
                {b.image_url && <img src={b.image_url} alt="" className="h-16 w-24 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.title || "(no title)"}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={b.active} onCheckedChange={() => toggle(b)} />
                  <button onClick={() => remove(b)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {(banners ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
              No banners yet.
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
