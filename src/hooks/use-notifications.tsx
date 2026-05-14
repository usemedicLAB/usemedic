import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Notification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

/**
 * Subscribes to the current user's notifications:
 * - Keeps a react-query cache for the bell badge & list
 * - Fires a sonner toast on each new realtime notification
 * - Optionally posts a browser Notification (if permission granted)
 */
export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seen = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data ?? []) as unknown as Notification[];
      list.forEach((n) => seen.current.add(n.id));
      return list;
    },
  });

  useEffect(() => {
    if (!user) return;
    const topic = `notif:${user.id}:${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          if (seen.current.has(n.id)) return;
          seen.current.add(n.id);
          qc.setQueryData<Notification[]>(["notifications", user.id], (old) => [n, ...(old ?? [])].slice(0, 50));
          toast.message(n.title, { description: n.body ?? undefined });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try { new Notification(n.title, { body: n.body ?? undefined }); } catch { /* ignore */ }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return query;
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications" as any).update({ read: true }).eq("id", id);
}
export async function markAllNotificationsRead(userId: string) {
  await supabase.from("notifications" as any).update({ read: true }).eq("user_id", userId).eq("read", false);
}

/** Asks for browser Notification permission once per browser. Safe no-op if unsupported. */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  try { return await Notification.requestPermission(); } catch { return "default" as const; }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registers the SW and subscribes the browser to web push (idempotent). */
export async function enableWebPush() {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" as const };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false, reason: "unsupported" as const };
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" as const };

  const { getVapidPublicKey, savePushSubscription } = await import("@/lib/push.functions");
  const { publicKey } = await getVapidPublicKey();
  if (!publicKey) return { ok: false, reason: "not-configured" as const };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON() as any;
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent.slice(0, 500),
    },
  });
  return { ok: true as const };
}
