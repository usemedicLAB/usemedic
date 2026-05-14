import { Link } from "@tanstack/react-router";
import { MedicLogo } from "./medic-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <MedicLogo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Healthcare accessible to everyone, anywhere, at any time.
          </p>
        </div>
        <FooterCol title="Care" links={[["Find a doctor", "/doctors"], ["Appointments", "/appointments"], ["Consultations", "/consultations"]]} />
        <FooterCol title="Company" links={[["About", "/"], ["Careers", "/"], ["Press", "/"]]} />
        <FooterCol title="Legal" links={[["Privacy", "/"], ["Terms", "/"], ["GDPR / NDPR", "/"]]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Medic. All rights reserved.</p>
          <p>Built for patients and doctors. Not a substitute for emergency care.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="hover:text-primary">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
