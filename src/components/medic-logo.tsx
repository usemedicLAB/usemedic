import { cn } from "@/lib/utils";

export function MedicLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "white" }) {
  const fg = variant === "white" ? "text-white" : "text-foreground";
  const accent = variant === "white" ? "text-white/80" : "text-primary";
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", variant === "white" ? "bg-white/20" : "bg-primary-soft")}>
        <svg viewBox="0 0 24 24" fill="none" className={cn("h-5 w-5", accent)} aria-hidden>
          <path d="M12 3c-3 0-5 2-5 5 0 4 5 8 5 8s5-4 5-8c0-3-2-5-5-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M5 17c2 2 5 3 7 3s5-1 7-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
      <span className={cn("font-display text-lg font-bold tracking-tight", fg)}>Medic</span>
    </div>
  );
}
