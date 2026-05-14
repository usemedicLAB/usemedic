import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import webpush from "web-push";
import { z } from "zod";

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("app_settings" as any).select("value").eq("key", key).maybeSingle();
  return (data as any)?.value ?? null;
}
async function setSetting(key: string, value: string) {
  await supabaseAdmin.from("app_settings" as any).upsert({ key, value });
}

/** Public — gives the browser the VAPID public key needed to subscribe. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const pub = await getSetting("vapid_public_key");
  return { publicKey: pub ?? "" };
});

/** Admin — generates and stores VAPID keys, dispatch URL & secret. */
export const initPushConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { origin: string }) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.rpc("current_user_roles");
    const isAdmin = (roles as any[] | null)?.some((r: any) => (typeof r === "string" ? r : r.role) === "admin");
    if (!isAdmin) throw new Error("Admin only");

    let publicKey = await getSetting("vapid_public_key");
    let privateKey = await getSetting("vapid_private_key");
    if (!publicKey || !privateKey) {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey; privateKey = keys.privateKey;
      await setSetting("vapid_public_key", publicKey);
      await setSetting("vapid_private_key", privateKey);
    }
    const subject = (await getSetting("vapid_subject")) || "mailto:admin@example.com";
    await setSetting("vapid_subject", subject);

    const dispatchUrl = `${data.origin}/api/public/push-dispatch`;
    await setSetting("push_dispatch_url", dispatchUrl);
    let secret = await getSetting("push_dispatch_secret");
    if (!secret) {
      secret = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      await setSetting("push_dispatch_secret", secret);
    }
    return { publicKey, dispatchUrl, subject };
  });

export const updateVapidSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string }) => z.object({ subject: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.rpc("current_user_roles");
    const isAdmin = (roles as any[] | null)?.some((r: any) => (typeof r === "string" ? r : r.role) === "admin");
    if (!isAdmin) throw new Error("Admin only");
    await setSetting("vapid_subject", data.subject);
    return { ok: true };
  });

/** User saves their browser subscription. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) =>
    z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(10),
      auth: z.string().min(8),
      userAgent: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    await supabaseAdmin.from("push_subscriptions" as any).upsert({
      endpoint: data.endpoint,
      user_id: userId,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.userAgent ?? null,
    });
    return { ok: true };
  });

/** Send a test push to the current user. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const pub = await getSetting("vapid_public_key");
    const priv = await getSetting("vapid_private_key");
    const subject = (await getSetting("vapid_subject")) || "mailto:admin@example.com";
    if (!pub || !priv) throw new Error("VAPID not configured");
    webpush.setVapidDetails(subject, pub, priv);
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions" as any).select("endpoint, p256dh, auth").eq("user_id", userId);
    const payload = JSON.stringify({ title: "Test push", body: "Web push is working", link: "/notifications" });
    let sent = 0;
    for (const s of (subs ?? []) as any[]) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions" as any).delete().eq("endpoint", s.endpoint);
        }
      }
    }
    return { sent, total: subs?.length ?? 0 };
  });
