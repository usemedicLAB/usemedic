import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/flutterwave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const verif = request.headers.get("verif-hash");
        const { data: row } = await supabaseAdmin
          .from("app_settings" as any).select("value").eq("key", "flutterwave_webhook_secret").maybeSingle();
        const secret = (row as any)?.value as string | undefined;
        if (!secret) return new Response("Flutterwave not configured", { status: 500 });
        if (verif !== secret) return new Response("Invalid signature", { status: 401 });

        const event = (await request.json()) as { event?: string; data?: any };
        const d = event.data ?? {};
        if (d.status === "successful") {
          const apptId = d.meta?.appointment_id;
          if (apptId) {
            await supabaseAdmin.from("appointments")
              .update({ paid_at: new Date().toISOString(), payment_ref: d.tx_ref ?? String(d.id ?? "") })
              .eq("id", apptId);
          }
        }
        return new Response("ok");
      },
    },
  },
});
