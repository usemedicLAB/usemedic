import { Link } from "@tanstack/react-router";
import { Home, Calendar, MessageSquareHeart, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/appointments", label: "Appts", Icon: Calendar },
  { to: "/consultations", label: "Consults", Icon: MessageSquareHeart },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-semibold text-primary" }}
              activeOptions={{ exact: to === "/" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
