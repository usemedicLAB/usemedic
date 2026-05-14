import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, markAllNotificationsRead, markNotificationRead, enableWebPush } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Medic" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };
  const open = async (id: string) => {
    await markNotificationRead(id);
    if (user) qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <MobileShell role="user">
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up"}
        right={unread > 0 ? (
          <Button onClick={markAll} size="sm" variant="outline" className="rounded-full">
            <CheckCheck className="h-4 w-4" /> Mark all
          </Button>
        ) : undefined}
      />
      <div className="px-5 pt-5 pb-6 space-y-2">
        <EnablePushBanner />
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <Bell className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
        {items.map((n) => {
          const Inner = (
            <article className={`rounded-2xl border p-3 ${n.read ? "border-border bg-card" : "border-primary/30 bg-primary-soft/40"}`}>
              <div className="flex items-start gap-3">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            </article>
          );
          return n.link ? (
            <Link key={n.id} to={n.link} onClick={() => open(n.id)} className="block">{Inner}</Link>
          ) : (
            <button key={n.id} onClick={() => open(n.id)} className="block w-full text-left">{Inner}</button>
          );
        })}
      </div>
    </MobileShell>
  );
}

function EnablePushBanner() {
  const initial = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
  const [perm, setPerm] = useState<string>(initial);
  const [busy, setBusy] = useState(false);
  if (perm === "granted") return null;
  const enable = async () => {
    setBusy(true);
    const r = await enableWebPush();
    setBusy(false);
    if (r.ok) { toast.success("Push notifications enabled"); setPerm("granted"); }
    else if (r.reason === "denied") toast.error("Permission denied. Enable notifications in browser settings.");
    else if (r.reason === "not-configured") toast.error("Push not yet configured by admin.");
    else if (r.reason === "unsupported") toast.error("This browser does not support push.");
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft/50 p-3">
      <div className="flex items-start gap-2">
        <BellRing className="h-4 w-4 mt-0.5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Enable browser push</p>
          <p className="text-[11px] text-muted-foreground">Get notified even when the app is closed.</p>
        </div>
      </div>
      <Button size="sm" onClick={enable} disabled={busy} className="rounded-full">Enable</Button>
    </div>
  );
}
