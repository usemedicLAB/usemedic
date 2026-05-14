import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import webpush from "web-push";

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretHeader = request.headers.get("x-push-secret") || "";
        const body = await request.text();

        const { data: settings } = await supabaseAdmin
          .from("app_settings" as any)
          .select("key, value")
          .in("key", ["push_dispatch_secret", "vapid_public_key", "vapid_private_key", "vapid_subject"]);
        const map = Object.fromEntries(((settings as any[]) ?? []).map((r) => [r.key, r.value]));
        const secret: string = map.push_dispatch_secret || "";
        if (!secret || secretHeader !== secret) {
          return new Response("unauthorized", { status: 401 });
        }
        const pub = map.vapid_public_key, priv = map.vapid_private_key;
        const subject = map.vapid_subject || "mailto:admin@example.com";
        if (!pub || !priv) return new Response("vapid not configured", { status: 200 });

        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }
        const { user_id, title, body: notifBody, link, id } = payload || {};
        if (!user_id || !title) return new Response("bad payload", { status: 400 });

        webpush.setVapidDetails(subject, pub, priv);

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions" as any)
          .select("endpoint, p256dh, auth")
          .eq("user_id", user_id);

        const data = JSON.stringify({ title, body: notifBody, link, id });
        const dead: string[] = [];
        await Promise.all(((subs as any[]) ?? []).map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              data,
            );
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
          }
        }));
        if (dead.length) {
          await supabaseAdmin.from("push_subscriptions" as any).delete().in("endpoint", dead);
        }
        return Response.json({ sent: (subs?.length ?? 0) - dead.length, pruned: dead.length });
      },
    },
  },
});
