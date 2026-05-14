import { Link, useLocation } from "@tanstack/react-router";
import { Home, Calendar, MessageCircle, User, Stethoscope, LayoutDashboard, CalendarClock, Users, FileCheck2, Bell, Ambulance, Store, Pill, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { useNotifications, requestNotificationPermission } from "@/hooks/use-notifications";

interface TabItem { to: string; label: string; Icon: typeof Home; tone?: "emergency" | "pharmacy" }

const userTabs: TabItem[] = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/appointments", label: "Visits", Icon: Calendar },
  { to: "/emergency", label: "Emergency", Icon: Ambulance, tone: "emergency" },
  { to: "/pharmacy", label: "Pharmacy", Icon: Store, tone: "pharmacy" },
  { to: "/profile", label: "Me", Icon: User },
];
const doctorTabs: TabItem[] = [
  { to: "/doctor/dashboard", label: "Today", Icon: LayoutDashboard },
  { to: "/doctor/schedule", label: "Schedule", Icon: CalendarClock },
  { to: "/doctor/patients", label: "Patients", Icon: Users },
  { to: "/doctor/consultations", label: "Chats", Icon: MessageCircle },
  { to: "/doctor/profile", label: "Me", Icon: User },
];
const adminTabs: TabItem[] = [
  { to: "/admin/overview", label: "Overview", Icon: LayoutDashboard },
  { to: "/admin/doctors", label: "KYC", Icon: FileCheck2 },
  { to: "/admin/ambulance", label: "Ambulance", Icon: Truck, tone: "emergency" },
  { to: "/admin/pharmacy", label: "Pharmacy", Icon: Pill, tone: "pharmacy" },
  { to: "/admin/profile", label: "Me", Icon: User },
];

function NotificationsListener() {
  // Subscribes to realtime notifications + shows toasts globally.
  useNotifications();
  useEffect(() => { requestNotificationPermission(); }, []);
  return null;
}

export function MobileShell({ children, role = "user" }: { children: ReactNode; role?: "user" | "doctor" | "admin" }) {
  const tabs = role === "admin" ? adminTabs : role === "doctor" ? doctorTabs : userTabs;
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <NotificationsListener />
      <div className="mx-auto max-w-md pb-28">{children}</div>
      <nav className="fixed bottom-4 left-1/2 z-40 w-[min(92%,26rem)] -translate-x-1/2 rounded-full bg-[image:var(--gradient-primary)] px-2 py-2 shadow-[var(--shadow-glow)]">
        <div className="flex items-center justify-between">
          {tabs.map(({ to, label, Icon, tone }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            const toneActive =
              tone === "emergency" ? "bg-white text-[#D93025] shadow" :
              tone === "pharmacy" ? "bg-white text-[#1A73E8] shadow" :
              "bg-white text-primary-deep shadow";
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center rounded-full transition-all",
                  active ? toneActive : "text-white/85 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-6">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        {right}
      </div>
    </div>
  );
}

function NotificationBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read).length;
  return (
    <Link to="/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
