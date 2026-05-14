import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sigHeader = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!sigHeader) return new Response("Missing signature", { status: 400 });

        // Load webhook secret from app_settings (admin-managed)
        const { data: row } = await supabaseAdmin
          .from("app_settings" as any)
          .select("value")
          .eq("key", "stripe_webhook_secret")
          .maybeSingle();
        const secret = (row as any)?.value as string | undefined;
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        // Parse Stripe sig: t=...,v1=...
        const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=").map((s) => s.trim())));
        const t = parts.t;
        const v1 = parts.v1;
        if (!t || !v1) return new Response("Bad signature", { status: 400 });

        const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
        const a = Buffer.from(v1, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as { type: string; data: { object: any } };
        if (event.type === "checkout.session.completed") {
          const obj = event.data.object;
          const apptId = obj.metadata?.appointment_id || obj.client_reference_id;
          if (apptId) {
            await supabaseAdmin
              .from("appointments")
              .update({ paid_at: new Date().toISOString(), payment_ref: obj.id })
              .eq("id", apptId);
          }
        }
        return new Response("ok");
      },
    },
  },
});
