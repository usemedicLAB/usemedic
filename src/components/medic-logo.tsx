import { cn } from "@/lib/utils";

export function MedicLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "white" }) {
  const src = variant === "white" ? "/logo-white.png" : "/logo-color.png";
  
  return (
    <div className={cn("inline-flex items-center", className)}>
      <img src={src} alt="Medic Logo" className="h-10 w-auto object-contain" />
    </div>
  );
}
