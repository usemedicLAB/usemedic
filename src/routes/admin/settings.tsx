import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: AdminSettings,
});

type Field = { key: string; label: string; placeholder: string; secret: boolean };

const PROVIDERS: { id: string; name: string; tagline: string; fields: Field[]; webhookPath: string; webhookHelp: string }[] = [
  {
    id: "stripe",
    name: "Stripe",
    tagline: "Cards globally · USD/EUR/GBP and many more",
    webhookPath: "/api/public/stripe-webhook",
    webhookHelp: "In Stripe → Developers → Webhooks, listen for checkout.session.completed",
    fields: [
      { key: "stripe_publishable_key", label: "Publishable key", placeholder: "pk_live_…", secret: false },
      { key: "stripe_secret_key", label: "Secret key", placeholder: "sk_live_…", secret: true },
      { key: "stripe_webhook_secret", label: "Webhook signing secret", placeholder: "whsec_…", secret: true },
      { key: "stripe_currency", label: "Currency (ISO 4217)", placeholder: "usd", secret: false },
    ],
  },
  {
    id: "paystack",
    name: "Paystack",
    tagline: "Best for Nigeria, Ghana, South Africa, Kenya",
    webhookPath: "/api/public/paystack-webhook",
    webhookHelp: "In Paystack → Settings → API & Webhooks, set this URL. Listens for charge.success",
    fields: [
      { key: "paystack_public_key", label: "Public key", placeholder: "pk_live_…", secret: false },
      { key: "paystack_secret_key", label: "Secret key", placeholder: "sk_live_…", secret: true },
      { key: "paystack_currency", label: "Currency", placeholder: "NGN", secret: false },
    ],
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    tagline: "Pan-Africa · multi-currency",
    webhookPath: "/api/public/flutterwave-webhook",
    webhookHelp: "In Flutterwave → Settings → Webhooks, paste this URL and a Secret hash; then add the same hash below",
    fields: [
      { key: "flutterwave_public_key", label: "Public key", placeholder: "FLWPUBK_…", secret: false },
      { key: "flutterwave_secret_key", label: "Secret key", placeholder: "FLWSECK_…", secret: true },
      { key: "flutterwave_webhook_secret", label: "Webhook secret hash", placeholder: "your-secret-hash", secret: true },
      { key: "flutterwave_currency", label: "Currency", placeholder: "NGN", secret: false },
    ],
  },
];

const ALL_KEYS = ["payment_provider", ...PROVIDERS.flatMap((p) => p.fields.map((f) => f.key))];

function AdminSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("stripe");

  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings" as any).select("key, value").in("key", ALL_KEYS);
      return (data ?? []) as unknown as Array<{ key: string; value: string }>;
    },
  });

  useEffect(() => {
    if (!data) return;
    const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
    setForm(map);
    if (map.payment_provider) setActiveTab(map.payment_provider);
  }, [data]);

  const activeProvider = form.payment_provider || "stripe";

  const save = async () => {
    setBusy(true);
    const keys = ["payment_provider", ...PROVIDERS.flatMap((p) => p.fields.map((f) => f.key))];
    const rows = keys.map((k) => ({ key: k, value: form[k] ?? "" }));
    const { error } = await supabase.from("app_settings" as any).upsert(rows);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["app-settings"] }); }
  };

  const setProvider = (id: string) => setForm((s) => ({ ...s, payment_provider: id }));

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <MobileShell role="admin">
      <PageHeader title="Settings" subtitle="Payments & integrations" />
      <div className="px-5 pt-5 pb-6 space-y-4">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Pick one active provider. Keys are stored in your database with admin-only access. You can pre-fill keys for several providers and only the active one will charge customers.</p>
          </div>
        </div>

        {/* Active provider selector */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Active provider</Label>
          <div className="grid grid-cols-1 gap-2">
            {PROVIDERS.map((p) => {
              const isActive = activeProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${isActive ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary/40"}`}
                >
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.tagline}</p>
                  </div>
                  {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Provider tabs */}
        <div className="flex rounded-full bg-muted p-1">
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => setActiveTab(p.id)} className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${activeTab === p.id ? "bg-card shadow" : ""}`}>
              {p.name}
            </button>
          ))}
        </div>

        {PROVIDERS.filter((p) => p.id === activeTab).map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <Label>Webhook URL (paste into {p.name})</Label>
              <Input
                readOnly
                value={`${origin}${p.webhookPath}`}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-1.5 h-11 rounded-xl font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{p.webhookHelp}</p>
            </div>
            {p.fields.map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  type={f.secret ? "password" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="mt-1.5 h-11 rounded-xl"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        ))}

        <Button onClick={save} disabled={busy} variant="hero" className="w-full rounded-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </Button>

        <PushSection origin={origin} />
      </div>
    </MobileShell>
  );
}

function PushSection({ origin }: { origin: string }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ publicKey: string; dispatchUrl: string; subject: string } | null>(null);
  const [subject, setSubject] = useState("");

  const init = async () => {
    setBusy(true);
    try {
      const { initPushConfig, getVapidPublicKey } = await import("@/lib/push.functions");
      const r = await initPushConfig({ data: { origin } });
      setInfo(r); setSubject(r.subject);
      toast.success("Push configured");
      // also refresh public key cache
      await getVapidPublicKey();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    setBusy(false);
  };
  const saveSubject = async () => {
    setBusy(true);
    try {
      const { updateVapidSubject } = await import("@/lib/push.functions");
      await updateVapidSubject({ data: { subject } });
      toast.success("Saved");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      const { sendTestPush } = await import("@/lib/push.functions");
      const r = await sendTestPush();
      toast.success(`Sent to ${r.sent}/${r.total} device(s)`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Web Push (VAPID)</p>
        <p className="text-[11px] text-muted-foreground">Real browser push notifications. Click once to generate keys.</p>
      </div>
      <Button onClick={init} disabled={busy} className="rounded-full" variant="outline">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Generate / refresh push config
      </Button>
      {info && (
        <div className="space-y-2">
          <div>
            <Label>Public key (safe to expose)</Label>
            <Input readOnly value={info.publicKey} onFocus={(e) => e.currentTarget.select()} className="mt-1.5 h-11 rounded-xl font-mono text-[10px]" />
          </div>
          <div>
            <Label>Dispatch URL (auto-set in DB)</Label>
            <Input readOnly value={info.dispatchUrl} onFocus={(e) => e.currentTarget.select()} className="mt-1.5 h-11 rounded-xl font-mono text-xs" />
          </div>
          <div>
            <Label>VAPID subject (mailto: or https URL)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="mailto:admin@example.com" className="h-11 rounded-xl" />
              <Button onClick={saveSubject} disabled={busy} variant="outline" className="rounded-full">Save</Button>
            </div>
          </div>
          <Button onClick={test} disabled={busy} className="w-full rounded-full">Send test push to me</Button>
        </div>
      )}
    </div>
  );
}
