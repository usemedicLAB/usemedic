import { Link } from "@tanstack/react-router";
import { MedicLogo } from "./medic-logo";
import { Button } from "./ui/button";

const links = [
  { to: "/doctors", label: "Find a doctor" },
  { to: "/appointments", label: "Appointments" },
  { to: "/consultations", label: "Consultations" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center">
          <MedicLogo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary bg-primary-soft" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/profile">Sign in</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/doctors">Get care now</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
