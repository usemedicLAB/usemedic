import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("x-paystack-signature");
        const body = await request.text();
        if (!sig) return new Response("Missing signature", { status: 400 });

        const { data: row } = await supabaseAdmin
          .from("app_settings" as any).select("value").eq("key", "paystack_secret_key").maybeSingle();
        const secret = (row as any)?.value as string | undefined;
        if (!secret) return new Response("Paystack not configured", { status: 500 });

        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const a = Buffer.from(sig, "hex"); const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(body) as { event: string; data: any };
        if (event.event === "charge.success") {
          const apptId = event.data?.metadata?.appointment_id;
          const ref = event.data?.reference;
          if (apptId) {
            await supabaseAdmin.from("appointments")
              .update({ paid_at: new Date().toISOString(), payment_ref: ref })
              .eq("id", apptId);
          }
        }
        return new Response("ok");
      },
    },
  },
});
