import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({ appointmentId: z.string().uuid() });

type SettingsMap = Record<string, string>;

async function loadSettings(keys: string[]): Promise<SettingsMap> {
  const { data } = await supabaseAdmin
    .from("app_settings" as any)
    .select("key, value")
    .in("key", keys);
  return Object.fromEntries(
    (((data ?? []) as unknown) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value ?? ""]),
  );
}

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: appt, error: ae } = await supabaseAdmin
      .from("appointments")
      .select("id, patient_id, doctor_id, fee, paid_at, status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (ae) throw new Error(ae.message);
    if (!appt) throw new Error("Appointment not found");
    if (appt.patient_id !== userId) throw new Error("Forbidden");
    if (appt.paid_at) throw new Error("Already paid");
    const fee = Number(appt.fee ?? 0);
    if (fee <= 0) throw new Error("No fee set on this appointment");

    // Patient email for receipts (Paystack/Flutterwave require it)
    const { data: au } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = au?.user?.email ?? "patient@example.com";

    const { data: doc } = await supabaseAdmin
      .from("profiles").select("full_name").eq("id", appt.doctor_id).maybeSingle();
    const docName = doc?.full_name || "Doctor";

    const host = getRequestHost();
    const proto = host?.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    const successUrl = `${origin}/appointments?paid=1`;
    const cancelUrl = `${origin}/appointments?paid=0`;

    const settings = await loadSettings([
      "payment_provider",
      "stripe_secret_key", "stripe_currency",
      "paystack_secret_key", "paystack_currency",
      "flutterwave_secret_key", "flutterwave_currency",
    ]);
    const provider = (settings.payment_provider || "stripe").toLowerCase();

    let url: string | null = null;
    let ref: string | null = null;

    if (provider === "stripe") {
      const secret = settings.stripe_secret_key;
      const currency = (settings.stripe_currency || "usd").toLowerCase();
      if (!secret) throw new Error("Stripe is not configured. Ask admin to add Stripe keys.");
      const zeroDec = ["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"];
      const unit = zeroDec.includes(currency) ? Math.round(fee) : Math.round(fee * 100);
      const body = new URLSearchParams();
      body.set("mode", "payment");
      body.set("success_url", successUrl);
      body.set("cancel_url", cancelUrl);
      body.set("client_reference_id", appt.id);
      body.set("customer_email", email);
      body.set("metadata[appointment_id]", appt.id);
      body.set("line_items[0][quantity]", "1");
      body.set("line_items[0][price_data][currency]", currency);
      body.set("line_items[0][price_data][unit_amount]", String(unit));
      body.set("line_items[0][price_data][product_data][name]", `Consultation with ${docName}`);
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const json = (await res.json()) as { url?: string; id?: string; error?: { message: string } };
      if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Stripe checkout failed");
      url = json.url; ref = json.id ?? null;
    } else if (provider === "paystack") {
      const secret = settings.paystack_secret_key;
      const currency = (settings.paystack_currency || "NGN").toUpperCase();
      if (!secret) throw new Error("Paystack is not configured. Ask admin to add Paystack keys.");
      // Paystack amount in kobo (lowest denomination, x100)
      const amount = Math.round(fee * 100);
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount,
          currency,
          callback_url: successUrl,
          reference: `appt_${appt.id}_${Date.now()}`,
          metadata: { appointment_id: appt.id, doctor_name: docName },
        }),
      });
      const json = (await res.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
      if (!res.ok || !json.data?.authorization_url) throw new Error(json.message ?? "Paystack init failed");
      url = json.data.authorization_url; ref = json.data.reference ?? null;
    } else if (provider === "flutterwave") {
      const secret = settings.flutterwave_secret_key;
      const currency = (settings.flutterwave_currency || "NGN").toUpperCase();
      if (!secret) throw new Error("Flutterwave is not configured. Ask admin to add Flutterwave keys.");
      const txRef = `appt_${appt.id}_${Date.now()}`;
      const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: fee,
          currency,
          redirect_url: successUrl,
          customer: { email },
          meta: { appointment_id: appt.id },
          customizations: { title: `Consultation with ${docName}` },
        }),
      });
      const json = (await res.json()) as { status?: string; message?: string; data?: { link?: string } };
      if (!res.ok || !json.data?.link) throw new Error(json.message ?? "Flutterwave init failed");
      url = json.data.link; ref = txRef;
    } else {
      throw new Error(`Unknown payment provider: ${provider}`);
    }

    await supabaseAdmin
      .from("appointments")
      .update({ payment_ref: ref })
      .eq("id", appt.id);

    return { url };
  });
